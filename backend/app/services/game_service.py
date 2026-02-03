import logging
import uuid

from app.core.redis import RedisClient
from app.models.game import Game
from app.schemas.game import (
    GamePhase,
    GameSettingsSchema,
    GameStateSchema,
)

logger = logging.getLogger(__name__)


class GameService:
    async def _save_game(self, game: Game):
        redis = RedisClient.get_client()
        key = f"game:{game.room_id}"
        await redis.set(key, game.to_json(), ex=3600)  # Expire in 1 hour

    async def get_game(self, room_id: str) -> Game | None:
        redis = RedisClient.get_client()
        key = f"game:{room_id}"
        data = await redis.get(key)
        if not data:
            return None
        return Game.from_json(data)

    async def get_all_player_presence(self, room_id: str, player_ids: list[str]) -> dict[str, bool]:
        """Fetch presence for multiple players."""
        if not player_ids:
            return {}

        redis = RedisClient.get_client()
        presence_keys = [f"presence:{room_id}:{pid}" for pid in player_ids]
        presence_results = await redis.mget(presence_keys)

        return {pid: presence_results[i] is not None for i, pid in enumerate(player_ids)}

    async def get_player_view(
        self,
        game: Game,
        player_id: str,
        presence_map: dict[str, bool] | None = None,
        full_schema: GameStateSchema | None = None,
    ) -> GameStateSchema:
        """Return game state with other players' roles hidden unless revealed."""
        # Delegate logic to model
        view = game.get_view_for_player(player_id, full_schema=full_schema)
        player_ids = list(view.players.keys())

        # Optimize: if no players, skip redis
        if not player_ids:
            return view

        if presence_map is None:
            # Check presence in Redis for all players
            redis = RedisClient.get_client()
            presence_keys = [f"presence:{game.room_id}:{pid}" for pid in player_ids]
            presence_results = await redis.mget(presence_keys)

            # Update is_online status
            for i, pid in enumerate(player_ids):
                is_online = presence_results[i] is not None
                if pid in view.players:
                    view.players[pid].is_online = is_online
        else:
            # Use provided presence map
            for pid in player_ids:
                if pid in view.players:
                    view.players[pid].is_online = presence_map.get(pid, False)

        return view

    async def create_room(self, settings: GameSettingsSchema) -> GameStateSchema:
        room_id = str(uuid.uuid4())[:8]
        game = Game.create(room_id, settings)
        game.auto_balance_roles()
        await self._save_game(game)
        return game.to_schema()

    async def join_room(
        self, room_id: str, nickname: str, player_id: str | None = None
    ) -> GameStateSchema | None:
        async with RedisClient.get_client().lock(f"game:{room_id}:lock", timeout=5):
            game = await self.get_game(room_id)
            if not game:
                return None

            # Check for duplicate nickname
            for p in game.players.values():
                if p.nickname.lower() == nickname.lower():
                    raise ValueError("Nickname already taken")

            pid = player_id or str(uuid.uuid4())
            is_admin = len(game.players) == 0
            game.add_player(pid, nickname, is_admin)

            if game.phase == GamePhase.WAITING:
                game.auto_balance_roles()

            await self._save_game(game)
            return game.to_schema()

    async def update_settings(
        self, room_id: str, player_id: str, settings: GameSettingsSchema
    ) -> GameStateSchema | None:
        async with RedisClient.get_client().lock(f"game:{room_id}:lock", timeout=5):
            game = await self.get_game(room_id)
            if not game:
                return None

            player = game.players.get(player_id)
            if not player or not player.is_admin:
                raise ValueError("Only admin can update settings")

            game._state.settings = settings
            await self._save_game(game)
            return game.to_schema()

    async def start_game(
        self, room_id: str, player_id: str, settings: GameSettingsSchema | None = None
    ) -> GameStateSchema | None:
        async with RedisClient.get_client().lock(f"game:{room_id}:lock", timeout=5):
            game = await self.get_game(room_id)
            if not game:
                return None

            player = game.players.get(player_id)
            if not player or not player.is_admin:
                raise ValueError("Only admin can start the game")

            if settings:
                game._state.settings = settings

            # Validate role count
            total_roles = (
                sum(settings.role_distribution.values())
                if settings
                else sum(game.settings.role_distribution.values())
            )
            if total_roles != len(game.players):
                raise ValueError(
                    f"Role count ({total_roles}) must match player count ({len(game.players)})"
                )

            game.start_game()
            await self._save_game(game)
            return game.to_schema()

    async def submit_action(
        self,
        room_id: str,
        player_id: str,
        action_type: str,
        target_id: str | None,
        confirmed: bool = True,
    ) -> GameStateSchema | None:
        """Submit a night action (KILL, SAVE, CHECK)."""
        async with RedisClient.get_client().lock(f"game:{room_id}:lock", timeout=5):
            game = await self.get_game(room_id)
            if not game:
                return None

            if not target_id:
                raise ValueError("Action requires a target")

            game.process_action(
                player_id,
                {"action_type": action_type, "target_id": target_id, "confirmed": confirmed},
            )
            game.check_and_advance()

            await self._save_game(game)
            return game.to_schema()

    async def submit_vote(
        self, room_id: str, player_id: str, target_id: str
    ) -> GameStateSchema | None:
        """Submit a day vote."""
        async with RedisClient.get_client().lock(f"game:{room_id}:lock", timeout=5):
            game = await self.get_game(room_id)
            if not game:
                return None

            if game.phase != GamePhase.DAY:
                raise ValueError("Can only vote during day phase")

            game.process_action(player_id, {"target_id": target_id})
            game.check_and_advance()

            await self._save_game(game)
            return game.to_schema()

    async def end_game(self, room_id: str, player_id: str) -> GameStateSchema | None:
        game = await self.get_game(room_id)
        if not game:
            return None

        player = game.players.get(player_id)
        if not player or not player.is_admin:
            raise ValueError("Only admin can end the game")

        game.winners = "CANCELLED"
        game.transition_to(GamePhase.GAME_OVER)
        await self._save_game(game)
        return game.to_schema()

    async def kick_player(
        self, room_id: str, player_id: str, target_id: str
    ) -> GameStateSchema | None:
        async with RedisClient.get_client().lock(f"game:{room_id}:lock", timeout=5):
            game = await self.get_game(room_id)
            if not game:
                return None

            player = game.players.get(player_id)
            if not player or not player.is_admin:
                raise ValueError("Only admin can kick players")

            if game.phase not in [GamePhase.WAITING, GamePhase.GAME_OVER]:
                raise ValueError("Cannot kick players while game is in progress")

            if target_id not in game.players:
                raise ValueError("Player not found")

            if target_id == player_id:
                raise ValueError("Cannot kick yourself")

            game.remove_player(target_id)
            if game.phase == GamePhase.WAITING:
                game.auto_balance_roles()
            await self._save_game(game)
            return game.to_schema()

    async def restart_game(self, room_id: str, player_id: str) -> GameStateSchema | None:
        async with RedisClient.get_client().lock(f"game:{room_id}:lock", timeout=5):
            game = await self.get_game(room_id)
            if not game:
                return None

            player = game.players.get(player_id)
            if not player or not player.is_admin:
                raise ValueError("Only admin can restart the game")

            game.restart()
            await self._save_game(game)
            return game.to_schema()


# Dependency for FastAPI
def get_game_service() -> GameService:
    return GameService()
