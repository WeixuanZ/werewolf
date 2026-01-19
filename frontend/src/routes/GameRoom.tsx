import { CopyOutlined, QrcodeOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGameSocket } from '../hooks/useGameSocket';
import { useSetCurrentRoomId, useCurrentSession } from '../store/gameStore';
import { Card, Typography, Tag, Button, Spin, message, theme, QRCode, Modal } from 'antd';
import { v4 as uuidv4 } from 'uuid';
import { GamePhase } from '../types';
import { useParams } from '@tanstack/react-router';
import { useJoinRoom, useStartGame, useEndGame, useKickPlayer } from '../api/client';
import {
  JoinScreen,
  PlayerList,
  NightPanel,
  LobbyPanel,
  VotingPanel,
  GameOverScreen,
} from '../components';
import type { GameSettings } from '../types';

const { Title } = Typography;
const { useToken } = theme;

export default function GameRoom() {
  const { token } = useToken();
  const navigate = useNavigate();
  const [showQrCode, setShowQrCode] = useState(false);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const { roomId = '' } = useParams({ strict: false });

  // Set current room context for atoms
  const setCurrentRoomId = useSetCurrentRoomId();
  useEffect(() => {
    setCurrentRoomId(roomId);
  }, [roomId, setCurrentRoomId]);

  const { gameState, error, isLoading } = useGameSocket(roomId);

  useEffect(() => {
    if (error || (!isLoading && !gameState)) {
      message.error('Room not found or expired');
      navigate({ to: '/' });
    }
  }, [error, gameState, isLoading, navigate]);
  const [session, setSession] = useCurrentSession();
  const playerId = session?.playerId;

  // API Mutations
  const joinRoom = useJoinRoom(roomId);
  const startGame = useStartGame(roomId);
  const endGame = useEndGame(roomId);
  const kickPlayer = useKickPlayer(roomId);

  const me = (() => {
    if (!gameState || !playerId) return null;
    return gameState.players[playerId] ?? null;
  })();

  const isJoined = !!me;
  const isLobby = gameState?.phase === GamePhase.WAITING;
  const isNight = gameState?.phase === GamePhase.NIGHT;
  const isDay = gameState?.phase === GamePhase.DAY;
  const isGameOver = gameState?.phase === GamePhase.GAME_OVER;
  const isGameInProgress = gameState && gameState.phase !== GamePhase.WAITING;

  const handleJoin = async (nickname: string): Promise<boolean> => {
    const newPlayerId = uuidv4();
    try {
      await joinRoom.mutateAsync({ nickname, playerId: newPlayerId });
      setSession({ playerId: newPlayerId, nickname });
      message.success('Joined successfully!');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join';
      message.error(errorMessage);
      return false;
    }
  };

  const handleStartGame = async (settings: GameSettings) => {
    if (!playerId) return;
    try {
      await startGame.mutateAsync({ playerId, settings });
      message.success('Game started!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start';
      message.error(errorMessage);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    message.success('Link copied!');
  };

  const handleEndGame = async () => {
    if (!playerId) return;
    try {
      await endGame.mutateAsync({ playerId });
      message.success('Game ended!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end game';
      message.error(errorMessage);
    }
  };

  const handleKick = async (targetId: string) => {
    if (!playerId) return;
    try {
      await kickPlayer.mutateAsync({ playerId, targetId });
      message.success('Player removed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove player';
      message.error(errorMessage);
    }
  };

  if (isLoading || error || !gameState) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Render GameOverScreen for game over state
  if (isGameOver && playerId) {
    return <GameOverScreen gameState={gameState} playerId={playerId} />;
  }

  if (!isJoined) {
    return <JoinScreen roomId={roomId} onJoin={handleJoin} isSpectator={isGameInProgress} />;
  }

  const players = Object.values(gameState.players);

  return (
    <div style={{ padding: token.padding, minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: token.margin,
            marginBottom: token.marginLG,
            padding: 16,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: token.borderRadiusLG,
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0, color: token.colorText }}>
              Room: {roomId}
            </Title>
            {isLobby && (
              <>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Button icon={<CopyOutlined />} onClick={handleCopyLink}>
                    Copy Link
                  </Button>
                  <Button icon={<QrcodeOutlined />} onClick={() => setShowQrCode(true)}>
                    QR Code
                  </Button>
                </div>
                <Modal
                  title="Join via QR Code"
                  open={showQrCode}
                  onCancel={() => setShowQrCode(false)}
                  footer={null}
                  centered
                  width="auto"
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      padding: 20,
                    }}
                  >
                    <QRCode value={window.location.href} size={250} />
                  </div>
                </Modal>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isGameInProgress && me?.is_admin && (
              <>
                <Button
                  danger
                  onClick={() => setShowEndGameConfirm(true)}
                  loading={endGame.isPending}
                >
                  End Game
                </Button>
                <Modal
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                      <span>End Game</span>
                    </div>
                  }
                  open={showEndGameConfirm}
                  onCancel={() => setShowEndGameConfirm(false)}
                  footer={
                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                      <Button
                        onClick={() => setShowEndGameConfirm(false)}
                        size="large"
                        style={{ flex: 1, height: 48 }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="primary"
                        danger
                        onClick={() => {
                          handleEndGame();
                          setShowEndGameConfirm(false);
                        }}
                        size="large" // Matches standard button size
                        style={{ flex: 1, height: 48 }}
                      >
                        End Game
                      </Button>
                    </div>
                  }
                  centered
                >
                  <p style={{ fontSize: 16, margin: '16px 0' }}>
                    Are you sure you want to end the current game?
                  </p>
                </Modal>
              </>
            )}
            <Tag color={isLobby ? 'blue' : isNight ? 'purple' : 'green'}>{gameState.phase}</Tag>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: token.margin,
          }}
        >
          <PlayerList
            players={players}
            myId={playerId ?? null}
            onKick={isLobby || isGameOver ? handleKick : undefined}
          />

          {isLobby && (
            <LobbyPanel
              isAdmin={me?.is_admin ?? false}
              playerCount={players.length}
              onStartGame={handleStartGame}
              serverSettings={gameState.settings}
            />
          )}

          {isNight && me?.is_alive && (
            <Card title="🌙 Night Action">
              <NightPanel
                key={`night-${gameState.turn_count}`}
                myRole={me.role ?? ''}
                players={players}
                playerId={playerId ?? ''}
                roomId={roomId}
                hasSubmittedAction={me.has_night_action}
                phaseStartTime={gameState.phase_start_time}
                phaseDurationSeconds={gameState.settings?.phase_duration_seconds}
                timerEnabled={gameState.settings?.timer_enabled ?? true}
              />
            </Card>
          )}

          {isDay && playerId && (
            <VotingPanel
              gameState={gameState}
              playerId={playerId}
              timerEnabled={gameState.settings?.timer_enabled ?? true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
