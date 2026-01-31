import { useQuery } from '@tanstack/react-query';
import { type GameState } from '../types';
import { api } from '../api/client';
import { getGameStateQueryKey } from '../utils/queryKeys';

interface UseGameStateOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

export const useGameState = (
  roomId: string | null,
  playerId?: string | null,
  options: UseGameStateOptions = {},
) => {
  const { enabled = true, staleTime = 0, refetchOnWindowFocus = true } = options;

  return useQuery<GameState>({
    queryKey: getGameStateQueryKey(roomId, playerId),
    queryFn: () => {
      if (!roomId) throw new Error('Room ID is required');
      return api.rooms.get(roomId, playerId ?? undefined);
    },
    enabled: !!roomId && enabled,
    staleTime,
    refetchOnWindowFocus,
  });
};
