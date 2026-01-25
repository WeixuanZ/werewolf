import { useEffect, useRef } from 'react';
import { GamePhase } from '../types';
import type { GameState } from '../types';

interface UseSoundEffectsConfig {
  playerId?: string | null;
}

export function useSoundEffects(
  gameState: GameState | null | undefined,
  config?: UseSoundEffectsConfig,
) {
  const prevPhase = useRef<GamePhase | null>(null);
  const prevAliveStatus = useRef<boolean | null>(null);
  const playerId = config?.playerId;

  const playSound = (path: string) => {
    const audio = new Audio(path);
    audio.volume = 0.5;
    audio.play().catch((e) => console.warn('Audio play failed (interaction required?)', e));
  };

  useEffect(() => {
    if (!gameState) return;

    const { phase, settings, players, winners } = gameState;

    // Default to true if undefined (for backward compatibility)
    const dramaticTonesEnabled = settings.dramatic_tones_enabled ?? true;

    // Get current player's alive status
    const currentPlayer = playerId ? players[playerId] : null;
    const currentIsAlive = currentPlayer?.is_alive ?? true;

    // First render: sync state without playing sounds
    if (prevPhase.current === null) {
      prevPhase.current = phase;
      prevAliveStatus.current = currentIsAlive;
      return;
    }

    if (!dramaticTonesEnabled) {
      prevPhase.current = phase;
      prevAliveStatus.current = currentIsAlive;
      return;
    }

    // Night Fall (plays for everyone)
    if (prevPhase.current !== GamePhase.NIGHT && phase === GamePhase.NIGHT) {
      playSound('/sounds/night-start.mp3');
    }

    // Morning Death Reveal - only for the player who died
    if (prevPhase.current === GamePhase.NIGHT && phase === GamePhase.DAY) {
      // Check if THIS player just died (was alive, now dead)
      if (prevAliveStatus.current === true && currentIsAlive === false) {
        playSound('/sounds/murder-reveal.mp3');
      }
    }

    // Game Over - different sounds for winners vs losers
    if (prevPhase.current !== GamePhase.GAME_OVER && phase === GamePhase.GAME_OVER) {
      if (currentPlayer && winners) {
        // Determine if current player is a winner
        const isWinner = checkIfWinner(currentPlayer, winners, players);
        if (isWinner) {
          // Play victory sound
          playSound('/sounds/game-win.wav');
        } else {
          // Play lose sound
          playSound('/sounds/game-over.mp3');
        }
      } else {
        // Spectator or unknown - play generic game over
        playSound('/sounds/game-over.mp3');
      }
    }

    prevPhase.current = phase;
    prevAliveStatus.current = currentIsAlive;
  }, [gameState, playerId]);
}

// Helper to check if player is on winning team
function checkIfWinner(
  player: { role?: string | null; id: string },
  winners: string,
  players: Record<string, { role?: string | null; is_alive: boolean }>,
): boolean {
  if (!player.role) return false;

  switch (winners) {
    case 'VILLAGERS':
      return player.role !== 'WEREWOLF';
    case 'WEREWOLVES':
      return player.role === 'WEREWOLF';
    case 'TANNER':
      return player.role === 'TANNER';
    case 'LOVERS': {
      // Lovers win if only they are alive
      const aliveIds = Object.entries(players)
        .filter(([, p]) => p.is_alive)
        .map(([id]) => id);
      return aliveIds.includes(player.id);
    }
    default:
      return false;
  }
}
