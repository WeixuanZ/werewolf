from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from app.schemas.game import GameSettingsSchema, RoleType
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
async def test_update_settings_admin(mock_redis):
    mock_redis.get.return_value = """
    {
        "room_id": "test",
        "phase": "WAITING",
        "players": {
            "p1": {"id": "p1", "nickname": "Alice", "role": null, "is_alive": true, "is_admin": true},
            "p2": {"id": "p2", "nickname": "Bob", "role": null, "is_alive": true, "is_admin": false}
        },
        "settings": {"role_distribution": {"WEREWOLF": 1}, "phase_duration_seconds": 60},
        "turn_count": 0,
        "winners": null,
        "seer_reveals": {},
        "voted_out_this_round": null
    }
    """

    service = GameService()
    new_settings = GameSettingsSchema(
        role_distribution={RoleType.WEREWOLF: 2, RoleType.VILLAGER: 1},
        phase_duration_seconds=90
    )

    result = await service.update_settings("test", "p1", new_settings)

    assert result is not None
    assert result.settings.phase_duration_seconds == 90
    assert result.settings.role_distribution[RoleType.WEREWOLF] == 2
    mock_redis.set.assert_called_once()

@pytest.mark.asyncio
async def test_update_settings_non_admin(mock_redis):
    mock_redis.get.return_value = """
    {
        "room_id": "test",
        "phase": "WAITING",
        "players": {
            "p1": {"id": "p1", "nickname": "Alice", "role": null, "is_alive": true, "is_admin": true},
            "p2": {"id": "p2", "nickname": "Bob", "role": null, "is_alive": true, "is_admin": false}
        },
        "settings": {"role_distribution": {"WEREWOLF": 1}, "phase_duration_seconds": 60},
        "turn_count": 0,
        "winners": null,
        "seer_reveals": {},
        "voted_out_this_round": null
    }
    """

    service = GameService()
    new_settings = GameSettingsSchema(
        role_distribution={RoleType.WEREWOLF: 2},
        phase_duration_seconds=90
    )

    with pytest.raises(ValueError, match="Only admin can update settings"):
        await service.update_settings("test", "p2", new_settings)
