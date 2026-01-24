export const GAME_STATE_QUERY_KEY = 'gameState';

export const getGameStateQueryKey = (roomId: string | null, playerId?: string | null) => {
  return [GAME_STATE_QUERY_KEY, roomId, playerId];
};
