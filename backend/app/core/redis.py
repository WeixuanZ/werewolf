from collections.abc import Awaitable
from typing import cast

from redis.asyncio import Redis, from_url


class RedisClient:
    """Singleton wrapper around the async Redis client used across the app."""

    _client: Redis | None = None

    @classmethod
    def get_client(cls) -> Redis:
        if cls._client is None:
            raise RuntimeError("Redis client not initialized; call RedisClient.connect first")
        return cls._client

    @classmethod
    async def connect(cls, url: str) -> None:
        client = from_url(url, encoding="utf-8", decode_responses=True)
        # redis-py's sync/async stubs collapse ping() to bool; the runtime value is a coroutine.
        await cast(Awaitable[bool], client.ping())
        cls._client = client

    @classmethod
    async def close(cls) -> None:
        if cls._client is not None:
            await cls._client.aclose()
            cls._client = None
