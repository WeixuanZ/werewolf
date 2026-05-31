import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routers import rooms, websocket
from app.api.routers.websocket import start_heartbeat_loop, stop_heartbeat_loop
from app.core.config import settings
from app.core.exceptions import GameLogicError
from app.core.redis import RedisClient

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Starting up...")
    await RedisClient.connect(settings.REDIS_URL)
    logger.info("Redis connected.")
    start_heartbeat_loop()
    try:
        yield
    finally:
        logger.info("Shutting down...")
        await stop_heartbeat_loop()
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


@app.exception_handler(GameLogicError)
async def game_logic_exception_handler(_request: Request, exc: GameLogicError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/api/version")
async def version_info() -> dict[str, str]:
    return {"version": settings.VERSION, "commit_sha": settings.COMMIT_SHA}


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": "Werewolf API is running",
        "version": settings.VERSION,
        "commit_sha": settings.COMMIT_SHA,
    }
