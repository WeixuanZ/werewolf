from app.models.game import Game
from app.schemas.game import GamePhase, GameSettingsSchema, NightActionType, RoleType


class TestAdvancedRoles:
    def setup_method(self):
        """Create a game with standard advanced setup."""
        settings = GameSettingsSchema(
            role_distribution={
                RoleType.WEREWOLF: 1,
                RoleType.WITCH: 1,
                RoleType.HUNTER: 1,
                RoleType.VILLAGER: 1,
            }
        )
        self.game = Game.create("room_advanced", settings)

        self.game.add_player("wolf", "Wolf")
        self.game.add_player("witch", "Witch")
        self.game.add_player("hunter", "Hunter")
        self.game.add_player("villager", "Villager")

        # Manually force roles for predictable testing
        self.game.players["wolf"].role = RoleType.WEREWOLF
        self.game.players["witch"].role = RoleType.WITCH
        self.game.players["hunter"].role = RoleType.HUNTER
        self.game.players["villager"].role = RoleType.VILLAGER

        self.game.phase = GamePhase.NIGHT

    def test_witch_heal_saves_victim(self):
        """Witch heals the werewolf's target."""
        # Wolf attacks Villager
        self.game.process_action(
            "wolf", {"action_type": NightActionType.KILL, "target_id": "villager"}
        )

        # Verify Witch sees the victim
        witch_role = self.game.players["witch"].role_instance
        assert witch_role is not None
        night_info = witch_role.get_night_info(self.game, "witch")
        assert night_info is not None
        assert night_info.victim_id == "villager"
        assert NightActionType.HEAL in night_info.actions_available

        # Witch heals Villager
        self.game.process_action(
            "witch", {"action_type": NightActionType.HEAL, "target_id": "villager"}
        )

        # Hunter skips
        self.game.process_action(
            "hunter", {"action_type": NightActionType.SKIP, "target_id": "hunter"}
        )

        assert not self.game.players["witch"].witch_has_heal

        # Resolve night
        self.game.check_and_advance()

        # Expectation: No deaths
        assert self.game.players["villager"].is_alive
        assert self.game.phase == GamePhase.DAY

    def test_witch_poison_kills_target(self):
        """Witch poisons a target."""
        # Wolf attacks Villager
        self.game.process_action(
            "wolf", {"action_type": NightActionType.KILL, "target_id": "villager"}
        )

        # Witch poisons Wolf (ignoring save)
        self.game.process_action(
            "witch", {"action_type": NightActionType.POISON, "target_id": "wolf"}
        )

        # Hunter skips
        self.game.process_action(
            "hunter", {"action_type": NightActionType.SKIP, "target_id": "hunter"}
        )

        assert not self.game.players["witch"].witch_has_poison

        self.game.check_and_advance()

        # Expectation: Villager dies (wolf kill), Wolf dies (poison)
        assert not self.game.players["villager"].is_alive
        assert not self.game.players["wolf"].is_alive

    def test_hunter_revenge(self):
        """Hunter takes someone down with them."""
        # Wolf attacks Hunter
        self.game.process_action(
            "wolf", {"action_type": NightActionType.KILL, "target_id": "hunter"}
        )

        # Hunter selects target (e.g. Wolf)
        self.game.process_action(
            "hunter", {"action_type": NightActionType.REVENGE, "target_id": "wolf"}
        )

        # Witch skips
        self.game.process_action(
            "witch", {"action_type": NightActionType.SKIP, "target_id": "witch"}
        )

        self.game.check_and_advance()

        # Expectation: Hunter dies, Wolf dies
        assert not self.game.players["hunter"].is_alive
        assert not self.game.players["wolf"].is_alive

    def test_hunter_saved_no_revenge(self):
        """Hunter is saved, so no revenge triggers."""
        self.game.process_action(
            "wolf", {"action_type": NightActionType.KILL, "target_id": "hunter"}
        )

        # Witch saves Hunter
        self.game.process_action(
            "witch", {"action_type": NightActionType.HEAL, "target_id": "hunter"}
        )

        # Hunter selected target anyway
        self.game.process_action(
            "hunter", {"action_type": NightActionType.REVENGE, "target_id": "wolf"}
        )

        self.game.check_and_advance()

        # Expectation: Hunter alive, Wolf alive (revenge didn't happen)
        assert self.game.players["hunter"].is_alive
        assert self.game.players["wolf"].is_alive

    def test_witch_cannot_use_empty_potion(self):
        """Witch cannot use same potion twice (simulated in one night for resource check)."""
        # Logic removes potion immediately in process_action, so second call should fail or be ignored
        # But our simple process_action might just update state.
        # Let's test resource consumption persistence across turns (manually simulation)

        # Night 1: Use Heal
        self.game.players["witch"].witch_has_heal = True
        self.game.process_action(
            "witch", {"action_type": NightActionType.HEAL, "target_id": "villager"}
        )
        assert self.game.players["witch"].witch_has_heal is False

        # Reset for "Night 2" simulation (manually reset phase/targets)
        self.game.phase = GamePhase.NIGHT
        self.game.players["witch"].night_action_target = None

        # Try to use Heal again
        self.game.process_action(
            "witch", {"action_type": NightActionType.HEAL, "target_id": "villager"}
        )

        # Should not set target because resource is gone
        assert self.game.players["witch"].night_action_target is None
