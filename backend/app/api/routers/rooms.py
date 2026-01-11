from fastapi import APIRouter, Depends, HTTPException

from app.schemas.game import (
    ActionRequest,
    CreateRoomRequest,
    GameSettingsSchema,
    GameStateSchema,
    JoinRoomRequest,
    StartGameRequest,
)
from app.services.game_service import GameService, get_game_service
from app.services.websocket_manager import manager as websocket_manager

router = APIRouter()


@router.post("/rooms", response_model=GameStateSchema)
async def create_room(request: CreateRoomRequest, service: GameService = Depends(get_game_service)):
    # Default settings for now
    # Default settings for now
    settings = request.settings or GameSettingsSchema()
    return await service.create_room(settings)


@router.get("/rooms/{room_id}", response_model=GameStateSchema)
async def get_room(
    room_id: str,
    player_id: str | None = None,
    service: GameService = Depends(get_game_service),
):
    game = await service.get_game(room_id)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    # Return filtered view if player_id provided
    if player_id:
        return await service.get_player_view(game, player_id)
    return game.to_schema()


@router.post("/rooms/{room_id}/join", response_model=GameStateSchema)
async def join_room(
    room_id: str,
    request: JoinRoomRequest,
    service: GameService = Depends(get_game_service),
):
    try:
        result = await service.join_room(room_id, request.nickname, request.player_id)
        if not result:
            raise HTTPException(status_code=404, detail="Room not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/rooms/{room_id}/start", response_model=GameStateSchema)
async def start_game(
    room_id: str,
    request: StartGameRequest,
    service: GameService = Depends(get_game_service),
):
    try:
        return await service.start_game(room_id, request.player_id, request.settings)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/rooms/{room_id}/action", response_model=GameStateSchema)
async def submit_action(
    room_id: str,
    request: ActionRequest,
    player_id: str,
    service: GameService = Depends(get_game_service),
):
    game = await service.submit_action(room_id, player_id, request.action_type, request.target_id)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")

    # Broadcast update
    await websocket_manager.broadcast_game_state(room_id, game)
    return game


@router.post("/rooms/{room_id}/end", response_model=GameStateSchema)
async def end_game(
    room_id: str,
    request: StartGameRequest,  # Reuse schema for player_id
    service: GameService = Depends(get_game_service),
):
    try:
        game_state = await service.end_game(room_id, request.player_id)
        if not game_state:
            raise HTTPException(status_code=404, detail="Room not found")

        await websocket_manager.broadcast_game_state(room_id, game_state)
        return game_state
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
