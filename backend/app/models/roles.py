from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from app.core.exceptions import InvalidActionError
from app.schemas.game import NightActionType, NightInfoSchema, RoleType

if TYPE_CHECKING:
    from app.models.game import Game

# Re-export for convenience
__all__ = ["Role", "RoleType", "get_role_instance"]


class Role(ABC):
    def __init__(self, role_type: RoleType):
        self.role_type = role_type

    @property
    def can_vote(self) -> bool:
        return True  # Most roles can vote during the day

    @property
    def can_act_at_night(self) -> bool:
        return False

    @abstractmethod
    def get_description(self) -> str:
        pass

    def get_night_info(self, _game_state, _player_id: str) -> NightInfoSchema | None:
        """Return dynamic info for the frontend during night phase."""
        return None

    def validate_night_action(
        self,
        game: "Game",
        player_id: str,
        action_type: str,
        target_id: str | None,
        expected_action_type: NightActionType | None = None,
    ):
        """Common validation logic for night actions."""
        if not self.can_act_at_night:
            raise InvalidActionError(f"{self.role_type} cannot act at night")

        player = game.players.get(player_id)
        if not player:
            # Should not happen in normal flow if caller checks existence
            return

        if action_type == NightActionType.SKIP:
            player.night_action_target = "SKIP"
            player.night_action_type = NightActionType.SKIP
            return

        if expected_action_type and action_type != expected_action_type:
            raise InvalidActionError(f"Invalid action type for {self.role_type}")

        if not target_id or target_id not in game.players:
            # Cupid handles comma-separated targets separately, so skip this check for Cupid
            if self.role_type != RoleType.CUPID:
                raise InvalidActionError("Invalid target")

        player.night_action_target = target_id
        player.night_action_type = action_type

    def handle_night_action(
        self, game: "Game", player_id: str, action_type: str, target_id: str | None
    ) -> None:
        """
        Process the night action for this role.
        Validates the action and updates player state.
        Raises InvalidActionError if action is invalid.
        """
        # Default implementation for non-acting roles
        if not self.can_act_at_night:
            raise InvalidActionError(f"{self.role_type} cannot act at night")


class Villager(Role):
    def __init__(self):
        super().__init__(RoleType.VILLAGER)

    def get_description(self) -> str:
        return "Find the werewolves and vote them out during the day."


class Werewolf(Role):
    def __init__(self):
        super().__init__(RoleType.WEREWOLF)

    @property
    def can_act_at_night(self) -> bool:
        return True

    def get_description(self) -> str:
        return "Kill a villager each night. Don't get caught."

    def get_night_info(self, _game_state, _player_id: str) -> NightInfoSchema | None:
        return NightInfoSchema(
            prompt="Choose a player to eliminate tonight.",
            actions_available=[NightActionType.KILL],
        )

    def handle_night_action(
        self, game: "Game", player_id: str, action_type: str, target_id: str | None
    ) -> None:
        self.validate_night_action(game, player_id, action_type, target_id, NightActionType.KILL)


class Seer(Role):
    def __init__(self):
        super().__init__(RoleType.SEER)

    @property
    def can_act_at_night(self) -> bool:
        return True

    def get_description(self) -> str:
        return "Inspect one player each night to reveal their true nature."

    def get_night_info(self, _game_state, _player_id: str) -> NightInfoSchema | None:
        return NightInfoSchema(
            prompt="Select a player to reveal their identity.",
            actions_available=[NightActionType.CHECK],
        )

    def handle_night_action(
        self, game: "Game", player_id: str, action_type: str, target_id: str | None
    ) -> None:
        self.validate_night_action(game, player_id, action_type, target_id, NightActionType.CHECK)

        # Seer immediate effect: Reveal
        # validate_night_action ensures target is valid
        if action_type != NightActionType.SKIP and target_id:
            if player_id not in game.seer_reveals:
                game.seer_reveals[player_id] = []
            if target_id not in game.seer_reveals[player_id]:
                game.seer_reveals[player_id].append(target_id)


class Doctor(Role):
    def __init__(self):
        super().__init__(RoleType.DOCTOR)

    @property
    def can_act_at_night(self) -> bool:
        return True

    def get_description(self) -> str:
        return "Protect one player from being killed each night."

    def get_night_info(self, _game_state, _player_id: str) -> NightInfoSchema | None:
        return NightInfoSchema(
            prompt="Choose a player to protect tonight.",
            actions_available=[NightActionType.SAVE],
        )

    def handle_night_action(
        self, game: "Game", player_id: str, action_type: str, target_id: str | None
    ) -> None:
        self.validate_night_action(game, player_id, action_type, target_id, NightActionType.SAVE)


class Lycan(Role):
    def __init__(self):
        super().__init__(RoleType.LYCAN)

    def get_description(self) -> str:
        return "You are a Villager, but you appear as a Werewolf to the Seer."


class Tanner(Role):
    def __init__(self):
        super().__init__(RoleType.TANNER)

    def get_description(self) -> str:
        return "You hate your life and your job. You win if you get voted out."


class Witch(Role):
    def __init__(self):
        super().__init__(RoleType.WITCH)

    @property
    def can_act_at_night(self) -> bool:
        return True

    def get_description(self) -> str:
        return "You have a potion to save a victim and a poison to kill someone."

    def get_night_info(self, game_state, _player_id: str) -> NightInfoSchema | None:
        victim_id = None
        for p in game_state.players.values():
            if p.role == RoleType.WEREWOLF and p.night_action_target:
                victim_id = p.night_action_target
                break

        victim_name = "Unknown"
        if victim_id and victim_id in game_state.players:
            victim_name = game_state.players[victim_id].nickname

        return NightInfoSchema(
            prompt=f"Tonight's victim is {victim_name}.",
            victim_id=victim_id,
            actions_available=[NightActionType.HEAL, NightActionType.POISON],
        )

    def handle_night_action(
        self, game: "Game", player_id: str, action_type: str, target_id: str | None
    ) -> None:
        player = game.players.get(player_id)
        if not player:
            return

        if action_type == NightActionType.SKIP:
            player.night_action_target = "SKIP"
            player.night_action_type = NightActionType.SKIP
            return

        if action_type == NightActionType.HEAL:
            if not player.witch_has_heal:
                raise InvalidActionError("No heal potion left")

            # For Heal, target MUST be invalid/None or match victim?
            # Frontend sends victim_id as target_id.
            if not target_id:
                raise InvalidActionError("Target required for HEAL")

            player.witch_has_heal = False

        elif action_type == NightActionType.POISON:
            if not player.witch_has_poison:
                raise InvalidActionError("No poison potion left")
            if not target_id or target_id not in game.players:
                raise InvalidActionError("Invalid target for POISON")

            player.witch_has_poison = False

        else:
            raise InvalidActionError("Invalid action type for Witch")

        player.night_action_target = target_id
        player.night_action_type = action_type


class Hunter(Role):
    def __init__(self):
        super().__init__(RoleType.HUNTER)

    @property
    def can_act_at_night(self) -> bool:
        return True

    def get_description(self) -> str:
        return "If you are killed, your target will also die."

    def get_night_info(self, _game_state, _player_id: str) -> NightInfoSchema | None:
        return NightInfoSchema(
            prompt="Select who you will take with you if you die tonight.",
            actions_available=[NightActionType.REVENGE],
        )

    def handle_night_action(
        self, game: "Game", player_id: str, action_type: str, target_id: str | None
    ) -> None:
        self.validate_night_action(game, player_id, action_type, target_id, NightActionType.REVENGE)
        # Also update revenge target specific field
        if action_type != NightActionType.SKIP and target_id:
            player = game.players.get(player_id)
            if player:
                player.hunter_revenge_target = target_id


class Cupid(Role):
    def __init__(self):
        super().__init__(RoleType.CUPID)

    @property
    def can_act_at_night(self) -> bool:
        return True

    def get_description(self) -> str:
        return "Link two players as lovers on the first night."

    def get_night_info(self, game_state, _player_id: str) -> NightInfoSchema | None:
        if game_state.turn_count > 1:
            return None  # Only act on night 1

        return NightInfoSchema(
            prompt="Choose two players to fall in love.",
            actions_available=[NightActionType.LINK],
        )

    def handle_night_action(
        self, game: "Game", player_id: str, action_type: str, target_id: str | None
    ) -> None:
        player = game.players.get(player_id)
        if not player:
            return

        if action_type == NightActionType.SKIP:
            player.night_action_target = "SKIP"
            player.night_action_type = NightActionType.SKIP
            return

        if game.turn_count > 1:
            raise InvalidActionError("Cupid can only act on the first night")

        if action_type != NightActionType.LINK:
            raise InvalidActionError("Invalid action type for Cupid")

        if not target_id or "," not in target_id:
            raise InvalidActionError("Cupid must select two players (comma separated)")

        targets = target_id.split(",")
        if len(targets) != 2:
            raise InvalidActionError("Must select exactly two players")

        t1, t2 = targets[0], targets[1]

        if t1 not in game.players or t2 not in game.players:
            raise InvalidActionError("Invalid target player(s)")

        if t1 == t2:
            raise InvalidActionError("Cannot link a player to themselves")

        player.night_action_target = target_id
        player.night_action_type = action_type


class Bodyguard(Role):
    def __init__(self):
        super().__init__(RoleType.BODYGUARD)

    @property
    def can_act_at_night(self) -> bool:
        return True

    def get_description(self) -> str:
        return "Protect one player from death each night. Cannot choose the same person twice in a row."

    def get_night_info(self, _game_state, _player_id: str) -> NightInfoSchema | None:
        return NightInfoSchema(
            prompt="Choose a player to guard tonight.",
            actions_available=[NightActionType.SAVE],
        )

    def handle_night_action(
        self, game: "Game", player_id: str, action_type: str, target_id: str | None
    ) -> None:
        player = game.players.get(player_id)
        if not player:
            return

        if action_type == NightActionType.SKIP:
            player.night_action_target = "SKIP"
            player.night_action_type = NightActionType.SKIP
            return

        if action_type != NightActionType.SAVE:
            raise InvalidActionError("Invalid action type for Bodyguard")

        if not target_id or target_id not in game.players:
            raise InvalidActionError("Invalid target")

        if target_id == player.last_protected_target:
            raise InvalidActionError("Cannot protect the same player twice in a row")

        player.night_action_target = target_id
        player.night_action_type = action_type
        player.last_protected_target = target_id


class Spectator(Role):
    def __init__(self):
        super().__init__(RoleType.SPECTATOR)

    @property
    def can_vote(self) -> bool:
        return False

    @property
    def can_act_at_night(self) -> bool:
        return False

    def get_description(self) -> str:
        return "You are spectating the game."


def get_role_instance(role_type: RoleType) -> Role:
    if role_type == RoleType.WEREWOLF:
        return Werewolf()
    elif role_type == RoleType.SEER:
        return Seer()
    elif role_type == RoleType.DOCTOR:
        return Doctor()
    elif role_type == RoleType.WITCH:
        return Witch()
    elif role_type == RoleType.HUNTER:
        return Hunter()
    elif role_type == RoleType.BODYGUARD:
        return Bodyguard()
    elif role_type == RoleType.CUPID:
        return Cupid()
    elif role_type == RoleType.LYCAN:
        return Lycan()
    elif role_type == RoleType.TANNER:
        return Tanner()
    elif role_type == RoleType.SPECTATOR:
        return Spectator()
    return Villager()
