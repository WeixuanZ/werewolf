import { useEffect, useState, useRef } from 'react';
import { Typography, theme } from 'antd';
import { GamePhase } from '../../types';
import type { GameState } from '../../types';

const { Title, Text } = Typography;

interface PhaseTransitionOverlayProps {
  gameState: GameState;
}

export const PhaseTransitionOverlay = ({ gameState }: PhaseTransitionOverlayProps) => {
  const { token } = theme.useToken();
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState<'intro' | 'reveal' | 'outro'>('intro');
  const [content, setContent] = useState<{
    title: string;
    subtitle: string;
    color?: string;
  } | null>(null);
  const [activeAnnouncement, setActiveAnnouncement] = useState<{
    title: string;
    subtitle: string;
    color?: string;
  } | null>(null);

  const prevPhase = useRef<GamePhase>(gameState.phase);
  const prevPlayers = useRef(gameState.players);

  // Effect 1: Detect Game State changes and queue announcements
  useEffect(() => {
    const currentPhase = gameState.phase;

    if (prevPhase.current !== currentPhase) {
      // NIGHT -> DAY (Morning Announcements)
      if (prevPhase.current === GamePhase.NIGHT && currentPhase === GamePhase.DAY) {
        const newlyDead = Object.values(gameState.players).filter(
          (p) => prevPlayers.current[p.id]?.is_alive && !p.is_alive,
        );

        const deadNames = newlyDead.map((p) => p.nickname).join(', ');

        // Defer state update to avoid synchronous setState in effect warning
        setTimeout(() => {
          setActiveAnnouncement({
            title: 'Morning Breaks...',
            subtitle:
              newlyDead.length > 0
                ? `...and ${deadNames} was found dead.`
                : '...and it was a peaceful night.',
            color: newlyDead.length > 0 ? token.colorError : token.colorSuccess,
          });
        }, 0);
      }
      // DAY -> NIGHT (Execution Announcements)
      else if (
        prevPhase.current === GamePhase.DAY &&
        currentPhase !== GamePhase.DAY &&
        currentPhase !== GamePhase.WAITING &&
        currentPhase !== GamePhase.GAME_OVER
      ) {
        const victimId = gameState.voted_out_this_round;
        const victim = victimId ? gameState.players[victimId] : null;

        setTimeout(() => {
          setActiveAnnouncement({
            title: 'The Village Has Spoken',
            subtitle: victim ? `${victim.nickname} was executed.` : 'No one was executed.',
            color: victim ? token.colorError : token.colorTextSecondary,
          });
        }, 0);
      }
      // ANY -> GAME OVER
      else if (currentPhase === GamePhase.GAME_OVER) {
        const winners = gameState.winners;
        const winTitle =
          winners === 'WEREWOLVES'
            ? 'Werewolves Win!'
            : winners === 'VILLAGERS'
              ? 'Villagers Win!'
              : winners === 'LOVERS'
                ? 'Lovers Win!'
                : winners === 'TANNER'
                  ? 'Tanner Wins!'
                  : 'Game Over';

        const winColor =
          winners === 'WEREWOLVES'
            ? token.colorError
            : winners === 'VILLAGERS'
              ? token.colorSuccess
              : winners === 'LOVERS'
                ? '#eb2f96' // Hot pink for lovers
                : '#faad14'; // Gold/Yellow for others

        setTimeout(() => {
          setActiveAnnouncement({
            title: winTitle,
            subtitle: 'The game has ended.',
            color: winColor,
          });
        }, 0);
      }
    }

    prevPhase.current = currentPhase;
    prevPlayers.current = gameState.players;
  }, [
    gameState.phase,
    gameState.players,
    gameState.voted_out_this_round,
    gameState.winners,
    token.colorError,
    token.colorSuccess,
    token.colorTextSecondary,
  ]);

  // Effect 2: Handle animation sequence for active announcement
  useEffect(() => {
    if (!activeAnnouncement) return;

    // Defer state updates
    setTimeout(() => {
      setContent(activeAnnouncement);
      setStep('intro');
      setIsVisible(true);
    }, 0);

    const revealTimer = setTimeout(() => {
      setStep('reveal');
    }, 2500);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      // Clear announcement after it fades out to allow the same one to trigger again if needed (unlikely)
      // or just to clean up state
      setTimeout(() => {
        setActiveAnnouncement(null);
        setContent(null);
      }, 500);
    }, 6500);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(hideTimer);
    };
  }, [activeAnnouncement]);

  if (!isVisible || !content) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          transform: step === 'intro' ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 1s ease-out',
          marginBottom: 32,
          textAlign: 'center',
        }}
      >
        <Title
          level={1}
          style={{
            color: '#fff',
            fontSize: '3rem',
            margin: 0,
            textShadow: '0 0 20px rgba(255,255,255,0.3)',
          }}
        >
          {content.title}
        </Title>
      </div>

      <div
        style={{
          opacity: step === 'reveal' ? 1 : 0,
          transform: step === 'reveal' ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s ease-out',
          textAlign: 'center',
        }}
      >
        <Text
          style={{
            color: content.color || '#fff',
            fontSize: '2rem',
            fontWeight: 'bold',
            display: 'block',
          }}
        >
          {content.subtitle}
        </Text>
      </div>
    </div>
  );
};
