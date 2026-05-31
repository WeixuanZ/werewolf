import { useEffect, useState, useRef } from 'react';
import { Typography, theme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { GamePhase, RoleType, NightActionType } from '../../types';
import type { GameState } from '../../types';

const { Title, Text } = Typography;

interface PhaseTransitionOverlayProps {
  gameState: GameState;
}

interface Announcement {
  title: string;
  subtitle: string;
  color?: string;
  type: 'morning' | 'execution' | 'gameover' | 'generic';
}

export const PhaseTransitionOverlay = ({ gameState }: PhaseTransitionOverlayProps) => {
  const { token } = theme.useToken();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const prevPhase = useRef<GamePhase>(gameState.phase);
  const prevPlayers = useRef(gameState.players);

  // Timer refs to allow persistent animation across re-renders (like player updates)
  const startTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const clearAllTimers = () => {
    if (startTimerRef.current !== null) clearTimeout(startTimerRef.current);
    if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    if (cleanupTimerRef.current !== null) clearTimeout(cleanupTimerRef.current);
  };

  const dismiss = () => {
    setIsVisible(false);
    // Cleanup content after fade out transition
    if (cleanupTimerRef.current !== null) clearTimeout(cleanupTimerRef.current);
    cleanupTimerRef.current = setTimeout(() => setAnnouncement(null), 1000);
  };

  // Sync refs to current state but keep them for comparison in effect
  // We use a single effect to handle transitions
  useEffect(() => {
    const currentPhase = gameState.phase;
    const previous = prevPhase.current;
    const previousPlayers = prevPlayers.current;

    // Always update refs for the next run to avoid re-triggering logic
    // on incidental state changes (like player online/offline status)
    prevPhase.current = currentPhase;
    prevPlayers.current = gameState.players;

    // Skip if phase hasn't changed
    if (previous === currentPhase) {
      return;
    }

    let nextAnnouncement: Announcement | null = null;

    // NIGHT -> DAY (Morning)
    if (previous === GamePhase.NIGHT && currentPhase === GamePhase.DAY) {
      const newlyDead = Object.values(gameState.players).filter(
        (p) => previousPlayers[p.id]?.is_alive && !p.is_alive,
      );
      const deadNames = newlyDead.map((p) => p.nickname).join(', ');

      // Check Witch actions in previous state
      const witch = Object.values(prevPlayers.current).find((p) => p.role === RoleType.WITCH);
      let witchActionText = '';
      if (witch && witch.night_action_confirmed) {
        if (witch.night_action_type === NightActionType.HEAL) {
          witchActionText = ' The Witch used her healing potion!';
        } else if (witch.night_action_type === NightActionType.POISON) {
          witchActionText = ' The Witch used her poison!';
        }
      }

      // Check Hunter night revenge
      const deadHunter = newlyDead.find((p) => p.role === RoleType.HUNTER);
      let hunterActionText = '';
      if (deadHunter) {
        const hunterPrevState = prevPlayers.current[deadHunter.id];
        if (
          hunterPrevState &&
          hunterPrevState.night_action_type === NightActionType.REVENGE &&
          hunterPrevState.night_action_target
        ) {
          const revengeTarget = gameState.players[hunterPrevState.night_action_target];
          if (
            revengeTarget &&
            !revengeTarget.is_alive &&
            prevPlayers.current[revengeTarget.id]?.is_alive
          ) {
            hunterActionText = ` ${deadHunter.nickname} took ${revengeTarget.nickname} down with them!`;
          }
        }
      }

      nextAnnouncement = {
        title: 'Morning Breaks',
        subtitle:
          newlyDead.length > 0
            ? `...and ${deadNames} was found dead.${witchActionText}${hunterActionText}`
            : `...and it was a peaceful night.${witchActionText}`,
        color: newlyDead.length > 0 ? '#ff4d4f' : '#52c41a', // Red or Green
        type: 'morning',
      };
    }
    // DAY/VOTING -> NIGHT or HUNTER_REVENGE (Execution)
    else if (
      (previous === GamePhase.DAY || previous === GamePhase.VOTING) &&
      currentPhase !== GamePhase.DAY &&
      currentPhase !== GamePhase.VOTING &&
      currentPhase !== GamePhase.WAITING &&
      currentPhase !== GamePhase.GAME_OVER
    ) {
      const victimId = gameState.voted_out_this_round;
      const victim = victimId ? gameState.players[victimId] : null;
      const isHunter = victim?.role === RoleType.HUNTER;

      nextAnnouncement = {
        title: isHunter ? "The Hunter's Last Stand" : 'The Village Has Spoken',
        subtitle: victim
          ? `${victim.nickname} was executed.${isHunter ? ' They are taking someone with them!' : ''}`
          : 'No one was executed.',
        color: victim ? '#ff4d4f' : '#bfbfbf',
        type: 'execution',
      };
    }
    // HUNTER_REVENGE -> NIGHT (Hunter revenge resolution)
    else if (previous === GamePhase.HUNTER_REVENGE && currentPhase === GamePhase.NIGHT) {
      const hunterId = gameState.voted_out_this_round;
      const hunter = hunterId ? gameState.players[hunterId] : null;
      const victimId = hunter?.hunter_revenge_target;
      const victim = victimId ? gameState.players[victimId] : null;

      nextAnnouncement = {
        title: "Revenge Served",
        subtitle: (hunter && victim)
          ? `${hunter.nickname} shot ${victim.nickname}!`
          : "The hunter's shot missed.",
        color: '#ff4d4f',
        type: 'generic',
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
      clearAllTimers();

      // Trigger sequence - wrap in timeout to avoid set-state-in-effect warning
      // and ensure clean animation start
      startTimerRef.current = setTimeout(() => {
        setAnnouncement(nextAnnouncement);
        setIsVisible(true);
      }, 100);

      // Hide everything after duration
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        // Cleanup content after fade out
        cleanupTimerRef.current = setTimeout(() => setAnnouncement(null), 1000);
      }, 6000);
    }
  }, [gameState.phase, gameState.players, gameState.voted_out_this_round, gameState.winners]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  return (
    <AnimatePresence>
      {isVisible && announcement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          onClick={dismiss}
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
            pointerEvents: 'auto',
            cursor: 'pointer',
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
                }}
              >
                {announcement.subtitle}
              </Text>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
