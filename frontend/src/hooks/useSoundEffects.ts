import { useEffect, useRef } from 'react';
import { GamePhase } from '../types';
import type { GameState } from '../types';

export function useSoundEffects(gameState: GameState | null | undefined) {
  const prevPhase = useRef<GamePhase | null>(null);
  const prevAliveCount = useRef<number | null>(null);

  useEffect(() => {
    if (!gameState) return;

    const { phase, settings, players } = gameState;

    // Default to true if undefined (for backward compatibility)
    const dramaticTonesEnabled = settings.dramatic_tones_enabled ?? true;

    const currentAliveCount = Object.values(players).filter(p => p.is_alive).length;

    // If first render (or connection), just sync state without playing sounds
    if (prevPhase.current === null) {
      prevPhase.current = phase;
      prevAliveCount.current = currentAliveCount;
      return;
    }

    if (!dramaticTonesEnabled) {
       prevPhase.current = phase;
       prevAliveCount.current = currentAliveCount;
       return;
    }

    // Night Fall
    if (prevPhase.current !== GamePhase.NIGHT && phase === GamePhase.NIGHT) {
      playSound('/sounds/night-start.wav');
    }

    // Morning Reveal (Murder)
    if (prevPhase.current === GamePhase.NIGHT && phase === GamePhase.DAY) {
      if (prevAliveCount.current !== null && currentAliveCount < prevAliveCount.current) {
         // Someone died during the night
         playSound('/sounds/murder-reveal.mp3');
      }
    }

    // Game Over
    if (prevPhase.current !== GamePhase.GAME_OVER && phase === GamePhase.GAME_OVER) {
        playSound('/sounds/game-over.mp3');
    }

    prevPhase.current = phase;
    prevAliveCount.current = currentAliveCount;
  }, [gameState]);

  const playSound = (path: string) => {
    const audio = new Audio(path);
    audio.volume = 0.5; // Reasonable volume
    audio.play().catch(e => console.warn("Audio play failed (interaction required?)", e));
  };
}
