from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class RoleType(StrEnum):
    VILLAGER = "VILLAGER"
    WEREWOLF = "WEREWOLF"
    SEER = "SEER"
    DOCTOR = "DOCTOR"
    WITCH = "WITCH"
    HUNTER = "HUNTER"
    BODYGUARD = "BODYGUARD"
    CUPID = "CUPID"
    LYCAN = "LYCAN"
    TANNER = "TANNER"
    SPECTATOR = "SPECTATOR"


class GamePhase(StrEnum):
    WAITING = "WAITING"
    DAY = "DAY"
    NIGHT = "NIGHT"
    VOTING = "VOTING"
    HUNTER_REVENGE = "HUNTER_REVENGE"
    GAME_OVER = "GAME_OVER"


class NightActionType(StrEnum):
    KILL = "KILL"
    SAVE = "SAVE"
    CHECK = "CHECK"
    HEAL = "HEAL"
    POISON = "POISON"
    REVENGE = "REVENGE"
    LINK = "LINK"
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
    is_online: bool = True

    # Role specific state
    witch_has_heal: bool = True
    witch_has_poison: bool = True
    hunter_revenge_target: str | None = None
    last_protected_target: str | None = None

    vote_target: str | None = None
    night_action_target: str | None = None
    night_action_type: str | None = None  # Persist action type (e.g., HEAL/POISON)
    night_action_confirmed: bool = False
    has_night_action: bool = False

    # Dynamic context for frontend
    night_info: NightInfoSchema | None = None
    night_action_vote_distribution: dict[str, int] | None = None  # For Werewolf consensus

    model_config = ConfigDict(from_attributes=True)


class GameSettingsSchema(BaseModel):
    role_distribution: dict[RoleType, int] = {
        RoleType.WEREWOLF: 1,
        RoleType.SEER: 1,
        RoleType.DOCTOR: 1,
        RoleType.WITCH: 0,
        RoleType.HUNTER: 0,
        RoleType.CUPID: 0,
        RoleType.BODYGUARD: 0,
        RoleType.LYCAN: 0,
        RoleType.TANNER: 0,
        RoleType.VILLAGER: 0,
    }
    phase_duration_seconds: int = 60
    timer_enabled: bool = True
    reveal_role_on_death: bool = False
    dramatic_tones_enabled: bool = True


class GameStateSchema(BaseModel):
    room_id: str
    phase: GamePhase
    players: dict[str, PlayerSchema]
    settings: GameSettingsSchema
    turn_count: int = 0
    winners: str | None = None
    seer_reveals: dict[str, list[str]] = {}  # {seer_id: [checked_player_ids]}
    lovers: list[str] = []
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
