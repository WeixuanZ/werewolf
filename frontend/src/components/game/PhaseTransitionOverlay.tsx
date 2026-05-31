import { useEffect, useState, useRef } from 'react';
import { Typography, theme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { GamePhase, RoleType, NightActionType } from '../../types';
import type { GameState } from '../../types';
import { getRoleEmoji, getRoleTheme } from '../../utils/roleUtils';

const { Title, Text } = Typography;

interface PhaseTransitionOverlayProps {
  gameState: GameState;
  playerId?: string | null;
}

interface Announcement {
  title: string;
  subtitle: string;
  color?: string;
  type: 'morning' | 'execution' | 'gameover' | 'generic';
}

export const PhaseTransitionOverlay = ({
  gameState,
  playerId,
}: PhaseTransitionOverlayProps) => {
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

    // WAITING -> NIGHT (Game Start / Role Reveal)
    if (previous === GamePhase.WAITING && currentPhase === GamePhase.NIGHT) {
      const me = playerId ? gameState.players[playerId] : null;
      if (me && me.role) {
        const theme = getRoleTheme(me.role);
        nextAnnouncement = {
          title: 'YOU ARE',
          subtitle: `${getRoleEmoji(me.role)} ${me.role}`,
          color: theme.primary,
          type: 'generic',
        };
      }
    }
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

    if (nextAnnouncement) {
      clearAllTimers();

      startTimerRef.current = setTimeout(() => {
        setAnnouncement(nextAnnouncement);
        setIsVisible(true);
      }, 100);

      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        cleanupTimerRef.current = setTimeout(() => setAnnouncement(null), 1000);
      }, 6000);
    }
  }, [
    gameState.phase,
    gameState.players,
    gameState.voted_out_this_round,
    gameState.winners,
    playerId,
  ]);

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
          transition={{ duration: 0.8 }}
          onClick={dismiss}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background:
              'radial-gradient(circle at center, rgba(26, 17, 40, 0.95) 0%, rgba(10, 5, 15, 0.98) 100%)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
        >
          <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: '800px' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -30, filter: 'blur(15px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Title
                level={1}
                style={{
                  color: '#fff',
                  fontSize: 'min(4.5rem, 12vw)',
                  fontWeight: 900,
                  margin: 0,
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  textShadow: `0 0 40px ${announcement.color || token.colorPrimary}88, 0 4px 30px rgba(0,0,0,0.8)`,
                  marginBottom: '2.5rem',
                  lineHeight: 1.2,
                }}
              >
                {announcement.title}
              </Title>
            </motion.div>

            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', maxWidth: 240, opacity: 1 }}
              transition={{ delay: 0.4, duration: 1.2, ease: 'easeInOut' }}
              style={{
                height: 3,
                background: `linear-gradient(90deg, transparent, ${announcement.color || token.colorPrimary}, transparent)`,
                margin: '0 auto 2.5rem',
                borderRadius: 2,
                boxShadow: `0 0 25px ${announcement.color || token.colorPrimary}`,
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.7, duration: 1.2, ease: 'easeOut' }}
            >
              <Text
                style={{
                  color: announcement.color ? `${announcement.color}` : '#f0e6ff',
                  fontSize: 'min(2.5rem, 8vw)',
                  fontWeight: 600,
                  display: 'block',
                  textShadow: '0 2px 15px rgba(0,0,0,0.8)',
                  letterSpacing: '0.05em',
                }}
              >
                {announcement.subtitle}
              </Text>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 3, duration: 1 }}
              style={{
                marginTop: '4rem',
                color: 'rgba(255, 255, 255, 0.3)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.2em'
              }}
            >
              Click to dismiss
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
