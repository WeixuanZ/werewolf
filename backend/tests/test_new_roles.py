from app.models.game import Game
from app.schemas.game import GamePhase, GameSettingsSchema, NightActionType, RoleType
import pytest

class TestNewRoles:
    def test_cupid_linking_and_lovers_pact(self):
        """Test Cupid linking and lovers dying together."""
        settings = GameSettingsSchema(
            role_distribution={
                RoleType.CUPID: 1,
                RoleType.WEREWOLF: 1,
                RoleType.VILLAGER: 2,
            }
        )
        game = Game.create("room_cupid", settings)
        game.add_player("cupid", "Cupid")
        game.add_player("wolf", "Wolf")
        game.add_player("lover1", "L1")
        game.add_player("lover2", "L2")

        game.start_game()

        # Force roles
        game.players["cupid"].role = RoleType.CUPID
        game.players["wolf"].role = RoleType.WEREWOLF
        game.players["lover1"].role = RoleType.VILLAGER
        game.players["lover2"].role = RoleType.VILLAGER

        # Cupid links L1 and L2
        game.process_action("cupid", {
            "action_type": NightActionType.LINK,
            "target_id": "lover1,lover2",
            "confirmed": True
        })

        # Wolf kills L1
        game.process_action("wolf", {"action_type": NightActionType.KILL, "target_id": "lover1"})

        # Resolve Night
        game.check_and_advance()

        # Cupid (alive) + Wolf (alive) = 2 players. Wolf wins (>= villagers)
        # 4 players start. L1 dies by wolf, L2 dies by pact.
        # Alive: Cupid, Wolf.
        # Werewolves >= Villagers (Cupid is villager team). 1 >= 1.
        # So it should be GAME_OVER or DAY depending on logic.
        # Standard logic: Wolf wins if wolves >= villagers.

        assert game.lovers == ["lover1", "lover2"]
        assert not game.players["lover1"].is_alive
        assert not game.players["lover2"].is_alive

    def test_lycan_seer_interaction(self):
        """Test Seer seeing Lycan as Werewolf."""
        settings = GameSettingsSchema(
            role_distribution={RoleType.LYCAN: 1, RoleType.SEER: 1}
        )
        game = Game.create("room_lycan", settings)
        game.add_player("seer", "Seer")
        game.add_player("lycan", "Lycan")

        game.start_game()
        game.players["seer"].role = RoleType.SEER
        game.players["lycan"].role = RoleType.LYCAN

        # Seer checks Lycan
        game.process_action("seer", {"action_type": NightActionType.CHECK, "target_id": "lycan"})

        # Check View (Seer should see WOLF)
        view = game.get_view_for_player("seer")
        assert view.players["lycan"].role == RoleType.WEREWOLF

    def test_tanner_suicide_win(self):
        """Test Tanner winning if voted out."""
        settings = GameSettingsSchema(role_distribution={RoleType.TANNER: 1, RoleType.VILLAGER: 2})
        game = Game.create("room_tanner", settings)
        game.add_player("tanner", "Tanner")
        game.add_player("v1", "V1")
        game.add_player("v2", "V2")

        game.start_game()
        game.players["tanner"].role = RoleType.TANNER

        game.transition_to(GamePhase.DAY)

        # Vote out Tanner
        game.process_action("v1", {"target_id": "tanner"})
        game.process_action("v2", {"target_id": "tanner"})
        game.process_action("tanner", {"target_id": "v1"})

        game.check_and_advance()

        assert game.phase == GamePhase.GAME_OVER
        assert game.winners == "TANNER"
