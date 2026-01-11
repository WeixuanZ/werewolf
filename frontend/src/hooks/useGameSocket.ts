import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { WSMessageType, type SocketMessage, type GameState } from '../types';
import { useCurrentSessionValue } from '../store/gameStore';
import { API_BASE_URL, WS_BASE_URL } from '../config';
import { message } from 'antd';

export const useGameSocket = (roomId: string) => {
    const session = useCurrentSessionValue();
    const playerId = session?.playerId;
    const queryClient = useQueryClient();
    const [disconnectedPlayers, setDisconnectedPlayers] = useState<Set<string>>(new Set());

    // Initial fetch via REST (with player_id for filtered view)
    const {
        data: gameState,
        error,
        isLoading,
    } = useQuery({
        queryKey: ['gameState', roomId, playerId],
        queryFn: async () => {
            const url = playerId
                ? `${API_BASE_URL}/api/rooms/${roomId}?player_id=${playerId}`
                : `${API_BASE_URL}/api/rooms/${roomId}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch game state');
            return res.json() as Promise<GameState>;
        },
        enabled: !!roomId,
        refetchOnWindowFocus: true,
    });

    const url =
        !roomId || !playerId ? null : `${WS_BASE_URL}/ws/${roomId}/${playerId}`;

    const { sendJsonMessage, readyState } = useWebSocket(url, {
        onMessage: (event: MessageEvent) => {
            try {
                const msg = JSON.parse(event.data) as SocketMessage;
                switch (msg.type) {
                    case WSMessageType.PING:
                        sendJsonMessage({ type: WSMessageType.PONG });
                        break;
                    case WSMessageType.STATE_UPDATE:
                        queryClient.setQueryData(['gameState', roomId, playerId], msg.payload);
                        break;
                    case WSMessageType.PLAYER_DISCONNECTED:
                        message.warning(`${msg.payload.nickname} disconnected`);
                        setDisconnectedPlayers((prev) => new Set([...prev, msg.payload.player_id]));
                        break;
                    case WSMessageType.PLAYER_RECONNECTED:
                        message.info(`${msg.payload.nickname} reconnected`);
                        setDisconnectedPlayers((prev) => {
                            const next = new Set(prev);
                            next.delete(msg.payload.player_id);
                            return next;
                        });
                        break;
                    case WSMessageType.ERROR:
                        message.error(msg.payload.message);
                        break;
                }
            } catch (e) {
                console.error('Failed to parse WS message', e);
            }
        },
        shouldReconnect: () => true,
        reconnectAttempts: 20,
        reconnectInterval: (attempt: number) => Math.min(Math.pow(2, attempt) * 1000, 30000),
    });

    const isConnected = readyState === ReadyState.OPEN;

    const sendAction = (action: Record<string, unknown>) => {
        sendJsonMessage(action);
    };

    return {
        gameState,
        error,
        isLoading,
        sendAction,
        isConnected,
        disconnectedPlayers,
    };
};
