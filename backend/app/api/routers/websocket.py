import asyncio

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.schemas.socket import PingMessage, PongMessage, StateUpdateMessage
from app.services.game_service import GameService, get_game_service
from app.services.websocket_manager import manager

router = APIRouter()

HEARTBEAT_INTERVAL = 15  # seconds
HEARTBEAT_TIMEOUT = 10  # seconds to wait for PONG (beyond interval)


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

    # Broadcast reconnect if player was already in game and WAS OFFLINE (rising edge)
    if player and not was_online:
        await manager.broadcast_reconnect(room_id, client_id, nickname)

    try:
        # Send initial state
        filtered_state = await service.get_player_view(game, client_id)
        msg = StateUpdateMessage(room_id=room_id, payload=filtered_state)
        await websocket.send_text(msg.model_dump_json())

        # Main loop to receive messages
        while True:
            # We use a timeout to ensure we get a PONG or some activity every interval
            try:
                # Expect some activity within interval + timeout
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT,
                )

                msg_type = data.get("type")
                if msg_type == "PONG":
                    await manager.update_presence(room_id, client_id)
                elif msg_type == "PING":
                    ping_msg = PongMessage(room_id=room_id)
                    await websocket.send_text(ping_msg.model_dump_json())

            except TimeoutError:
                # No PONG or message received within expected time
                print(f"Heartbeat timeout for {client_id}")
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS Exception for {client_id}: {e}")
    finally:
        await manager.disconnect(room_id, client_id)
        await manager.broadcast_disconnect(room_id, client_id, nickname)


# Keep a reference to background tasks to prevent garbage collection
background_tasks = set()


@router.on_event("startup")
async def startup_event():
    # Start a background task to PING all active connections periodically
    task = asyncio.create_task(global_heartbeat_loop())
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)


async def global_heartbeat_loop():
    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL)
        for room_id, connections in list(manager.active_connections.items()):
            for _client_id, ws in list(connections.items()):
                try:
                    ping_msg = PingMessage(room_id=room_id)
                    await ws.send_text(ping_msg.model_dump_json())
                except Exception:
                    pass
