import { useEffect } from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import { useSetCurrentRoomId, useCurrentSession } from '../store/gameStore';
import { Card, Typography, Tag, Button, Spin, Alert, message } from 'antd';
import { v4 as uuidv4 } from 'uuid';
import { GamePhase } from '../types';
import { API_BASE_URL } from '../config';
import { JoinScreen, PlayerList, NightPanel, LobbyPanel, type GameSettings } from '../components';

const { Title } = Typography;

export default function GameRoom() {
    const roomId = window.location.pathname.split('/').pop() || '';

    // Set current room context for atoms
    const setCurrentRoomId = useSetCurrentRoomId();
    useEffect(() => {
        setCurrentRoomId(roomId);
    }, [roomId, setCurrentRoomId]);

    const { gameState, error, isLoading, disconnectedPlayers } = useGameSocket(roomId);
    const [session, setSession] = useCurrentSession();
    const playerId = session?.playerId;

    const me = (() => {
        if (!gameState || !playerId) return null;
        return gameState.players[playerId] ?? null;
    })();

    const isJoined = !!me;
    const isLobby = gameState?.phase === GamePhase.WAITING;
    const isNight = gameState?.phase === GamePhase.NIGHT;
    const isGameInProgress = gameState && gameState.phase !== GamePhase.WAITING;

    const handleJoin = async (nickname: string): Promise<boolean> => {
        const newPlayerId = uuidv4();
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname, player_id: newPlayerId }),
            });
            if (res.ok) {
                setSession({ playerId: newPlayerId, nickname });
                message.success('Joined successfully!');
                return true;
            }
            const data = await res.json();
            message.error(data.detail || 'Failed to join room');
            return false;
        } catch {
            message.error('Network error');
            return false;
        }
    };

    const handleStartGame = async (settings: GameSettings) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, settings }),
            });
            if (res.ok) {
                message.success('Game started!');
            } else {
                const data = await res.json();
                message.error(data.detail || 'Failed to start game');
            }
        } catch {
            message.error('Network error');
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        message.success('Link copied!');
    };

    const handleEndGame = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId }),
            });
            if (res.ok) {
                message.success('Game ended!');
            } else {
                const data = await res.json();
                message.error(data.detail || 'Failed to end game');
            }
        } catch {
            message.error('Network error');
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }}>
                <Spin size="large" />
            </div>
        );
    }
    if (error) return <Alert message="Error loading game" type="error" />;
    if (!gameState) return <Alert message="Game not found" type="warning" />;

    if (!isJoined) {
        return <JoinScreen roomId={roomId} onJoin={handleJoin} isSpectator={isGameInProgress} />;
    }

    const players = Object.values(gameState.players);

    return (
        <div style={{ padding: 24, minHeight: '100vh' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 24,
                    }}
                >
                    <div>
                        <Title level={2} style={{ margin: 0 }}>
                            Room: {roomId}
                        </Title>
                        <Button type="link" onClick={handleCopyLink} style={{ paddingLeft: 0 }}>
                            Copy Invite Link
                        </Button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {isGameInProgress && me?.is_admin && (
                            <Button danger onClick={handleEndGame} style={{ marginRight: 8 }}>
                                End Game
                            </Button>
                        )}
                        <Tag color={isLobby ? 'blue' : 'green'}>{gameState.phase}</Tag>
                    </div>
                </div>

                <PlayerList players={players} myId={playerId ?? null} offlineIds={disconnectedPlayers} />

                {isLobby && (
                    <LobbyPanel
                        isAdmin={me?.is_admin ?? false}
                        playerCount={players.length}
                        onStartGame={handleStartGame}
                    />
                )}

                {isNight && me?.is_alive && (
                    <Card title="🌙 Night Action">
                        <NightPanel
                            key={gameState.phase}
                            myRole={me.role ?? ''}
                            players={players}
                            playerId={playerId ?? ''}
                            roomId={roomId}
                        />
                    </Card>
                )}
            </div>
        </div>
    );
}
