import pytest

from app.models.game import Game, GameState
from app.models.roles import RoleType
from app.schemas.game import GameSettingsSchema


def create_game_with_players(count: int) -> Game:
    game = Game(GameState(room_id="test", settings=GameSettingsSchema()))
    for i in range(count):
        game.add_player(f"p{i}", f"Player {i}", is_admin=(i == 0))
    return game


@pytest.mark.parametrize(
    "player_count,expected_roles",
    [
        (4, {RoleType.WEREWOLF: 1, RoleType.SEER: 1, RoleType.VILLAGER: 2}),
            (5, {RoleType.WEREWOLF: 1, RoleType.SEER: 1, RoleType.DOCTOR: 1, RoleType.CUPID: 1, RoleType.VILLAGER: 1}),
            (6, {RoleType.WEREWOLF: 1, RoleType.SEER: 1, RoleType.DOCTOR: 1, RoleType.CUPID: 1, RoleType.VILLAGER: 2}),
        (
            7,
            {
                RoleType.WEREWOLF: 1,
                RoleType.SEER: 1,
                RoleType.DOCTOR: 1,
                RoleType.WITCH: 1,
                    RoleType.CUPID: 1,
                    RoleType.TANNER: 1,
                    RoleType.VILLAGER: 1,
            },
        ),
        (
            8,
            {
                RoleType.WEREWOLF: 1,
                RoleType.SEER: 1,
                RoleType.DOCTOR: 1,
                RoleType.WITCH: 1,
                    RoleType.CUPID: 1,
                    RoleType.TANNER: 1,
                    RoleType.VILLAGER: 2,
            },
        ),
        (
            9,
            {
                RoleType.WEREWOLF: 2,
                RoleType.SEER: 1,
                RoleType.DOCTOR: 1,
                RoleType.WITCH: 1,
                RoleType.HUNTER: 1,
                    RoleType.CUPID: 1,
                    RoleType.TANNER: 1,
                    RoleType.LYCAN: 1,
                    RoleType.VILLAGER: 0,
            },
        ),
    ],
)
def test_auto_balance_roles(player_count, expected_roles):
    game = create_game_with_players(player_count)
    game.auto_balance_roles()

    distribution = game.settings.role_distribution

    for role, count in expected_roles.items():
        assert distribution.get(role, 0) == count, (
            f"Expected {count} {role} for {player_count} players"
        )

    # Ensure total matches
    total_assigned = sum(distribution.values())
    assert total_assigned == player_count


def test_auto_balance_roles_defaults():
    # Test valid defaults exist for standard known ranges
    for i in range(4, 13):
        game = create_game_with_players(i)
        game.auto_balance_roles()
        assert sum(game.settings.role_distribution.values()) == i
