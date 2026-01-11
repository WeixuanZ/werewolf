import pytest

from app.models.game import Game
from app.models.player import Player
from app.schemas.game import GamePhase, GameSettingsSchema, RoleType


class TestGameInitialization:
    def test_create_game(self):
        game = Game("room1", GameSettingsSchema())
        assert game.room_id == "room1"
        assert game.phase == GamePhase.WAITING
        assert len(game.players) == 0
        assert game.night_actions == []

    def test_add_player(self):
        game = Game("room1", GameSettingsSchema())
        player = Player("id1", "Alice")
        game.add_player(player)
        assert len(game.players) == 1
        assert game.players["id1"].nickname == "Alice"

    def test_cannot_join_started_game(self):
        game = Game("room1", GameSettingsSchema())
        game.phase = GamePhase.NIGHT
        with pytest.raises(ValueError, match="Cannot join game in progress"):
            game.add_player(Player("id1", "Alice"))


class TestRoleAssignment:
    def test_assign_roles_correctly(self):
        settings = GameSettingsSchema(
            role_distribution={
                RoleType.WEREWOLF: 1,
                RoleType.SEER: 1,
                RoleType.VILLAGER: 2,
            }
        )
        game = Game("room1", settings)
        for i in range(4):
            game.add_player(Player(str(i), f"P{i}"))

        game.assign_roles()

        roles = [p.role.role_type for p in game.players.values() if p.role]
        assert roles.count(RoleType.WEREWOLF) == 1
        assert roles.count(RoleType.SEER) == 1
        assert roles.count(RoleType.VILLAGER) == 2

    def test_start_game_assigns_roles(self):
        settings = GameSettingsSchema(
            role_distribution={RoleType.WEREWOLF: 1, RoleType.VILLAGER: 3}
        )
        game = Game("room1", settings)
        for i in range(4):
            game.add_player(Player(str(i), f"P{i}"))

        game.start_game()

        assert game.phase == GamePhase.DAY
        assert game.turn_count == 1
        assert all(p.role is not None for p in game.players.values())


class TestNightPhase:
    def setup_method(self):
        """Create a game with 4 players ready for night phase testing."""
        settings = GameSettingsSchema(
            role_distribution={
                RoleType.WEREWOLF: 1,
                RoleType.SEER: 1,
                RoleType.DOCTOR: 1,
                RoleType.VILLAGER: 1,
            }
        )
        self.game = Game("room1", settings)
        self.players = {
            "wolf": Player("wolf_id", "Wolf"),
            "seer": Player("seer_id", "Seer"),
            "doc": Player("doc_id", "Doc"),
            "villager": Player("villager_id", "Villager"),
        }
        for p in self.players.values():
            self.game.add_player(p)

        # Manually assign specific roles for predictable testing
        self.players["wolf"].set_role(RoleType.WEREWOLF)
        self.players["seer"].set_role(RoleType.SEER)
        self.players["doc"].set_role(RoleType.DOCTOR)
        self.players["villager"].set_role(RoleType.VILLAGER)

        self.game.phase = GamePhase.NIGHT

    def test_process_night_action(self):
        self.game.process_night_action("KILL", "villager_id", "wolf_id")
        assert len(self.game.night_actions) == 1
        assert self.game.night_actions[0]["actor_id"] == "wolf_id"
        assert self.game.night_actions[0]["target_id"] == "villager_id"

    def test_action_overwrite(self):
        """Second action from same player overwrites first."""
        self.game.process_night_action("KILL", "villager_id", "wolf_id")
        self.game.process_night_action("KILL", "seer_id", "wolf_id")
        assert len(self.game.night_actions) == 1
        assert self.game.night_actions[0]["target_id"] == "seer_id"

    def test_kill_without_save(self):
        """Werewolf kills target, doctor saves someone else."""
        self.game.process_night_action("KILL", "villager_id", "wolf_id")
        self.game.process_night_action("SAVE", "seer_id", "doc_id")
        self.game.resolve_night_phase()

        assert not self.players["villager"].is_alive
        assert self.players["seer"].is_alive
        assert self.game.phase == GamePhase.DAY

    def test_kill_saved_by_doctor(self):
        """Doctor saves the kill target."""
        self.game.process_night_action("KILL", "seer_id", "wolf_id")
        self.game.process_night_action("SAVE", "seer_id", "doc_id")
        self.game.resolve_night_phase()

        assert self.players["seer"].is_alive
        assert self.game.phase == GamePhase.DAY

    def test_night_actions_cleared_after_resolve(self):
        self.game.process_night_action("KILL", "villager_id", "wolf_id")
        self.game.resolve_night_phase()
        assert self.game.night_actions == []


class TestSerialization:
    def test_to_schema_and_back(self):
        settings = GameSettingsSchema(
            role_distribution={RoleType.WEREWOLF: 1, RoleType.VILLAGER: 1}
        )
        game = Game("room1", settings)
        game.add_player(Player("p1", "Alice", is_admin=True))
        game.add_player(Player("p2", "Bob"))
        game.start_game()

        schema = game.to_schema()
        restored = Game.from_schema(schema)

        assert restored.room_id == game.room_id
        assert restored.phase == game.phase
        assert len(restored.players) == 2
        assert restored.players["p1"].is_admin
