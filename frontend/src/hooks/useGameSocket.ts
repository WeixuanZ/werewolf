import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { WSMessageType } from '../types';
import type { SocketMessage, GameState } from '../types';
import { useCurrentSessionValue } from '../store/gameStore';
import { useGameState } from './useGameState';
import { useWebSocket, ReadyState } from './useWebSocket';
import { getGameStateQueryKey } from '../utils/queryKeys';
import { WS_BASE_URL } from '../config';

export function useGameSocket(roomId: string) {
  const session = useCurrentSessionValue();
  const playerId = session?.playerId;
  const queryClient = useQueryClient();

  const {
    data: gameState,
    error,
    isLoading,
  } = useGameState(roomId, playerId, {
    enabled: !!roomId,
    refetchOnWindowFocus: true,
  });

  const wsUrl = playerId ? `${WS_BASE_URL}/ws/${roomId}/${playerId}` : null;

  const { sendJsonMessage, readyState } = useWebSocket(wsUrl, {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    onMessage: (event) => {
      let msg: SocketMessage;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        console.error('WS message parse error:', e);
        return;
      }

      const queryKey = getGameStateQueryKey(roomId, playerId);

      switch (msg.type) {
        case WSMessageType.STATE_UPDATE:
          queryClient.setQueryData(queryKey, msg.payload);
          break;

        case WSMessageType.PLAYER_DISCONNECTED:
          queryClient.setQueryData(queryKey, (old: GameState | undefined) =>
            patchPlayerOnline(old, msg.payload.player_id, false),
          );
          message.warning(`${msg.payload.nickname} disconnected`);
          break;

        case WSMessageType.PLAYER_RECONNECTED:
          queryClient.setQueryData(queryKey, (old: GameState | undefined) =>
            patchPlayerOnline(old, msg.payload.player_id, true),
          );
          message.info(`${msg.payload.nickname} reconnected`);
          break;

        case WSMessageType.PING:
          sendJsonMessage({ type: 'PONG' });
          break;

        case WSMessageType.ERROR:
          message.error(msg.payload.message);
          break;
      }
    },
  });

  // Client-side proactive keepalive
  useEffect(() => {
    if (readyState !== ReadyState.OPEN) return;
    const interval = setInterval(() => {
      sendJsonMessage({ type: 'PONG' });
    }, 25000);
    return () => clearInterval(interval);
  }, [readyState, sendJsonMessage]);

  return {
    gameState,
    error,
    isLoading,
    isConnected: readyState === ReadyState.OPEN,
  };
}

function patchPlayerOnline(
  old: GameState | undefined,
  playerId: string,
  isOnline: boolean,
): GameState | undefined {
  if (!old || !old.players[playerId]) return old;
  return {
    ...old,
    players: {
      ...old.players,
      [playerId]: { ...old.players[playerId], is_online: isOnline },
    },
  };
}
