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

type AnnouncementType = 'role-reveal' | 'morning' | 'execution' | 'gameover' | 'generic';

interface Announcement {
  eyebrow?: string;
  title: string;
  subtitle: string;
  icon?: string;
  accent: string;
  type: AnnouncementType;
}

const ACCENT_NEUTRAL = '#9370db';
const ACCENT_DANGER = '#ff7875';
const ACCENT_SUCCESS = '#73d39c';
const ACCENT_MUTED = '#a89cc8';
const ACCENT_LOVERS = '#eb2f96';
const ACCENT_GOLD = '#f6c177';

export const PhaseTransitionOverlay = ({ gameState, playerId }: PhaseTransitionOverlayProps) => {
  const { token } = theme.useToken();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const prevPhase = useRef<GamePhase>(gameState.phase);
  const prevPlayers = useRef(gameState.players);

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
    if (cleanupTimerRef.current !== null) clearTimeout(cleanupTimerRef.current);
    cleanupTimerRef.current = setTimeout(() => setAnnouncement(null), 800);
  };

  useEffect(() => {
    const currentPhase = gameState.phase;
    const previous = prevPhase.current;
    const previousPlayers = prevPlayers.current;

    prevPhase.current = currentPhase;
    prevPlayers.current = gameState.players;

    if (previous === currentPhase) return;

    let next: Announcement | null = null;

    // WAITING -> NIGHT (Game Start / Role Reveal)
    if (previous === GamePhase.WAITING && currentPhase === GamePhase.NIGHT) {
      const me = playerId ? gameState.players[playerId] : null;
      if (me && me.role) {
        const roleTheme = getRoleTheme(me.role);
        next = {
          eyebrow: 'Your role',
          title: me.role,
          subtitle: 'Keep it secret. Play your part.',
          icon: getRoleEmoji(me.role),
          accent: roleTheme.primary,
          type: 'role-reveal',
        };
      }
    }
    // NIGHT -> DAY (Morning)
    else if (previous === GamePhase.NIGHT && currentPhase === GamePhase.DAY) {
      const newlyDead = Object.values(gameState.players).filter(
        (p) => previousPlayers[p.id]?.is_alive && !p.is_alive,
      );
      const deadNames = newlyDead.map((p) => p.nickname).join(', ');

      const witch = Object.values(previousPlayers).find((p) => p.role === RoleType.WITCH);
      let witchActionText = '';
      if (witch && witch.night_action_confirmed) {
        if (witch.night_action_type === NightActionType.HEAL) {
          witchActionText = ' The Witch used her healing potion.';
        } else if (witch.night_action_type === NightActionType.POISON) {
          witchActionText = ' The Witch used her poison.';
        }
      }

      const deadHunter = newlyDead.find((p) => p.role === RoleType.HUNTER);
      let hunterActionText = '';
      if (deadHunter) {
        const hunterPrevState = previousPlayers[deadHunter.id];
        if (
          hunterPrevState &&
          hunterPrevState.night_action_type === NightActionType.REVENGE &&
          hunterPrevState.night_action_target
        ) {
          const revengeTarget = gameState.players[hunterPrevState.night_action_target];
          if (
            revengeTarget &&
            !revengeTarget.is_alive &&
            previousPlayers[revengeTarget.id]?.is_alive
          ) {
            hunterActionText = ` ${deadHunter.nickname} took ${revengeTarget.nickname} down with them.`;
          }
        }
      }

      const peaceful = newlyDead.length === 0;
      next = {
        eyebrow: 'Dawn',
        title: 'Morning Breaks',
        subtitle: peaceful
          ? `It was a peaceful night.${witchActionText}`
          : `${deadNames} was found dead.${witchActionText}${hunterActionText}`,
        icon: peaceful ? '🌅' : '🕯️',
        accent: peaceful ? ACCENT_SUCCESS : ACCENT_DANGER,
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

      next = {
        eyebrow: 'Verdict',
        title: isHunter ? "The Hunter's Last Stand" : 'The Village Has Spoken',
        subtitle: victim
          ? `${victim.nickname} was executed.${isHunter ? ' They are taking someone with them.' : ''}`
          : 'No one was executed.',
        icon: victim ? '⚖️' : '🤝',
        accent: victim ? ACCENT_DANGER : ACCENT_MUTED,
        type: 'execution',
      };
    }
    // HUNTER_REVENGE -> NIGHT
    else if (previous === GamePhase.HUNTER_REVENGE && currentPhase === GamePhase.NIGHT) {
      const hunterId = gameState.voted_out_this_round;
      const hunter = hunterId ? gameState.players[hunterId] : null;
      const victimId = hunter?.hunter_revenge_target;
      const victim = victimId ? gameState.players[victimId] : null;

      next = {
        eyebrow: 'Final shot',
        title: 'Revenge Served',
        subtitle:
          hunter && victim
            ? `${hunter.nickname} shot ${victim.nickname}.`
            : "The hunter's shot missed.",
        icon: '🎯',
        accent: ACCENT_DANGER,
        type: 'generic',
      };
    }
    // GAME OVER
    else if (currentPhase === GamePhase.GAME_OVER) {
      const winners = gameState.winners;
      let title = 'Game Over';
      let accent = ACCENT_GOLD;
      let icon = '🏆';

      if (winners === 'WEREWOLVES') {
        title = 'Werewolves Win';
        accent = ACCENT_DANGER;
        icon = '🐺';
      } else if (winners === 'VILLAGERS') {
        title = 'Villagers Win';
        accent = ACCENT_SUCCESS;
        icon = '🏘️';
      } else if (winners === 'LOVERS') {
        title = 'Lovers Win';
        accent = ACCENT_LOVERS;
        icon = '💘';
      } else if (winners === 'TANNER') {
        title = 'Tanner Wins';
        accent = ACCENT_GOLD;
        icon = '🤡';
      }

      next = {
        eyebrow: 'Final result',
        title,
        subtitle: 'The game has ended.',
        icon,
        accent,
        type: 'gameover',
      };
    }

    if (next) {
      clearAllTimers();
      const nextAnnouncement = next;
      startTimerRef.current = setTimeout(() => {
        setAnnouncement(nextAnnouncement);
        setIsVisible(true);
      }, 100);
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        cleanupTimerRef.current = setTimeout(() => setAnnouncement(null), 800);
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
          transition={{ duration: 0.5, ease: 'easeOut' }}
          onClick={dismiss}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background:
              'radial-gradient(circle at center, rgba(26, 17, 40, 0.92) 0%, rgba(10, 5, 15, 0.97) 75%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'auto',
            cursor: 'pointer',
            padding: '24px',
            paddingTop: 'calc(24px + env(safe-area-inset-top))',
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          }}
        >
          {/* Soft accent halo behind the card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.55, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 'min(640px, 90vw)',
              height: 'min(640px, 90vw)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${announcement.accent}33 0%, ${announcement.accent}00 60%)`,
              pointerEvents: 'none',
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'relative',
              textAlign: 'center',
              maxWidth: 520,
              width: '100%',
              padding: '40px 28px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${announcement.accent}40`,
              borderRadius: token.borderRadiusLG * 2,
              boxShadow:
                '0 24px 80px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.03)',
            }}
          >
            {announcement.icon && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontSize: 'min(72px, 18vw)',
                  lineHeight: 1,
                  marginBottom: 20,
                  filter: `drop-shadow(0 6px 24px ${announcement.accent}55)`,
                }}
              >
                {announcement.icon}
              </motion.div>
            )}

            {announcement.eyebrow && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
              >
                <Text
                  style={{
                    display: 'block',
                    color: ACCENT_NEUTRAL,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.32em',
                    textTransform: 'uppercase',
                    marginBottom: 14,
                  }}
                >
                  {announcement.eyebrow}
                </Text>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <Title
                level={1}
                style={{
                  margin: 0,
                  color: '#f0e6ff',
                  fontSize: 'min(2.75rem, 9vw)',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  lineHeight: 1.15,
                }}
              >
                {announcement.title}
              </Title>
            </motion.div>

            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 56, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
              style={{
                height: 2,
                background: announcement.accent,
                margin: '22px auto',
                borderRadius: 2,
                boxShadow: `0 0 16px ${announcement.accent}88`,
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.7 }}
            >
              <Text
                style={{
                  display: 'block',
                  color: '#a89cc8',
                  fontSize: 'min(1.1rem, 4.2vw)',
                  fontWeight: 400,
                  lineHeight: 1.55,
                  maxWidth: 420,
                  margin: '0 auto',
                }}
              >
                {announcement.subtitle}
              </Text>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 2.4, duration: 0.8 }}
              style={{
                marginTop: 32,
                color: 'rgba(168, 156, 200, 0.5)',
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.24em',
              }}
            >
              Tap to dismiss
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
