import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useWebSocket from "react-use-websocket";
import { WSMessageType } from "../types";
import type { SocketMessage, GameState } from "../types";
import { useCurrentSessionValue } from "../store/gameStore";
import { api } from "../api/client";
import { WS_BASE_URL } from "../config";
import { message } from "antd";

export const useGameSocket = (roomId: string) => {
  const session = useCurrentSessionValue();
  const playerId = session?.playerId;
  const queryClient = useQueryClient();

  // Initial fetch via REST (with player_id for filtered view)
  const {
    data: gameState,
    error,
    isLoading,
  } = useQuery<GameState>({
    queryKey: ["gameState", roomId, playerId],
    queryFn: () => api.rooms.get(roomId, playerId ?? undefined),
    enabled: !!roomId,
    refetchOnWindowFocus: true,
  });

  // WebSocket connection for real-time updates
  const wsUrl = playerId ? `${WS_BASE_URL}/ws/${roomId}/${playerId}` : null;

  const { sendJsonMessage, readyState } = useWebSocket(wsUrl, {
    onMessage: (event) => {
      try {
        const msg: SocketMessage = JSON.parse(event.data);
        const queryKey = ["gameState", roomId, playerId];

        switch (msg.type) {
          case WSMessageType.STATE_UPDATE:
            queryClient.setQueryData(queryKey, msg.payload);
            break;

          case WSMessageType.PLAYER_DISCONNECTED:
            queryClient.setQueryData(queryKey, (old: GameState | undefined) => {
              if (!old || !old.players[msg.payload.player_id]) return old;
              return {
                ...old,
                players: {
                  ...old.players,
                  [msg.payload.player_id]: {
                    ...old.players[msg.payload.player_id],
                    is_online: false,
                  },
                },
              };
            });
            message.warning(`${msg.payload.nickname} disconnected`);
            break;

          case WSMessageType.PLAYER_RECONNECTED:
            queryClient.setQueryData(queryKey, (old: GameState | undefined) => {
              if (!old || !old.players[msg.payload.player_id]) return old;
              return {
                ...old,
                players: {
                  ...old.players,
                  [msg.payload.player_id]: {
                    ...old.players[msg.payload.player_id],
                    is_online: true,
                  },
                },
              };
            });
            message.info(`${msg.payload.nickname} reconnected`);
            break;

          case WSMessageType.PING:
            // Server sent PING, respond with PONG
            sendJsonMessage({ type: "PONG" });
            break;

          case WSMessageType.ERROR:
            message.error(msg.payload.message);
            break;
        }
      } catch (e) {
        console.error("WS message parse error:", e);
      }
    },
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  // Also send periodic PONG as keepalive
  const sendPong = useCallback(() => {
    if (readyState === 1) {
      // WebSocket.OPEN
      sendJsonMessage({ type: "PONG" });
    }
  }, [sendJsonMessage, readyState]);

  return {
    gameState,
    error,
    isLoading,
    isConnected: readyState === 1,
    sendPong,
  };
};
