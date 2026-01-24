from enum import Enum

from pydantic import BaseModel, ConfigDict


class RoleType(str, Enum):
    VILLAGER = "VILLAGER"
    WEREWOLF = "WEREWOLF"
    SEER = "SEER"
    DOCTOR = "DOCTOR"
    WITCH = "WITCH"
    HUNTER = "HUNTER"
    SPECTATOR = "SPECTATOR"


class GamePhase(str, Enum):
    WAITING = "WAITING"
    DAY = "DAY"
    NIGHT = "NIGHT"
    VOTING = "VOTING"
    GAME_OVER = "GAME_OVER"


class NightActionType(str, Enum):
    KILL = "KILL"
    SAVE = "SAVE"
    CHECK = "CHECK"
    HEAL = "HEAL"
    POISON = "POISON"
    REVENGE = "REVENGE"
    SKIP = "SKIP"


class NightInfoSchema(BaseModel):
    prompt: str
    actions_available: list[NightActionType]
    victim_id: str | None = None


class PlayerSchema(BaseModel):
    id: str
    nickname: str
    role: RoleType | None = None
    role_description: str | None = None  # UI-ready description
    is_alive: bool = True
    is_admin: bool = False
    is_spectator: bool = False
    is_online: bool = False

    # Role specific state
    witch_has_heal: bool = True
    witch_has_poison: bool = True
    hunter_revenge_target: str | None = None

    vote_target: str | None = None
    night_action_target: str | None = None
    night_action_type: str | None = None  # Persist action type (e.g., HEAL/POISON)
    night_action_confirmed: bool = False
    has_night_action: bool = False

    # Dynamic context for frontend
    night_info: NightInfoSchema | None = None

    model_config = ConfigDict(from_attributes=True)


class GameSettingsSchema(BaseModel):
    role_distribution: dict[RoleType, int] = {
        RoleType.WEREWOLF: 1,
        RoleType.SEER: 1,
        RoleType.DOCTOR: 1,
        RoleType.VILLAGER: 1,
    }
    phase_duration_seconds: int = 60
    timer_enabled: bool = True
    dramatic_tones_enabled: bool = True


class GameStateSchema(BaseModel):
    room_id: str
    phase: GamePhase
    players: dict[str, PlayerSchema]
    settings: GameSettingsSchema
    turn_count: int = 0
    winners: str | None = None
    seer_reveals: dict[str, list[str]] = {}  # {seer_id: [checked_player_ids]}
    voted_out_this_round: str | None = None
    phase_start_time: float | None = None


class ActionRequest(BaseModel):
    action_type: str
    target_id: str | None = None
    confirmed: bool = True


class VoteRequest(BaseModel):
    target_id: str


class CreateRoomRequest(BaseModel):
    settings: GameSettingsSchema | None = None


class JoinRoomRequest(BaseModel):
    nickname: str
    player_id: str | None = None


class StartGameRequest(BaseModel):
    player_id: str
    settings: GameSettingsSchema | None = None


class PlayerIdRequest(BaseModel):
    player_id: str


class KickPlayerRequest(BaseModel):
    player_id: str
    target_id: str
