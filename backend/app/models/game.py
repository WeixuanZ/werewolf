"""
Game state models using Pydantic for clean serialization.

The Game class is the main domain object that holds game state.
It uses Pydantic models internally for serialization to Redis.
"""

import logging
import random
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.phases import get_phase_state
from app.models.roles import Role, RoleType, get_role_instance
from app.schemas.game import GamePhase, GameSettingsSchema, GameStateSchema, PlayerSchema

logger = logging.getLogger(__name__)


class PlayerState(BaseModel):
    """Pydantic model for player state - used for persistence."""

    id: str
    nickname: str
    role: RoleType | None = None
    is_alive: bool = True
    is_admin: bool = False

    # Role specific state
    witch_has_heal: bool = True
    witch_has_poison: bool = True
    hunter_revenge_target: str | None = None

    vote_target: str | None = None
    night_action_target: str | None = None
    night_action_type: str | None = None

    model_config = ConfigDict(extra="ignore")

    @property
    def role_instance(self) -> Role | None:
        """Get role instance with behavior methods."""
        return get_role_instance(self.role) if self.role else None

    @property
    def has_night_action(self) -> bool:
        return self.night_action_target is not None

    def can_act_at_night(self) -> bool:
        role = self.role_instance
        return role.can_act_at_night if role else False


class GameState(BaseModel):
    """Pydantic model for full game state - used for persistence."""

    room_id: str
    phase: GamePhase = GamePhase.WAITING
    players: dict[str, PlayerState] = {}
    settings: GameSettingsSchema = GameSettingsSchema()
    turn_count: int = 0
    winners: str | None = None
    seer_reveals: dict[str, list[str]] = {}
    voted_out_this_round: str | None = None

    model_config = ConfigDict(extra="ignore")


class Game:
    """
    Game domain object with behavior.

    Internally uses GameState (Pydantic) for persistence.
    Exposes methods for game logic while delegating serialization to Pydantic.
    """

    def __init__(self, state: GameState):
        self._state = state

    @classmethod
    def create(cls, room_id: str, settings: GameSettingsSchema | None = None) -> "Game":
        """Create a new game with default state."""
        return cls(GameState(room_id=room_id, settings=settings or GameSettingsSchema()))

    @classmethod
    def from_json(cls, json_data: str | bytes) -> "Game":
        """Deserialize game from JSON (Redis)."""
        state = GameState.model_validate_json(json_data)
        return cls(state)

    def to_json(self) -> str:
        """Serialize game to JSON (Redis)."""
        return self._state.model_dump_json()

    def to_schema(self) -> GameStateSchema:
        """Convert to API schema format."""
        player_schemas = {
            pid: PlayerSchema(
                id=p.id,
                nickname=p.nickname,
                role=p.role,
                is_alive=p.is_alive,
                is_admin=p.is_admin,
                witch_has_heal=p.witch_has_heal,
                witch_has_poison=p.witch_has_poison,
                hunter_revenge_target=p.hunter_revenge_target,
                vote_target=p.vote_target,
                night_action_target=p.night_action_target,
                night_action_type=p.night_action_type,
                has_night_action=p.has_night_action,
            )
            for pid, p in self._state.players.items()
        }
        return GameStateSchema(
            room_id=self.room_id,
            phase=self.phase,
            players=player_schemas,
            settings=self.settings,
            turn_count=self.turn_count,
            winners=self.winners,
            seer_reveals=self.seer_reveals,
            voted_out_this_round=self.voted_out_this_round,
        )

    # ===== Property accessors to internal state =====
    @property
    def room_id(self) -> str:
        return self._state.room_id

    @property
    def phase(self) -> GamePhase:
        return self._state.phase

    @phase.setter
    def phase(self, value: GamePhase):
        self._state.phase = value

    @property
    def players(self) -> dict[str, PlayerState]:
        return self._state.players

    @property
    def settings(self) -> GameSettingsSchema:
        return self._state.settings

    @property
    def turn_count(self) -> int:
        return self._state.turn_count

    @turn_count.setter
    def turn_count(self, value: int):
        self._state.turn_count = value

    @property
    def winners(self) -> str | None:
        return self._state.winners

    @winners.setter
    def winners(self, value: str | None):
        self._state.winners = value

    @property
    def seer_reveals(self) -> dict[str, list[str]]:
        return self._state.seer_reveals

    @property
    def voted_out_this_round(self) -> str | None:
        return self._state.voted_out_this_round

    @voted_out_this_round.setter
    def voted_out_this_round(self, value: str | None):
        self._state.voted_out_this_round = value

    # ===== Game logic methods =====
    def add_player(self, player_id: str, nickname: str, is_admin: bool = False):
        if self.phase != GamePhase.WAITING:
            raise ValueError("Cannot join game in progress")
        self._state.players[player_id] = PlayerState(
            id=player_id, nickname=nickname, is_admin=is_admin
        )

    def remove_player(self, player_id: str):
        self._state.players.pop(player_id, None)

    def start_game(self):
        """Start the game by assigning roles and transitioning to night."""
        self.assign_roles()
        self._state.turn_count = 1
        self.transition_to(GamePhase.NIGHT)

    def assign_roles(self):
        role_counts = self.settings.role_distribution
        roles_to_assign: list[RoleType] = []
        for role, count in role_counts.items():
            roles_to_assign.extend([role] * count)

        player_ids = list(self.players.keys())

        # Fill with Villagers if needed
        while len(roles_to_assign) < len(player_ids):
            roles_to_assign.append(RoleType.VILLAGER)

        # Trim excess (prefer removing Villagers first)
        while len(roles_to_assign) > len(player_ids) and RoleType.VILLAGER in roles_to_assign:
            roles_to_assign.remove(RoleType.VILLAGER)
        roles_to_assign = roles_to_assign[: len(player_ids)]

        random.shuffle(roles_to_assign)

        for i, pid in enumerate(player_ids):
            self._state.players[pid].role = roles_to_assign[i]

    def transition_to(self, new_phase: GamePhase):
        """Transition to a new phase, calling on_enter for the new state."""
        self._state.phase = new_phase
        state = get_phase_state(new_phase)
        state.on_enter(self)

    def process_action(self, player_id: str, action: dict[str, Any]):
        """Delegate action processing to current phase state."""
        state = get_phase_state(self.phase)
        state.process_action(self, player_id, action)

    def check_and_advance(self) -> bool:
        """Check if current phase is complete and advance if so."""
        state = get_phase_state(self.phase)
        is_complete = state.check_completion(self)
        logger.info(f"Phase {self.phase}: check_completion={is_complete}")

        if self.phase == GamePhase.NIGHT:
            for pid, player in self.players.items():
                if player.is_alive and player.can_act_at_night():
                    logger.info(
                        f"  Player {pid} ({player.role}): "
                        f"night_action_target={player.night_action_target}"
                    )

        if is_complete:
            next_phase = state.resolve(self)
            logger.info(f"Phase resolved: {self.phase} -> {next_phase}")
            if next_phase != self.phase:
                self.transition_to(next_phase)
                return True
        return False

    def check_winners(self) -> str | None:
        """Check if there's a winner."""
        alive_werewolves = sum(
            1 for p in self.players.values() if p.is_alive and p.role == RoleType.WEREWOLF
        )
        alive_villagers = sum(
            1 for p in self.players.values() if p.is_alive and p.role != RoleType.WEREWOLF
        )

        if alive_werewolves == 0:
            return "VILLAGERS"
        if alive_werewolves >= alive_villagers:
            return "WEREWOLVES"
        return None

    def restart(self):
        """Reset game to waiting state for a new round."""
        self.transition_to(GamePhase.WAITING)
