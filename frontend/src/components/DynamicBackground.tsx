import { useParams } from '@tanstack/react-router';
import { useCurrentSessionValue } from '../store/gameStore';
import { useGameState } from '../hooks/useGameState';
import { GamePhase } from '../types';
import {
  WerewolfBackground,
  WerewolfBackgroundForest,
  WerewolfBackgroundAbstract
} from './index';

export const DynamicBackground = () => {
  const { roomId } = useParams({ strict: false }) as { roomId?: string };
  const session = useCurrentSessionValue();
  const playerId = session?.playerId;

  // Access game state from React Query cache
  // We use the shared hook but disable active fetching (staleTime: Infinity)
  // because the socket connection in GameRoom handles the updates.
  // We just want to reactively read the current state.
  const { data: gameState } = useGameState(roomId || null, playerId, {
    enabled: !!roomId,
    staleTime: Infinity,
  });

  const phase = gameState?.phase;

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
