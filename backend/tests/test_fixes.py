
from app.models.game import Game
from app.schemas.game import GamePhase, GameSettingsSchema, NightActionType, RoleType

class TestFixes:
    def test_hunter_day_revenge(self):
        """Hunter voted out during day should trigger REVENGE phase and kill target."""
        settings = GameSettingsSchema(
            role_distribution={
                RoleType.HUNTER: 1,
                RoleType.WEREWOLF: 1,
                RoleType.VILLAGER: 1,
            }
        )
        game = Game.create("room_hunter_day", settings)

        game.add_player("hunter", "Hunt", is_admin=True)
        game.add_player("wolf", "Wolf")
        game.add_player("villager", "Vil")

        game.start_game()

        # Force roles
        game.players["hunter"].role = RoleType.HUNTER
        game.players["wolf"].role = RoleType.WEREWOLF
        game.players["villager"].role = RoleType.VILLAGER

        # Transition to Day
        game.transition_to(GamePhase.DAY)

        # Vote out Hunter
        game.process_action("wolf", {"target_id": "hunter"})
        game.process_action("villager", {"target_id": "hunter"})
        game.process_action("hunter", {"target_id": "wolf"})

        # Should transition to HUNTER_REVENGE
        assert game.check_and_advance()
        assert game.phase == GamePhase.HUNTER_REVENGE
        assert not game.players["hunter"].is_alive

        # Hunter takes revenge on Wolf
        game.process_action(
            "hunter",
            {"action_type": NightActionType.REVENGE, "target_id": "wolf", "confirmed": True}
        )

        # Should transition to NIGHT (or GAME_OVER if Wolf dies and no wolves left)
        # Wolf death check happens in resolve()
        assert game.check_and_advance()

        assert not game.players["wolf"].is_alive
        assert game.phase == GamePhase.GAME_OVER # Wolves dead -> Villagers win
        assert game.winners == "VILLAGERS"

    def test_reveal_role_on_death_setting(self):
        """Test that roles are revealed only if setting is enabled."""
        settings = GameSettingsSchema(reveal_role_on_death=True)
        game = Game.create("room_reveal", settings)

        game.add_player("viewer", "Viewer")
        game.add_player("dead_wolf", "DeadWolf")

        game.start_game()
        game.players["viewer"].role = RoleType.VILLAGER
        game.players["dead_wolf"].role = RoleType.WEREWOLF
        game.players["dead_wolf"].is_alive = False

        # Check View (Should see role)
        view = game.get_view_for_player("viewer")
        assert view.players["dead_wolf"].role == RoleType.WEREWOLF

        # Disable setting
        game.settings.reveal_role_on_death = False
        view = game.get_view_for_player("viewer")
        assert view.players["dead_wolf"].role is None

    def test_hunter_revenge_skipped_if_not_hunter_died(self):
        """If a non-hunter dies, skip revenge phase."""
        game = Game.create("room_villager_day")
        game.add_player("hunter", "Hunt")
        game.add_player("villager", "Vil")
        game.add_player("villager2", "Vil2")
        game.add_player("wolf", "Wolf")

        game.start_game()
        game.players["hunter"].role = RoleType.HUNTER
        game.players["villager"].role = RoleType.VILLAGER
        game.players["villager2"].role = RoleType.VILLAGER
        game.players["wolf"].role = RoleType.WEREWOLF

        game.transition_to(GamePhase.DAY)

        # Vote out Villager
        game.process_action("wolf", {"target_id": "villager"})
        game.process_action("hunter", {"target_id": "villager"})
        game.process_action("villager", {"target_id": "wolf"})
        game.process_action("villager2", {"target_id": "villager"})

        game.check_and_advance()

        assert game.phase == GamePhase.NIGHT
        assert not game.players["villager"].is_alive
