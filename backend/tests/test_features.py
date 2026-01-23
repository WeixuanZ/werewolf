from app.models.game import Game
from app.schemas.game import GamePhase, GameSettingsSchema, NightActionType, RoleType
from app.core.exceptions import InvalidActionError
import pytest

class TestFeatures:
    def test_bodyguard_logic(self):
        """Test Bodyguard protection mechanics."""
        settings = GameSettingsSchema(
            role_distribution={
                RoleType.BODYGUARD: 1,
                RoleType.WEREWOLF: 1,
                RoleType.VILLAGER: 1,
            }
        )
        game = Game.create("room_bg", settings)
        game.add_player("bg", "Bodyguard")
        game.add_player("wolf", "Wolf")
        game.add_player("villager", "Vil")
        game.start_game()

        game.players["bg"].role = RoleType.BODYGUARD
        game.players["wolf"].role = RoleType.WEREWOLF
        game.players["villager"].role = RoleType.VILLAGER

        # Night 1: Protect Villager
        game.process_action("bg", {"action_type": NightActionType.SAVE, "target_id": "villager"})

        # Verify protected
        assert game.players["bg"].night_action_target == "villager"

        # Simulate processing to update last_protected (usually happens in handle_night_action)
        # Note: In real flow, handle_night_action sets last_protected_target.

        # Reset for Night 2 (simulation)
        game.players["bg"].night_action_target = None
        game.players["bg"].night_action_confirmed = False

        # Night 2: Try to protect Villager again (Should fail)
        try:
            game.process_action("bg", {"action_type": NightActionType.SAVE, "target_id": "villager"})
            pytest.fail("Should have raised InvalidActionError")
        except InvalidActionError as e:
            assert "Cannot protect the same player twice" in str(e)

    def test_exception_handling(self):
        """Verify that InvalidActionError is raised correctly."""
        game = Game.create("room_err")
        game.add_player("p1", "P1")
        game.start_game()
        game.players["p1"].role = RoleType.VILLAGER

        # Villager trying night action
        try:
             game.process_action("p1", {"action_type": NightActionType.KILL, "target_id": "p1"})
             pytest.fail("Should raise error for Villager acting at night")
        except InvalidActionError as e:
            assert "VILLAGER cannot act at night" in str(e)

    def test_werewolf_vote_distribution(self):
        """Test that wolves receive vote distribution info."""
        settings = GameSettingsSchema(
            role_distribution={RoleType.WEREWOLF: 2}
        )
        game = Game.create("room_wolves", settings)
        game.add_player("w1", "Wolf1")
        game.add_player("w2", "Wolf2")
        game.add_player("v1", "Vil1")

        game.start_game()
        game.players["w1"].role = RoleType.WEREWOLF
        game.players["w2"].role = RoleType.WEREWOLF
        game.players["v1"].role = RoleType.VILLAGER

        # Wolf 1 votes for V1
        game.process_action("w1", {"action_type": NightActionType.KILL, "target_id": "v1"})

        # Check view for Wolf 2
        view = game.get_view_for_player("w2")

        # Wolf 2 should see the vote distribution in their own player object
        assert view.players["w2"].night_action_vote_distribution is not None
        assert view.players["w2"].night_action_vote_distribution["v1"] == 1
