from app.models.game import Game
from app.schemas.game import GamePhase, GameSettingsSchema, NightActionType, RoleType


class TestWitchConsensus:
    def setup_method(self):
        settings = GameSettingsSchema(
            role_distribution={
                RoleType.WEREWOLF: 2,
                RoleType.WITCH: 1,
                RoleType.VILLAGER: 2,
            }
        )
        self.game = Game.create("room_consensus", settings)
        self.game.add_player("wolf1", "Wolf 1")
        self.game.add_player("wolf2", "Wolf 2")
        self.game.add_player("witch", "Witch")
        self.game.add_player("v1", "Villager 1")
        self.game.add_player("v2", "Villager 2")

        self.game.players["wolf1"].role = RoleType.WEREWOLF
        self.game.players["wolf2"].role = RoleType.WEREWOLF
        self.game.players["witch"].role = RoleType.WITCH
        self.game.players["v1"].role = RoleType.VILLAGER
        self.game.players["v2"].role = RoleType.VILLAGER

        self.game.phase = GamePhase.NIGHT

    def test_witch_sees_victim_only_after_consensus(self):
        witch_role = self.game.players["witch"].role_instance
        assert witch_role is not None

        # 1. No wolves have acted
        info = witch_role.get_night_info(self.game, "witch")
        assert info is not None
        assert info.victim_id is None
        assert (
            "Still deliberating" in info.prompt
            or "Why are you looking at me" in info.prompt
            or "deliberating" in info.prompt
        )

        # 2. One wolf acts, other hasn't
        self.game.process_action(
            "wolf1", {"action_type": NightActionType.KILL, "target_id": "v1", "confirmed": True}
        )
        info = witch_role.get_night_info(self.game, "witch")
        assert info is not None
        assert info.victim_id is None  # Still waiting for wolf2

        # 3. Both wolves act, but different targets
        self.game.process_action(
            "wolf2", {"action_type": NightActionType.KILL, "target_id": "v2", "confirmed": True}
        )
        info = witch_role.get_night_info(self.game, "witch")
        assert info is not None
        assert info.victim_id is None  # Disagreement

        # 4. Wolves agree but one not confirmed (if UI supports unconfirmed selection)
        # Backend process_action usually confirms by default unless specified otherwise?
        # Let's update wolf2 to target v1 but unconfirmed (simulating selection change)
        self.game.process_action(
            "wolf2", {"action_type": NightActionType.KILL, "target_id": "v1", "confirmed": False}
        )
        info = witch_role.get_night_info(self.game, "witch")
        assert info is not None
        assert info.victim_id is None  # Not confirmed yet

        # 5. Consensus Reached
        self.game.process_action(
            "wolf2", {"action_type": NightActionType.KILL, "target_id": "v1", "confirmed": True}
        )
        info = witch_role.get_night_info(self.game, "witch")
        assert info is not None
        assert info.victim_id == "v1"
        assert "v1" in info.prompt or "Villager 1" in info.prompt
