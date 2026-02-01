from app.models.game import Game
from app.schemas.game import GamePhase, GameSettingsSchema, RoleType


class TestLoversWin:
    def test_lovers_win_condition(self):
        """Test that Lovers win when they are the last two alive."""
        settings = GameSettingsSchema(
            role_distribution={
                RoleType.WEREWOLF: 1,
                RoleType.CUPID: 1,
                RoleType.VILLAGER: 2,
            }
        )
        game = Game.create("room_lovers", settings)

        # Add players
        game.add_player("wolf", "Wolf")
        game.add_player("cupid", "Cupid")
        game.add_player("lover1", "Lover 1")
        game.add_player("lover2", "Lover 2")

        # Assign roles manually
        game.players["wolf"].role = RoleType.WEREWOLF
        game.players["cupid"].role = RoleType.CUPID
        game.players["lover1"].role = RoleType.VILLAGER
        game.players["lover2"].role = RoleType.VILLAGER

        # Set lovers
        game.lovers = ["lover1", "lover2"]

        game.phase = GamePhase.NIGHT

        # Kill everyone except lovers
        game.players["wolf"].is_alive = False
        game.players["cupid"].is_alive = False
        game.players["lover1"].is_alive = True
        game.players["lover2"].is_alive = True

        # Check winner
        assert game.check_winners() == "LOVERS"

    def test_lovers_win_versus_wolf(self):
        """Test that Lovers do NOT win if a wolf is still alive (unless they are the last 2)."""
        settings = GameSettingsSchema(
            role_distribution={
                RoleType.WEREWOLF: 1,
                RoleType.CUPID: 1,
                RoleType.VILLAGER: 2,
            }
        )
        game = Game.create("room_lovers_fail", settings)

        # Add players
        game.add_player("wolf", "Wolf")
        game.add_player("cupid", "Cupid")
        game.add_player("lover1", "Lover 1")
        game.add_player("lover2", "Lover 2")

        # Assign roles manually
        game.players["wolf"].role = RoleType.WEREWOLF
        game.players["cupid"].role = RoleType.CUPID
        game.players["lover1"].role = RoleType.VILLAGER
        game.players["lover2"].role = RoleType.VILLAGER

        # Set lovers
        game.lovers = ["lover1", "lover2"]

        game.phase = GamePhase.NIGHT

        # Wolf is alive, Cupid is dead, Lovers are alive
        game.players["wolf"].is_alive = True
        game.players["cupid"].is_alive = False
        game.players["lover1"].is_alive = True
        game.players["lover2"].is_alive = True

        # 3 people alive. Not Lovers win.
        # Wolf vs 2 Villagers. No win yet.
        assert game.check_winners() is None

    def test_lovers_win_wolf_lover(self):
        """Test Lovers win even if one is a Wolf, as long as they are the last 2."""
        settings = GameSettingsSchema(
            role_distribution={
                RoleType.WEREWOLF: 1,
                RoleType.CUPID: 1,
                RoleType.VILLAGER: 2,
            }
        )
        game = Game.create("room_lovers_wolf", settings)

        # Add players
        game.add_player("wolf_lover", "Wolf Lover")
        game.add_player("cupid", "Cupid")
        game.add_player("villager_lover", "Villager Lover")
        game.add_player("extra", "Extra")

        # Assign roles manually
        game.players["wolf_lover"].role = RoleType.WEREWOLF
        game.players["cupid"].role = RoleType.CUPID
        game.players["villager_lover"].role = RoleType.VILLAGER
        game.players["extra"].role = RoleType.VILLAGER

        # Set lovers
        game.lovers = ["wolf_lover", "villager_lover"]

        game.phase = GamePhase.NIGHT

        # Kill everyone except lovers
        game.players["wolf_lover"].is_alive = True
        game.players["villager_lover"].is_alive = True
        game.players["cupid"].is_alive = False
        game.players["extra"].is_alive = False

        # Check winner
        assert game.check_winners() == "LOVERS"
