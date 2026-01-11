from enum import Enum

from pydantic import BaseModel, ConfigDict


class RoleType(str, Enum):
    VILLAGER = "VILLAGER"
    WEREWOLF = "WEREWOLF"
    SEER = "SEER"
    DOCTOR = "DOCTOR"
    SPECTATOR = "SPECTATOR"  # For dead players or late joiners if we support that


class GamePhase(str, Enum):
    WAITING = "WAITING"
    DAY = "DAY"
    NIGHT = "NIGHT"
    VOTING = "VOTING"
    GAME_OVER = "GAME_OVER"


class PlayerSchema(BaseModel):
    id: str
    nickname: str
    role: RoleType | None = None
    is_alive: bool = True
    is_admin: bool = False
    is_online: bool = False

    model_config = ConfigDict(from_attributes=True)


class GameSettingsSchema(BaseModel):
    role_distribution: dict[RoleType, int] = {
        RoleType.WEREWOLF: 1,
        RoleType.SEER: 1,
        RoleType.DOCTOR: 1,
        RoleType.VILLAGER: 1,
    }
    phase_duration_seconds: int = 60


class GameStateSchema(BaseModel):
    room_id: str
    phase: GamePhase
    players: dict[str, PlayerSchema]
    settings: GameSettingsSchema
    turn_count: int = 0
    winners: str | None = None
    night_actions: list[dict] = []
    seer_reveals: dict[str, list[str]] = {}  # {seer_id: [checked_player_ids]}


class ActionRequest(BaseModel):
    action_type: str
    target_id: str | None = None


class CreateRoomRequest(BaseModel):
    settings: GameSettingsSchema | None = None


class JoinRoomRequest(BaseModel):
    nickname: str
    player_id: str | None = None


class StartGameRequest(BaseModel):
    player_id: str
    settings: GameSettingsSchema | None = None
