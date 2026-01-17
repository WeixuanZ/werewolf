from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

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

    def handle_night_action(
        self, _game: "Game", _player_id: str, _action_type: str, _target_id: str | None
    ) -> None:
        """
        Process the night action for this role.
        Validates the action and updates player state.
        Raises ValueError if action is invalid.
        """
        # Default implementation for non-acting roles or generic validation
        if not self.can_act_at_night:
            raise ValueError(f"{self.role_type} cannot act at night")


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
        if action_type != NightActionType.KILL and action_type != NightActionType.SKIP:
            raise ValueError("Invalid action type for Werewolf")

        player = game.players.get(player_id)
        if not player:
            return

        # SKIP logic
        if action_type == NightActionType.SKIP:
            player.night_action_target = "SKIP"
            player.night_action_type = NightActionType.SKIP
            return

        if not target_id or target_id not in game.players:
            raise ValueError("Invalid target")

        player.night_action_target = target_id
        player.night_action_type = action_type


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
        if action_type != NightActionType.CHECK and action_type != NightActionType.SKIP:
            raise ValueError("Invalid action type for Seer")

        player = game.players.get(player_id)
        if not player:
            return

        if action_type == NightActionType.SKIP:
            player.night_action_target = "SKIP"
            player.night_action_type = NightActionType.SKIP
            return

        if not target_id or target_id not in game.players:
            raise ValueError("Invalid target")

        player.night_action_target = target_id
        player.night_action_type = action_type

        # Seer immediate effect: Reveal
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
        if action_type != NightActionType.SAVE and action_type != NightActionType.SKIP:
            raise ValueError("Invalid action type for Doctor")

        player = game.players.get(player_id)
        if not player:
            return

        if action_type == NightActionType.SKIP:
            player.night_action_target = "SKIP"
            player.night_action_type = NightActionType.SKIP
            return

        if not target_id or target_id not in game.players:
            raise ValueError("Invalid target")

        player.night_action_target = target_id
        player.night_action_type = action_type


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
                raise ValueError("No heal potion left")

            # For Heal, target MUST be invalid/None or match victim?
            # Frontend sends victim_id as target_id.
            if not target_id:
                raise ValueError("Target required for HEAL")

            player.witch_has_heal = False

        elif action_type == NightActionType.POISON:
            if not player.witch_has_poison:
                raise ValueError("No poison potion left")
            if not target_id or target_id not in game.players:
                raise ValueError("Invalid target for POISON")

            player.witch_has_poison = False

        else:
            raise ValueError("Invalid action type for Witch")

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
        player = game.players.get(player_id)
        if not player:
            return

        if action_type == NightActionType.SKIP:
            player.night_action_target = "SKIP"
            player.night_action_type = NightActionType.SKIP
            return

        if action_type != NightActionType.REVENGE:
            raise ValueError("Invalid action type for Hunter")

        if not target_id or target_id not in game.players:
            raise ValueError("Invalid target")

        player.night_action_target = target_id
        player.night_action_type = action_type
        # Also update revenge target specific field
        player.hunter_revenge_target = target_id


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
    return Villager()
