import { useEffect, useState, useRef } from 'react';
import { Typography, theme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { GamePhase } from '../../types';
import type { GameState } from '../../types';

const { Title, Text } = Typography;

interface PhaseTransitionOverlayProps {
  gameState: GameState;
}

interface VoteBreakdown {
  targetNickname: string;
  voterNicknames: string[];
}

interface Announcement {
  title: string;
  subtitle: string;
  color?: string;
  type: 'morning' | 'execution' | 'gameover' | 'generic';
  voteBreakdown?: VoteBreakdown[];
}

export const PhaseTransitionOverlay = ({ gameState }: PhaseTransitionOverlayProps) => {
  const { token } = theme.useToken();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const prevPhase = useRef<GamePhase>(gameState.phase);
  const prevPlayers = useRef(gameState.players);

  // Sync refs to current state but keep them for comparison in effect
  // We use a single effect to handle transitions
  useEffect(() => {
    const currentPhase = gameState.phase;
    const previous = prevPhase.current;

    // Skip if phase hasn't changed
    if (previous === currentPhase) {
      prevPlayers.current = gameState.players;
      return;
    }

    let nextAnnouncement: Announcement | null = null;

    // NIGHT -> DAY (Morning)
    if (previous === GamePhase.NIGHT && currentPhase === GamePhase.DAY) {
      const newlyDead = Object.values(gameState.players).filter(
        (p) => prevPlayers.current[p.id]?.is_alive && !p.is_alive,
      );
      const deadNames = newlyDead.map((p) => p.nickname).join(', ');

      nextAnnouncement = {
        title: 'Morning Breaks',
        subtitle:
          newlyDead.length > 0
            ? `...and ${deadNames} was found dead.`
            : '...and it was a peaceful night.',
        color: newlyDead.length > 0 ? '#ff4d4f' : '#52c41a', // Red or Green
        type: 'morning',
      };
    }
    // DAY -> NIGHT (Execution)
    else if (
      previous === GamePhase.DAY &&
      currentPhase !== GamePhase.DAY &&
      currentPhase !== GamePhase.WAITING &&
      currentPhase !== GamePhase.GAME_OVER
    ) {
      const victimId = gameState.voted_out_this_round;
      const victim = victimId ? gameState.players[victimId] : null;

      // Group votes by target. Vote data persists into the start of the next phase.
      const votesByTarget: Record<string, string[]> = {};
      Object.values(gameState.players).forEach((p) => {
        if (p.vote_target) {
          const target = gameState.players[p.vote_target];
          if (target) {
            if (!votesByTarget[target.nickname]) {
              votesByTarget[target.nickname] = [];
            }
            votesByTarget[target.nickname].push(p.nickname);
          }
        }
      });

      const breakdown = Object.entries(votesByTarget)
        .map(([targetNickname, voterNicknames]) => ({
          targetNickname,
          voterNicknames,
        }))
        .sort((a, b) => b.voterNicknames.length - a.voterNicknames.length);

      nextAnnouncement = {
        title: 'The Village Has Spoken',
        subtitle: victim ? `${victim.nickname} was executed.` : 'No one was executed.',
        color: victim ? '#ff4d4f' : '#bfbfbf',
        type: 'execution',
        voteBreakdown: breakdown,
      };
    }
    // GAME OVER
    else if (currentPhase === GamePhase.GAME_OVER) {
      const winners = gameState.winners;
      let winTitle = 'Game Over';
      let winColor = '#faad14'; // Default Gold

      if (winners === 'WEREWOLVES') {
        winTitle = 'Werewolves Win!';
        winColor = '#ff4d4f';
      } else if (winners === 'VILLAGERS') {
        winTitle = 'Villagers Win!';
        winColor = '#52c41a';
      } else if (winners === 'LOVERS') {
        winTitle = 'Lovers Win!';
        winColor = '#eb2f96';
      } else if (winners === 'TANNER') {
        winTitle = 'Tanner Wins!';
        winColor = '#faad14';
      }

      nextAnnouncement = {
        title: winTitle.toUpperCase(),
        subtitle: 'The game has ended.',
        color: winColor,
        type: 'gameover',
      };
    }

    // specific transition for Hunter/Witch triggers could be added here if needed

    if (nextAnnouncement) {
      // Trigger sequence - wrap in timeout to avoid set-state-in-effect warning
      // and ensure clean animation start
      const startTimer = setTimeout(() => {
        setAnnouncement(nextAnnouncement);
        setIsVisible(true);
      }, 100);

      // Hide everything after duration
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        // Cleanup content after fade out
        setTimeout(() => setAnnouncement(null), 1000);
      }, 6000);

      return () => {
        clearTimeout(startTimer);
        clearTimeout(hideTimer);
      };
    }

    prevPhase.current = currentPhase;
    prevPlayers.current = gameState.players;
  }, [gameState.phase, gameState.players, gameState.voted_out_this_round, gameState.winners]);

  return (
    <AnimatePresence>
      {isVisible && announcement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            // Deep radial gradient for drama
            background:
              'radial-gradient(circle at center, rgba(30,30,40,0.95) 0%, rgba(10,10,15,0.98) 100%)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ textAlign: 'center', padding: '0 20px', maxWidth: '800px' }}>
            {/* Title Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 1.1, y: -20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <Title
                level={1}
                style={{
                  color: '#fff',
                  fontSize: 'min(4rem, 10vw)',
                  fontWeight: 800,
                  margin: 0,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  textShadow: '0 4px 30px rgba(0,0,0,0.5)',
                  marginBottom: '2rem',
                }}
              >
                {announcement.title}
              </Title>
            </motion.div>

            {/* Separator Line */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 120, opacity: 1 }}
              transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
              style={{
                height: 4,
                background: announcement.color || token.colorPrimary,
                margin: '0 auto 2rem',
                borderRadius: 2,
                boxShadow: `0 0 20px ${announcement.color || token.colorPrimary}`,
              }}
            />

            {/* Subtitle Animation */}
            <motion.div
              initial={{ opacity: 0, y: 30, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
            >
              <Text
                style={{
                  color: announcement.color ? `${announcement.color}dd` : '#ffffffdd',
                  fontSize: 'min(2rem, 6vw)',
                  fontWeight: 500,
                  display: 'block',
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                  marginBottom: announcement.voteBreakdown ? '2rem' : 0,
                }}
              >
                {announcement.subtitle}
              </Text>
            </motion.div>

            {/* Vote Breakdown Animation */}
            {announcement.voteBreakdown && announcement.voteBreakdown.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  marginTop: '2rem',
                  maxHeight: '40vh',
                  overflowY: 'auto',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: token.borderRadiusLG,
                  border: `1px solid ${token.colorBorder}`,
                  width: 'min(95vw, 600px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                }}
              >
                {announcement.voteBreakdown.map((vote, idx) => {
                  const isVictim = vote.targetNickname === (gameState.voted_out_this_round ? gameState.players[gameState.voted_out_this_round]?.nickname : '');
                  return (
                    <motion.div
                      key={vote.targetNickname}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.4 + idx * 0.1 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        background: isVictim ? 'rgba(255, 77, 79, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        borderRadius: token.borderRadius,
                        border: `1px solid ${isVictim ? 'rgba(255, 77, 79, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          color: isVictim ? '#ff4d4f' : token.colorText,
                          fontSize: '1rem',
                          width: '100px',
                          textAlign: 'left',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {vote.targetNickname}
                      </div>

                      <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ color: 'rgba(255, 255, 255, 0.25)', fontSize: '0.7rem', fontWeight: 800 }}>
                          BY
                        </div>
                        <div style={{
                          textAlign: 'left',
                          color: token.colorTextSecondary,
                          fontSize: '0.9rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {vote.voterNicknames.join(', ')}
                        </div>
                      </div>

                      <div style={{
                        background: isVictim ? '#ff4d4f' : token.colorPrimary,
                        color: '#fff',
                        padding: '2px 10px',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        minWidth: '32px',
                        textAlign: 'center',
                        boxShadow: isVictim ? '0 0 12px rgba(255, 77, 79, 0.3)' : 'none',
                      }}>
                        {vote.voterNicknames.length}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
