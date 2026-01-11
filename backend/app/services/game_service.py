import uuid

from app.core.redis import RedisClient
from app.models.game import Game
from app.models.player import Player
from app.schemas.game import (
    GamePhase,
    GameSettingsSchema,
    GameStateSchema,
    PlayerSchema,
    RoleType,
)


class GameService:
    async def _save_game(self, game: Game):
        redis = RedisClient.get_client()
        key = f"game:{game.room_id}"
        data = game.to_schema().model_dump_json()
        await redis.set(key, data, ex=3600)  # Expire in 1 hour

    async def get_game(self, room_id: str) -> Game | None:
        redis = RedisClient.get_client()
        key = f"game:{room_id}"
        data = await redis.get(key)
        if not data:
            return None

        # Parse JSON manually or let Pydantic do it?
        # model_validate_json is cleaner
        schema = GameStateSchema.model_validate_json(data)
        return Game.from_schema(schema)

    async def get_player_view(self, game: Game, player_id: str) -> GameStateSchema:
        """Return game state with other players' roles hidden unless revealed."""
        full_schema = game.to_schema()
        is_game_over = full_schema.phase == GamePhase.GAME_OVER

        # Get list of players this player has revealed (via Seer CHECK)
        # Only players with the SEER role should have a list of revealed players.
        requesting_player = game.players.get(player_id)
        is_seer = (
            requesting_player
            and requesting_player.role
            and requesting_player.role.role_type == RoleType.SEER
        )
        revealed_to_me = set(game.seer_reveals.get(player_id, [])) if is_seer else set()

        # Check presence in Redis for all players
        redis = RedisClient.get_client()
        player_ids = list(full_schema.players.keys())
        presence_keys = [f"presence:{game.room_id}:{pid}" for pid in player_ids]
        presence_results = await redis.mget(presence_keys)
        online_map = {pid: presence_results[i] is not None for i, pid in enumerate(player_ids)}

        filtered_players = {}
        for pid, p in full_schema.players.items():
            # Show role if: own role, game over, Seer revealed, or player is dead
            show_role = pid == player_id or is_game_over or pid in revealed_to_me or not p.is_alive
            filtered_players[pid] = PlayerSchema(
                id=p.id,
                nickname=p.nickname,
                role=p.role if show_role else None,
                is_alive=p.is_alive,
                is_admin=p.is_admin,
                is_online=online_map.get(pid, False),
            )

        full_schema.players = filtered_players
        full_schema.night_actions = []
        full_schema.seer_reveals = {}  # Don't expose reveal map to client
        return full_schema

    async def create_room(self, settings: GameSettingsSchema) -> GameStateSchema:
        room_id = str(uuid.uuid4())[:8]
        game = Game(room_id, settings)

        # Room is created empty
        await self._save_game(game)
        return game.to_schema()

    async def join_room(
        self, room_id: str, nickname: str, player_id: str | None = None
    ) -> GameStateSchema | None:
        redis = RedisClient.get_client()
        lock_key = f"game:{room_id}:lock"

        # Acquire lock to prevent race condition on first join (admin assignment)
        async with redis.lock(lock_key, timeout=5):
            game = await self.get_game(room_id)
            if not game:
                return None

            # Re-attach if player_id exists
            if player_id and player_id in game.players:
                return game.to_schema()

            # Check for duplicate nickname
            if any(p.nickname == nickname for p in game.players.values()):
                raise ValueError(f"Nickname '{nickname}' already taken in this room")

            # First player becomes admin
            is_admin = len(game.players) == 0

            player = Player(id=player_id or str(uuid.uuid4()), nickname=nickname, is_admin=is_admin)
            game.add_player(player)

            await self._save_game(game)
            return game.to_schema()

    async def start_game(
        self,
        room_id: str,
        player_id: str,
        settings: GameSettingsSchema | None = None,
    ) -> GameStateSchema | None:
        game = await self.get_game(room_id)
        if not game:
            return None
        # Verify admin
        player = game.players.get(player_id)
        if not player or not player.is_admin:
            raise Exception("Only admin can start game")

        if settings:
            game.settings = settings

        # Validate role count matches player count
        player_count = len(game.players)
        role_count = sum(game.settings.role_distribution.values())
        if role_count != player_count:
            raise ValueError(f"Role count ({role_count}) must equal player count ({player_count})")

        game.start_game()
        game.phase = GamePhase.NIGHT

        await self._save_game(game)
        return game.to_schema()

    async def submit_action(
        self, room_id: str, player_id: str, action_type: str, target_id: str | None
    ) -> GameStateSchema | None:
        async with RedisClient.get_client().lock(f"game:{room_id}:lock", timeout=5):
            game = await self.get_game(room_id)
            if not game:
                return None

            # Validate action
            if not target_id:
                raise ValueError("Action requires a target")

            game.process_night_action(action_type, target_id, player_id)

            # Check if all living roles with actions have acted
            await self._check_phase_completion(game)

            await self._save_game(game)
            return game.to_schema()

    async def _check_phase_completion(self, game: Game):
        # Determine expected actors (Alive Werewolves, Seer, Doctor)
        # This is a simplified check. Real games have complex turns or timers.
        expected_actors = []
        for p in game.players.values():
            if not p.is_alive or not p.role:
                continue
            if p.role.role_type in [RoleType.WEREWOLF, RoleType.SEER, RoleType.DOCTOR]:
                expected_actors.append(p.id)

        acted_ids = {a["actor_id"] for a in game.night_actions}

        # If all expected actors have acted, resolve phase
        if set(expected_actors).issubset(acted_ids):
            game.resolve_night_phase()

    async def end_game(self, room_id: str, player_id: str) -> GameStateSchema | None:
        game = await self.get_game(room_id)
        if not game:
            return None

        player = game.players.get(player_id)
        if not player or not player.is_admin:
            raise Exception("Only admin can end game")

        game.phase = GamePhase.GAME_OVER

        await self._save_game(game)
        return game.to_schema()


_service = GameService()


def get_game_service():
    return _service
