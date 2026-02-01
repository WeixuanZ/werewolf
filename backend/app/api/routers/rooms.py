from fastapi import APIRouter, Depends, HTTPException

from app.schemas.game import (
    ActionRequest,
    CreateRoomRequest,
    GameSettingsSchema,
    GameStateSchema,
    JoinRoomRequest,
    KickPlayerRequest,
    PlayerIdRequest,
    StartGameRequest,
    VoteRequest,
)
from app.services.game_service import GameService, get_game_service
from app.services.websocket_manager import manager as websocket_manager

router = APIRouter()


async def broadcast_filtered_states(room_id: str, service: GameService):
    """Helper to broadcast player-specific filtered game states."""
    game = await service.get_game(room_id)
    if not game:
        return

    # Optimization: Generate full schema once
    full_schema = game.to_schema()

    async def get_view(player_id: str):
        return await service.get_player_view(game, player_id, full_schema=full_schema)

    await websocket_manager.broadcast_filtered_game_states(room_id, get_view)


@router.post("/rooms", response_model=GameStateSchema)
async def create_room(request: CreateRoomRequest, service: GameService = Depends(get_game_service)):
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

        # Broadcast filtered state to all players
        await broadcast_filtered_states(room_id, service)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/rooms/{room_id}/settings", response_model=GameStateSchema)
async def update_settings(
    room_id: str,
    settings: GameSettingsSchema,
    player_id: str,
    service: GameService = Depends(get_game_service),
):
    try:
        result = await service.update_settings(room_id, player_id, settings)
        if not result:
            raise HTTPException(status_code=404, detail="Room not found")

        # Broadcast filtered state
        await broadcast_filtered_states(room_id, service)
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
        result = await service.start_game(room_id, request.player_id, request.settings)
        if not result:
            raise HTTPException(status_code=404, detail="Room not found")

        # Broadcast filtered state to each player (each sees their own role only)
        await broadcast_filtered_states(room_id, service)

        # Return filtered view for the admin
        game = await service.get_game(room_id)
        if game:
            return await service.get_player_view(game, request.player_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/rooms/{room_id}/action", response_model=GameStateSchema)
async def submit_action(
    room_id: str,
    request: ActionRequest,
    player_id: str,
    service: GameService = Depends(get_game_service),
):
    try:
        result = await service.submit_action(
            room_id,
            player_id,
            request.action_type,
            request.target_id,
            request.confirmed,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Room not found")

        # Broadcast filtered state (includes phase transitions, reveals)
        await broadcast_filtered_states(room_id, service)

        # Return the player's own filtered view
        game = await service.get_game(room_id)
        if game:
            return await service.get_player_view(game, player_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/rooms/{room_id}/vote", response_model=GameStateSchema)
async def submit_vote(
    room_id: str,
    request: VoteRequest,
    player_id: str,
    service: GameService = Depends(get_game_service),
):
    try:
        result = await service.submit_vote(room_id, player_id, request.target_id)
        if not result:
            raise HTTPException(status_code=404, detail="Room not found")

        # Broadcast filtered state
        await broadcast_filtered_states(room_id, service)

        game = await service.get_game(room_id)
        if game:
            return await service.get_player_view(game, player_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/rooms/{room_id}/end", response_model=GameStateSchema)
async def end_game(
    room_id: str,
    request: PlayerIdRequest,
    service: GameService = Depends(get_game_service),
):
    try:
        game_state = await service.end_game(room_id, request.player_id)
        if not game_state:
            raise HTTPException(status_code=404, detail="Room not found")

        # Broadcast filtered state
        await broadcast_filtered_states(room_id, service)
        return game_state
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/rooms/{room_id}/restart", response_model=GameStateSchema)
async def restart_game(
    room_id: str,
    request: PlayerIdRequest,
    service: GameService = Depends(get_game_service),
):
    try:
        game_state = await service.restart_game(room_id, request.player_id)
        if not game_state:
            raise HTTPException(status_code=404, detail="Room not found")

        # Broadcast filtered state
        await broadcast_filtered_states(room_id, service)
        return game_state
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/rooms/{room_id}/kick", response_model=GameStateSchema)
async def kick_player(
    room_id: str,
    request: KickPlayerRequest,
    service: GameService = Depends(get_game_service),
):
    try:
        game_state = await service.kick_player(room_id, request.player_id, request.target_id)
        if not game_state:
            raise HTTPException(status_code=404, detail="Room not found")

        # Broadcast filtered state
        await broadcast_filtered_states(room_id, service)
        return game_state
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/roles")
async def get_roles():
    """Get metadata for all roles including descriptions."""
    from app.models.roles import get_role_instance
    from app.schemas.game import RoleType

    roles = []
    for role_type in RoleType:
        instance = get_role_instance(role_type)
        roles.append({"type": role_type, "description": instance.get_description()})
    return roles
