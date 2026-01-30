import { useParams } from '@tanstack/react-router';
import { useCurrentSessionValue } from '../../store/gameStore';
import { useGameState } from '../../hooks/useGameState';
import { GamePhase, RoleType } from '../../types';
import { DayBackground } from './DayBackground';
import { NightBackground } from './NightBackground';
import { WerewolfBackground } from './WerewolfBackground';

export const DynamicBackground = () => {
  const { roomId } = useParams({ strict: false }) as { roomId?: string };
  const session = useCurrentSessionValue();
  const playerId = session?.playerId;

  const { data: gameState } = useGameState(roomId || null, playerId, {
    enabled: !!roomId,
    staleTime: Infinity,
  });

  const phase = gameState?.phase;

  if (!roomId) {
    return <WerewolfBackground />;
  }

  // Fallback to WerewolfBackground if phase is undefined (loading)
  if (!phase) {
    return <WerewolfBackground />;
  }

  switch (phase) {
    case GamePhase.DAY:
    case GamePhase.VOTING:
      return <DayBackground />;

    case GamePhase.NIGHT:
      return <NightBackground />;

    case GamePhase.GAME_OVER: {
      const winners = gameState?.winners;
      const playerRole = gameState?.players?.[playerId ?? '']?.role;
      const isWerewolf = playerRole === RoleType.WEREWOLF;
      const playerWon =
        (isWerewolf && winners === 'WEREWOLVES') || (!isWerewolf && winners === 'VILLAGERS');
      const tintColor = playerWon ? 'rgba(46, 125, 50, 0.2)' : 'rgba(198, 40, 40, 0.2)';

      return (
        <>
          <WerewolfBackground />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: tintColor,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        </>
      );
    }

    case GamePhase.WAITING:
    default:
      return <WerewolfBackground />;
  }
};
