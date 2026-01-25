"""
Game state models using Pydantic for clean serialization.

The Game class is the main domain object that holds game state.
It uses Pydantic models internally for serialization to Redis.
"""

import logging
import random
import time
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
    last_protected_target: str | None = None

    vote_target: str | None = None
    night_action_target: str | None = None
    night_action_type: str | None = None
    night_action_confirmed: bool = False

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
    lovers: list[str] = []
    voted_out_this_round: str | None = None
    phase_start_time: float | None = None

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

    def resolve_lovers_pact(self, dead_player_ids: set[str]) -> set[str]:
        """Check for Lovers Suicide Pact and return any additional deaths."""
        secondary_deaths = set()
        if not self.lovers:
            return secondary_deaths

        l1, l2 = self.lovers[0], self.lovers[1]

        # Check current status in state OR if they are in the incoming dead set
        l1_is_dead = (not self.players[l1].is_alive) or (l1 in dead_player_ids)
        l2_is_dead = (not self.players[l2].is_alive) or (l2 in dead_player_ids)

        if l1_is_dead and not l2_is_dead:
            secondary_deaths.add(l2)
        elif l2_is_dead and not l1_is_dead:
            secondary_deaths.add(l1)

        return secondary_deaths

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
                last_protected_target=p.last_protected_target,
                vote_target=p.vote_target,
                night_action_target=p.night_action_target,
                night_action_type=p.night_action_type,
                night_action_confirmed=p.night_action_confirmed,
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
            lovers=self.lovers,
            voted_out_this_round=self.voted_out_this_round,
            phase_start_time=self.phase_start_time,
        )

    # ===== View Logic =====
    def get_view_for_player(self, viewer_id: str) -> GameStateSchema:
        """
        Create a filtered view of the game state for a specific player.
        Hides roles and actions based on game rules.
        """
        full_schema = self.to_schema()
        is_game_over = full_schema.phase == GamePhase.GAME_OVER

        viewer = self.players.get(viewer_id)
        is_spectator = viewer and (viewer.role == RoleType.SPECTATOR or not viewer.is_alive)

        # Viewer specific context
        revealed_to_viewer = set()
        if viewer and viewer.role == RoleType.SEER:
            revealed_to_viewer = set(self.seer_reveals.get(viewer_id, []))

        filtered_players = {}
        for pid, p in full_schema.players.items():
            # Determine visibility
            is_self = pid == viewer_id

            # Wolf logic: Wolves see other wolves
            are_werewolves = (
                viewer and viewer.role == RoleType.WEREWOLF and p.role == RoleType.WEREWOLF
            )

            should_show_role = (
                is_self
                or is_game_over
                or pid in revealed_to_viewer
                or is_spectator
                or are_werewolves
                or (not p.is_alive and self.settings.reveal_role_on_death)
            )

            # Action visibility
            # Generally, actions are private unless it's yourself OR you are wolves acting together
            should_show_action = is_self or (are_werewolves and p.role == RoleType.WEREWOLF)

            vote_dist = None
            if (
                is_self
                and viewer
                and viewer.role == RoleType.WEREWOLF
                and self.phase == GamePhase.NIGHT
            ):
                # Calculate distribution of wolf votes
                wolf_votes = {}
                for w_p in self.players.values():
                    if w_p.role == RoleType.WEREWOLF and w_p.is_alive and w_p.night_action_target:
                        wolf_votes[w_p.night_action_target] = (
                            wolf_votes.get(w_p.night_action_target, 0) + 1
                        )
                vote_dist = wolf_votes

            # Determine role to show
            role_to_show = None
            if should_show_role:
                role_to_show = p.role
                # Lycan Masking for Seer
                # If viewer is Seer, and p is Lycan, show Werewolf
                # But ONLY if the reason we are showing it is because of Seer Reveal
                # If dead and reveal_on_death is on, show REAL role (Lycan)? Standard rules vary.
                # Usually Seer checks see "Werewolf". Death reveal shows "Lycan".
                # So check if reason for visibility is 'revealed_to_viewer'
                if (
                    p.role == RoleType.LYCAN
                    and viewer
                    and viewer.role == RoleType.SEER
                    and pid in revealed_to_viewer
                    and p.is_alive
                ):
                    role_to_show = RoleType.WEREWOLF

            filtered_players[pid] = PlayerSchema(
                id=p.id,
                nickname=p.nickname,
                role=role_to_show,
                is_alive=p.is_alive,
                is_admin=p.is_admin,
                is_spectator=p.role == RoleType.SPECTATOR,
                # is_online is merged later by service layer
                is_online=False,
                vote_target=p.vote_target if is_self else None,
                night_action_target=p.night_action_target if should_show_action else None,
                night_action_type=p.night_action_type if should_show_action else None,
                night_action_confirmed=p.night_action_confirmed,
                has_night_action=p.has_night_action if is_self else False,
                night_action_vote_distribution=vote_dist if is_self else None,
            )

            # Dynamic Role Info (Prompts, available actions)
            if is_self and p.role and viewer and viewer.is_alive:
                # We need the behavior instance from the internal state, not the schema
                p_internal = self.players.get(pid)
                if p_internal and p_internal.role_instance:
                    role_inst = p_internal.role_instance
                    filtered_players[pid].role_description = role_inst.get_description()

                    if self.phase == GamePhase.NIGHT or (
                        self.phase == GamePhase.HUNTER_REVENGE and p.role == RoleType.HUNTER
                    ):
                        filtered_players[pid].night_info = role_inst.get_night_info(
                            self._state, pid
                        )

        full_schema.players = filtered_players
        # Never expose the raw seer reveal map
        full_schema.seer_reveals = {}

        return full_schema

    def auto_balance_roles(self):
        """Automatically set default role distribution based on player count."""
        active_players = len([p for p in self.players.values() if p.role != RoleType.SPECTATOR])

        # Base config: 1 Wolf, 1 Seer, rest Villagers
        defaults = {
            RoleType.WEREWOLF: 1,
            RoleType.SEER: 1,
            RoleType.DOCTOR: 0,
            RoleType.WITCH: 0,
            RoleType.HUNTER: 0,
            RoleType.CUPID: 0,
            RoleType.LYCAN: 0,
            RoleType.TANNER: 0,
            RoleType.VILLAGER: 0,
            RoleType.SPECTATOR: 0,
        }

        # Progressive complexity
        if active_players >= 5:
            defaults[RoleType.DOCTOR] = 1
            defaults[RoleType.CUPID] = 1

        if active_players >= 7:
            defaults[RoleType.WITCH] = 1
            defaults[RoleType.TANNER] = 1

        if active_players >= 9:
            defaults[RoleType.HUNTER] = 1
            defaults[RoleType.WEREWOLF] = 2
            defaults[RoleType.LYCAN] = 1

        # Calculate villagers
        special_roles = sum(defaults.values())
        villagers = max(0, active_players - special_roles)
        defaults[RoleType.VILLAGER] = villagers

        self.settings.role_distribution = defaults

    @property
    def room_id(self) -> str:
        return self._state.room_id

    @property
    def phase(self) -> GamePhase:
        return self._state.phase

    @property
    def phase_start_time(self) -> float | None:
        return self._state.phase_start_time

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
    def lovers(self) -> list[str]:
        return self._state.lovers

    @lovers.setter
    def lovers(self, value: list[str]):
        self._state.lovers = value

    @property
    def voted_out_this_round(self) -> str | None:
        return self._state.voted_out_this_round

    @voted_out_this_round.setter
    def voted_out_this_round(self, value: str | None):
        self._state.voted_out_this_round = value

    # ===== Game logic methods =====
    def add_player(self, player_id: str, nickname: str, is_admin: bool = False):
        if self.phase != GamePhase.WAITING:
            self._state.players[player_id] = PlayerState(
                id=player_id,
                nickname=nickname,
                is_admin=False,
                role=RoleType.SPECTATOR,
            )
            return

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
        self._state.phase_start_time = time.time()
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
            1
            for p in self.players.values()
            if p.is_alive and p.role != RoleType.WEREWOLF and p.role != RoleType.SPECTATOR
        )

        # Lovers Win
        if self.lovers:
            # Check if only lovers are alive
            alive_ids = {p.id for p in self.players.values() if p.is_alive}
            if len(alive_ids) == 2 and set(self.lovers) == alive_ids:
                return "LOVERS"

        if alive_werewolves == 0:
            return "VILLAGERS"
        if alive_werewolves >= alive_villagers:
            return "WEREWOLVES"
        return None

    def restart(self):
        """Reset game to waiting state for a new round."""
        self.transition_to(GamePhase.WAITING)

    # Old implementation removed
