import asyncio
import contextlib
import logging

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.core.redis import RedisClient
from app.schemas.socket import PingMessage, PongMessage, StateUpdateMessage
from app.services.game_service import GameService, get_game_service
from app.services.websocket_manager import DISCONNECT_GRACE_PERIOD, manager

logger = logging.getLogger(__name__)
router = APIRouter()

HEARTBEAT_INTERVAL = 30  # seconds between PINGs
HEARTBEAT_TIMEOUT = 120  # extra seconds to wait for a PONG before giving up

# Strong refs to fire-and-forget background tasks (RUF006).
_background_tasks: set[asyncio.Task] = set()
_heartbeat_task: asyncio.Task | None = None


def _spawn(coro) -> asyncio.Task:
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return task


@router.websocket("/ws/{room_id}/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    client_id: str,
    service: GameService = Depends(get_game_service),
):
    game = await service.get_game(room_id)
    if not game:
        await websocket.close(code=4000)
        return

    player = game.players.get(client_id)
    nickname = player.nickname if player else "Unknown"

    was_online = await manager.connect(room_id, client_id, websocket)

    # Rising-edge reconnection: only fire if the player was previously offline.
    if player and not was_online:
        await manager.broadcast_reconnect(room_id, client_id, nickname)

    try:
        filtered_state = await service.get_player_view(game, client_id)
        msg = StateUpdateMessage(room_id=room_id, payload=filtered_state)
        await websocket.send_text(msg.model_dump_json())

        timeout = HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=timeout)
            except TimeoutError:
                logger.info("Heartbeat timeout for %s", client_id)
                break

            msg_type = data.get("type")
            if msg_type == "PONG":
                await manager.update_presence(room_id, client_id)
            elif msg_type == "PING":
                await websocket.send_text(PongMessage(room_id=room_id).model_dump_json())

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WS exception for %s", client_id)
    finally:
        await manager.disconnect(room_id, client_id)
        _spawn(_verify_disconnect(room_id, client_id, nickname))


async def _verify_disconnect(room_id: str, client_id: str, nickname: str) -> None:
    """After the grace period, broadcast disconnect if the client hasn't reconnected."""
    await asyncio.sleep(DISCONNECT_GRACE_PERIOD)

    redis = RedisClient.get_client()
    presence_key = f"presence:{room_id}:{client_id}"
    ttl = await redis.ttl(presence_key)

    # ttl == -2  → key gone; ttl == -1 → no expiry (shouldn't happen for presence);
    # otherwise, a fresh reconnect bumps TTL to PRESENCE_TTL (90s), so a value below
    # the grace period means they never came back.
    if ttl == -2 or (ttl != -1 and ttl <= DISCONNECT_GRACE_PERIOD):
        if ttl != -2:
            await redis.delete(presence_key)
        await manager.broadcast_disconnect(room_id, client_id, nickname)


async def _heartbeat_loop() -> None:
    """Send periodic PINGs to all active connections to keep them alive."""
    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL)
        for room_id, connections in list(manager.active_connections.items()):
            ping = PingMessage(room_id=room_id).model_dump_json()
            for _client_id, ws in list(connections.items()):
                with contextlib.suppress(Exception):
                    await ws.send_text(ping)


def start_heartbeat_loop() -> None:
    global _heartbeat_task
    if _heartbeat_task is None or _heartbeat_task.done():
        _heartbeat_task = asyncio.create_task(_heartbeat_loop())


async def stop_heartbeat_loop() -> None:
    global _heartbeat_task
    if _heartbeat_task is not None:
        _heartbeat_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await _heartbeat_task
        _heartbeat_task = None
