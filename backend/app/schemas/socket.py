from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.schemas.game import GameStateSchema


class MessageType(str, Enum):
    STATE_UPDATE = "STATE_UPDATE"
    ERROR = "ERROR"
    CHAT = "CHAT"
    PLAYER_DISCONNECTED = "PLAYER_DISCONNECTED"
    PLAYER_RECONNECTED = "PLAYER_RECONNECTED"
    PING = "PING"
    PONG = "PONG"


class ErrorPayload(BaseModel):
    message: str
    code: str | None = None


class ChatPayload(BaseModel):
    sender_id: str
    sender_nickname: str
    message: str


class PresencePayload(BaseModel):
    player_id: str
    nickname: str


class WSBaseMessage(BaseModel):
    room_id: str | None = None


class StateUpdateMessage(WSBaseMessage):
    type: Literal[MessageType.STATE_UPDATE] = MessageType.STATE_UPDATE
    payload: GameStateSchema


class ErrorMessage(WSBaseMessage):
    type: Literal[MessageType.ERROR] = MessageType.ERROR
    payload: ErrorPayload


class ChatMessage(WSBaseMessage):
    type: Literal[MessageType.CHAT] = MessageType.CHAT
    payload: ChatPayload


class PresenceMessage(WSBaseMessage):
    type: Literal[MessageType.PLAYER_DISCONNECTED, MessageType.PLAYER_RECONNECTED] = (
        MessageType.PLAYER_DISCONNECTED
    )
    payload: PresencePayload


class PingMessage(WSBaseMessage):
    type: Literal[MessageType.PING] = MessageType.PING


class PongMessage(WSBaseMessage):
    type: Literal[MessageType.PONG] = MessageType.PONG


# Discriminated union for all socket messages
SocketMessage = (
    StateUpdateMessage | ErrorMessage | ChatMessage | PresenceMessage | PingMessage | PongMessage
)


class SocketMessageWrapper(BaseModel):
    """
    Wrapper for SocketMessage to allow using it in FastAPI/Pydantic models
    if needed, though usually we send the dict directly.
    """

    data: Annotated[SocketMessage, Field(discriminator="type")]
