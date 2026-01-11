from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.game import GameSettingsSchema
from app.services.game_service import GameService


@pytest.fixture
def mock_redis():
    """Common Redis mock fixture."""
    with patch("app.core.redis.RedisClient.get_client") as mock_get_client:
        mock_redis = AsyncMock()
        mock_redis.lock = MagicMock(return_value=AsyncMock())
        mock_get_client.return_value = mock_redis
        yield mock_redis


@pytest.mark.asyncio
async def test_create_room(mock_redis):
    service = GameService()
    result = await service.create_room(GameSettingsSchema())

    assert result.room_id is not None
    assert len(result.players) == 0  # Empty room now
    mock_redis.set.assert_called_once()


@pytest.mark.asyncio
async def test_join_room(mock_redis):
    mock_redis.get.return_value = """
    {
        "room_id": "test",
        "phase": "WAITING",
        "players": {},
        "settings": {"role_distribution": {}, "phase_duration_seconds": 60},
        "turn_count": 0,
        "winners": null,
        "seer_reveals": {},
        "voted_out_this_round": null
    }
    """

    service = GameService()
    result = await service.join_room("test", "Alice", "player_1")

    assert result is not None
    assert len(result.players) == 1
    assert result.players["player_1"].nickname == "Alice"
    assert result.players["player_1"].is_admin  # First player is admin


@pytest.mark.asyncio
async def test_duplicate_nickname_rejected(mock_redis):
    mock_redis.get.return_value = """
    {
        "room_id": "test",
        "phase": "WAITING",
        "players": {"p1": {"id": "p1", "nickname": "Alice", "role": null, "is_alive": true, "is_admin": true}},
        "settings": {"role_distribution": {}, "phase_duration_seconds": 60},
        "turn_count": 0,
        "winners": null,
        "seer_reveals": {},
        "voted_out_this_round": null
    }
    """

    service = GameService()
    with pytest.raises(ValueError, match="already taken"):
        await service.join_room("test", "Alice", "player_2")


@pytest.mark.asyncio
async def test_start_game_validates_role_count(mock_redis):
    # 2 players but roles add up to 4
    mock_redis.get.return_value = """
    {
        "room_id": "test",
        "phase": "WAITING",
        "players": {
            "p1": {"id": "p1", "nickname": "Alice", "role": null, "is_alive": true, "is_admin": true},
            "p2": {"id": "p2", "nickname": "Bob", "role": null, "is_alive": true, "is_admin": false}
        },
        "settings": {"role_distribution": {"WEREWOLF": 1, "VILLAGER": 3}, "phase_duration_seconds": 60},
        "turn_count": 0,
        "winners": null,
        "seer_reveals": {},
        "voted_out_this_round": null
    }
    """

    service = GameService()
    with pytest.raises(ValueError, match="must match player count"):
        await service.start_game("test", "p1", None)


@pytest.mark.asyncio
async def test_player_view_hides_roles(mock_redis):
    mock_redis.get.return_value = """
    {
        "room_id": "test",
        "phase": "NIGHT",
        "players": {
            "p1": {"id": "p1", "nickname": "Alice", "role": "WEREWOLF", "is_alive": true, "is_admin": true},
            "p2": {"id": "p2", "nickname": "Bob", "role": "VILLAGER", "is_alive": true, "is_admin": false}
        },
        "settings": {"role_distribution": {}, "phase_duration_seconds": 60},
        "turn_count": 1,
        "winners": null,
        "seer_reveals": {},
        "voted_out_this_round": null
    }
    """
    mock_redis.mget.return_value = [None, None]  # Both players offline

    service = GameService()
    game = await service.get_game("test")
    assert game is not None
    view = await service.get_player_view(game, "p1")

    # p1 sees their own role
    assert view.players["p1"].role == "WEREWOLF"
    # p1 does NOT see p2's role
    assert view.players["p2"].role is None
