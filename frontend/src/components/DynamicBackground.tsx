import { useLocation } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useCurrentSessionValue } from '../store/gameStore';
import { GamePhase, type GameState } from '../types';
import {
  WerewolfBackground,
  WerewolfBackgroundForest,
  WerewolfBackgroundAbstract
} from './index';

export const DynamicBackground = () => {
  const location = useLocation();
  const session = useCurrentSessionValue();
  const pathname = location.pathname;

  // Extract roomId if we are in a room
  // Matches /room/xyz
  const roomMatch = pathname.match(/^\/room\/([^\/]+)/);
  const roomId = roomMatch ? roomMatch[1] : null;
  const playerId = session?.playerId;

  // Access game state from React Query cache
  // We don't provide a queryFn here because we expect the GameRoom component
  // to handle the actual data fetching and socket connection.
  // We just want to reactively read the current state.
  const { data: gameState } = useQuery<GameState>({
    queryKey: ['gameState', roomId, playerId],
    enabled: !!roomId, // Only check if we are in a room
    staleTime: Infinity, // Rely on cache updates from other components
  });

  const phase = gameState?.phase;

  // Determine which background to show
  // 1. Not in a room or Lobby/Waiting -> Geometric (Variant 1)
  // 2. Day/Voting -> Forest (Variant 2)
  // 3. Night -> Abstract (Variant 3)

  if (!roomId) {
    return <WerewolfBackground />;
  }

  // Fallback to Geometric if phase is undefined (loading)
  if (!phase) {
    return <WerewolfBackground />;
  }

  switch (phase) {
    case GamePhase.DAY:
    case GamePhase.VOTING:
      return <WerewolfBackgroundForest />;

    case GamePhase.NIGHT:
      return <WerewolfBackgroundAbstract />;

    case GamePhase.WAITING:
    case GamePhase.GAME_OVER:
    default:
      return <WerewolfBackground />;
  }
};
