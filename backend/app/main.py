from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import rooms, websocket
from app.core.config import settings
from app.core.redis import RedisClient


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup: Connect to Redis
    print("Starting up...")
    try:
        await RedisClient.connect(settings.REDIS_URL)
        print("Redis connected successfully.")
    except Exception as e:
        print(f"Failed to connect to Redis: {e}")
        # Make it fatal or warn? For now let it crash if Redis is critical
        raise e

    yield

    # Shutdown: Disconnect
    print("Shutting down...")
    await RedisClient.close()


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(rooms.router, prefix="/api", tags=["rooms"])
app.include_router(websocket.router, tags=["websocket"])


@app.get("/")
async def root():
    return {"message": "Werewolf API is running"}
