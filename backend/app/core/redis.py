from redis.asyncio import Redis, from_url


class RedisClient:
    _client: Redis | None = None

    @classmethod
    def get_client(cls) -> Redis:
        if cls._client is None:
            raise Exception("Redis client not initialized")
        return cls._client

    @classmethod
    async def connect(cls, url: str):
        cls._client = from_url(url, encoding="utf-8", decode_responses=True)
        if cls._client:
            # Cast to Any to satisfy pyright if stubs are confusing async/sync
            await cls._client.ping()  # type: ignore

    @classmethod
    async def close(cls):
        if cls._client:
            await cls._client.close()
            cls._client = None
