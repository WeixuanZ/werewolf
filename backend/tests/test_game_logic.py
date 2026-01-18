from app.models.game import Game
from app.schemas.game import GamePhase, GameSettingsSchema, RoleType


class TestGameInitialization:
    def test_create_game(self):
        game = Game.create("room1")
        assert game.room_id == "room1"
        assert game.phase == GamePhase.WAITING
        assert len(game.players) == 0

    def test_add_player(self):
        game = Game.create("room1")
        game.add_player("id1", "Alice")
        assert len(game.players) == 1
        assert game.players["id1"].nickname == "Alice"

    def test_join_started_game_as_spectator(self):
        game = Game.create("room1")
        game.phase = GamePhase.NIGHT

        game.add_player("id1", "Alice")

        player = game.players["id1"]
        assert player.role == RoleType.SPECTATOR
        assert player.nickname == "Alice"


class TestRoleAssignment:
    def test_assign_roles_correctly(self):
        settings = GameSettingsSchema(
            role_distribution={
                RoleType.WEREWOLF: 1,
                RoleType.SEER: 1,
                RoleType.VILLAGER: 2,
            }
        )
        game = Game.create("room1", settings)
        for i in range(4):
            game.add_player(str(i), f"P{i}")

        game.assign_roles()

        roles = [p.role for p in game.players.values() if p.role]
        assert roles.count(RoleType.WEREWOLF) == 1
        assert roles.count(RoleType.SEER) == 1
        assert roles.count(RoleType.VILLAGER) == 2

    def test_start_game_assigns_roles(self):
        settings = GameSettingsSchema(
            role_distribution={RoleType.WEREWOLF: 1, RoleType.VILLAGER: 3}
        )
        game = Game.create("room1", settings)
        for i in range(4):
            game.add_player(str(i), f"P{i}")

        game.start_game()

        # start_game now transitions to NIGHT
        assert game.phase == GamePhase.NIGHT
        assert game.turn_count == 1
        assert all(p.role is not None for p in game.players.values())


class TestGameEnd:
    def test_check_winners_ignores_spectators(self):
        settings = GameSettingsSchema(
            role_distribution={
                RoleType.WEREWOLF: 1,
                RoleType.VILLAGER: 2,
            }
        )
        game = Game.create("room1", settings)

        game.add_player("wolf", "Wolf")
        game.add_player("v1", "Villager 1")
        game.add_player("v2", "Villager 2")

        game.players["wolf"].role = RoleType.WEREWOLF
        game.players["v1"].role = RoleType.VILLAGER
        game.players["v2"].role = RoleType.VILLAGER

        game.phase = GamePhase.NIGHT

        # Add spectator
        game.add_player("spec", "Spectator")
        assert game.players["spec"].role == RoleType.SPECTATOR

        # 1 Wolf, 2 Villagers, 1 Spectator
        # 1 < 2 => No winner yet
        assert game.check_winners() is None

        # Kill one villager
        game.players["v1"].is_alive = False

        # 1 Wolf, 1 Villager, 1 Spectator
        # If spectator counted as villager: 1 Wolf vs 2 "Villagers" => No win
        # If spectator ignored: 1 Wolf vs 1 Villager => Wolf win
        assert game.check_winners() == "WEREWOLVES"


class TestSpectatorLogic:
    def test_spectator_cannot_vote(self):
        game = Game.create("room1")
        game.phase = GamePhase.DAY

        game.add_player("spec", "Spectator")
        assert game.players["spec"].role == RoleType.SPECTATOR

        # Spectator tries to vote
        game.process_action("spec", {"target_id": "spec"})

        # Vote should be ignored
        assert game.players["spec"].vote_target is None

    def test_day_phase_completes_without_spectator_vote(self):
        settings = GameSettingsSchema(
            role_distribution={RoleType.VILLAGER: 2, RoleType.WEREWOLF: 1}
        )
        game = Game.create("room1", settings)

        game.add_player("v1", "Villager 1")
        game.players["v1"].role = RoleType.VILLAGER

        game.add_player("v2", "Villager 2")
        game.players["v2"].role = RoleType.VILLAGER

        game.add_player("w1", "Werewolf")
        game.players["w1"].role = RoleType.WEREWOLF

        game.phase = GamePhase.DAY

        game.add_player("spec", "Spectator")
        assert game.players["spec"].role == RoleType.SPECTATOR

        # Everyone votes
        game.process_action("v1", {"target_id": "spec"})
        game.process_action("v2", {"target_id": "spec"})
        game.process_action("w1", {"target_id": "spec"})

        # Spectator does NOT vote

        # Should complete
        completed = game.check_and_advance()
        assert completed
        assert game.phase == GamePhase.NIGHT


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
        self.game = Game.create("room1", settings)

        # Add players
        self.game.add_player("wolf_id", "Wolf")
        self.game.add_player("seer_id", "Seer")
        self.game.add_player("doc_id", "Doc")
        self.game.add_player("villager_id", "Villager")

        # Manually assign specific roles for predictable testing
        # Using internal state modification for setup
        self.game.players["wolf_id"].role = RoleType.WEREWOLF
        self.game.players["seer_id"].role = RoleType.SEER
        self.game.players["doc_id"].role = RoleType.DOCTOR
        self.game.players["villager_id"].role = RoleType.VILLAGER

        self.game.phase = GamePhase.NIGHT

    def test_process_night_action(self):
        self.game.process_action("wolf_id", {"action_type": "KILL", "target_id": "villager_id"})
        assert self.game.players["wolf_id"].night_action_target == "villager_id"

    def test_action_overwrite(self):
        """Second action from same player overwrites first."""
        self.game.process_action("wolf_id", {"action_type": "KILL", "target_id": "villager_id"})
        self.game.process_action("wolf_id", {"action_type": "KILL", "target_id": "seer_id"})
        assert self.game.players["wolf_id"].night_action_target == "seer_id"

    def test_kill_without_save(self):
        """Werewolf kills target, doctor saves someone else."""
        self.game.process_action("wolf_id", {"action_type": "KILL", "target_id": "villager_id"})
        self.game.process_action("doc_id", {"action_type": "SAVE", "target_id": "seer_id"})
        self.game.process_action("seer_id", {"action_type": "CHECK", "target_id": "wolf_id"})

        # All night actors have acted, check_and_advance should resolve
        self.game.check_and_advance()

        assert not self.game.players["villager_id"].is_alive
        assert self.game.players["seer_id"].is_alive
        assert self.game.phase == GamePhase.DAY

    def test_kill_saved_by_doctor(self):
        """Doctor saves the kill target."""
        self.game.process_action("wolf_id", {"action_type": "KILL", "target_id": "seer_id"})
        self.game.process_action("doc_id", {"action_type": "SAVE", "target_id": "seer_id"})
        self.game.process_action("seer_id", {"action_type": "CHECK", "target_id": "wolf_id"})

        self.game.check_and_advance()

        assert self.game.players["seer_id"].is_alive
        assert self.game.phase == GamePhase.DAY

    def test_night_actions_cleared_after_resolve(self):
        self.game.process_action("wolf_id", {"action_type": "KILL", "target_id": "villager_id"})
        self.game.process_action("doc_id", {"action_type": "SAVE", "target_id": "seer_id"})
        self.game.process_action("seer_id", {"action_type": "CHECK", "target_id": "wolf_id"})

        self.game.check_and_advance()

        # After resolution, we are in DAY phase
        assert self.game.phase == GamePhase.DAY
        # Actions persist in the model until next night entry, BUT the check_and_advance logic happens in state transition

        # Let's verify new GamePhase.NIGHT entry clears them
        self.game.transition_to(GamePhase.NIGHT)
        assert self.game.players["wolf_id"].night_action_target is None

    def test_seer_reveal_list(self):
        """Test that checks are recorded in seer_reveals."""
        self.game.process_action("seer_id", {"action_type": "CHECK", "target_id": "wolf_id"})

        assert "seer_id" in self.game.seer_reveals
        assert "wolf_id" in self.game.seer_reveals["seer_id"]


class TestSerialization:
    def test_to_json_and_back(self):
        # This replaces the schema test as we use JSON for persistence now
        settings = GameSettingsSchema(
            role_distribution={RoleType.WEREWOLF: 1, RoleType.VILLAGER: 1}
        )
        game = Game.create("room1", settings)
        game.add_player("p1", "Alice", is_admin=True)
        game.add_player("p2", "Bob")
        game.start_game()

        # Set some state
        game.players["p1"].night_action_target = "p2"

        json_data = game.to_json()
        restored = Game.from_json(json_data)

        assert restored.room_id == game.room_id
        assert restored.phase == game.phase
        assert len(restored.players) == 2
        assert restored.players["p1"].is_admin
        # Verify persistence of fields
        assert restored.players["p1"].night_action_target == "p2"
