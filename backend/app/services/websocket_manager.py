import asyncio
import contextlib
from typing import TYPE_CHECKING, Any

from fastapi import WebSocket

if TYPE_CHECKING:
    from redis.asyncio.client import PubSub

from app.core.redis import RedisClient
from app.schemas.socket import (
    MessageType,
    PresenceMessage,
    PresencePayload,
    StateUpdateMessage,
)

PRESENCE_TTL = 30  # seconds


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, dict[str, WebSocket]] = {}
        self.pubsub: "PubSub | None" = None
        self.listener_task: asyncio.Task | None = None
        self._tasks: set[asyncio.Task] = set()

    async def _get_pubsub(self) -> "PubSub":
        if not self.pubsub:
            redis = RedisClient.get_client()
            self.pubsub = redis.pubsub()
            await self.pubsub.subscribe("system:keepalive")
            self.listener_task = asyncio.create_task(self._listener_loop())
        return self.pubsub

    async def _listener_loop(self):
        if not self.pubsub:
            return
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                channel = message["channel"]
                data = message["data"]
                if channel.startswith("room:"):
                    room_id = channel.split(":")[1]
                    if room_id in self.active_connections:
                        for ws in list(self.active_connections[room_id].values()):
                            with contextlib.suppress(Exception):
                                await ws.send_text(data)

    async def connect(self, room_id: str, client_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
            pubsub = await self._get_pubsub()
            await pubsub.subscribe(f"room:{room_id}")

        redis = RedisClient.get_client()
        was_online = await redis.exists(f"presence:{room_id}:{client_id}")

        self.active_connections[room_id][client_id] = websocket
        await self.update_presence(room_id, client_id)
        return was_online > 0

    async def disconnect(self, room_id: str, client_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].pop(client_id, None)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
                if self.pubsub:
                    await self.pubsub.unsubscribe(f"room:{room_id}")

        # Remove presence
        await self.remove_presence(room_id, client_id)

    async def update_presence(self, room_id: str, client_id: str):
        """Update presence key with TTL. Called on connect and heartbeat."""
        redis = RedisClient.get_client()
        await redis.set(f"presence:{room_id}:{client_id}", "1", ex=PRESENCE_TTL)

    async def remove_presence(self, room_id: str, client_id: str):
        """Remove presence and broadcast disconnect."""
        redis = RedisClient.get_client()
        await redis.delete(f"presence:{room_id}:{client_id}")

    async def broadcast_disconnect(self, room_id: str, player_id: str, nickname: str):
        """Broadcast player disconnect via Redis pubsub."""
        message = PresenceMessage(
            type=MessageType.PLAYER_DISCONNECTED,
            room_id=room_id,
            payload=PresencePayload(player_id=player_id, nickname=nickname),
        )
        await self.broadcast_to_room(room_id, message)

    async def broadcast_reconnect(self, room_id: str, player_id: str, nickname: str):
        """Broadcast player reconnect via Redis pubsub."""
        message = PresenceMessage(
            type=MessageType.PLAYER_RECONNECTED,
            room_id=room_id,
            payload=PresencePayload(player_id=player_id, nickname=nickname),
        )
        await self.broadcast_to_room(room_id, message)

    async def broadcast_to_room(self, room_id: str, message: Any):
        redis = RedisClient.get_client()
        # Ensure we use model_dump_json if it's a Pydantic model
        data = message.model_dump_json() if hasattr(message, "model_dump_json") else str(message)
        await redis.publish(f"room:{room_id}", data)

    async def broadcast_game_state(self, room_id: str, game_state):
        message = StateUpdateMessage(room_id=room_id, payload=game_state)
        await self.broadcast_to_room(room_id, message)


manager = ConnectionManager()
