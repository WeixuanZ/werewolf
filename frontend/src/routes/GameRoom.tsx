import { CopyOutlined, QrcodeOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGameSocket } from '../hooks/useGameSocket';
import { useSetCurrentRoomId, useCurrentSession } from '../store/gameStore';
import { Card, Typography, Button, Spin, message, theme, QRCode, Modal } from 'antd';
import { v4 as uuidv4 } from 'uuid';
import { GamePhase } from '../types';
import { useParams } from '@tanstack/react-router';
import { useJoinRoom, useStartGame, useEndGame, useKickPlayer } from '../api/client';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { JoinScreen } from '../components/game/JoinScreen';
import { PlayerList } from '../components/game/PlayerList';
import { NightPanel } from '../components/night/NightPanel';
import { LobbyPanel } from '../components/game/LobbyPanel';
import { VotingPanel } from '../components/game/VotingPanel';
import { GameOverScreen } from '../components/game/GameOverScreen';
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
  const [session, setSession] = useCurrentSession();
  const playerId = session?.playerId;

  // Sound effects (with player context for per-player audio)
  useSoundEffects(gameState, { playerId });

  useEffect(() => {
    if (error || (!isLoading && !gameState)) {
      message.error('Room not found or expired');
      navigate({ to: '/' });
    }
  }, [error, gameState, isLoading, navigate]);

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
    <div style={{ padding: token.padding, flex: 1 }}>
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
                  style={{
                    height: 42, // Match badge height
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    fontSize: 15,
                    fontWeight: 500,
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorErrorBorder}`,
                    background: 'rgba(255, 77, 79, 0.1)',
                  }}
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
                        size="large"
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

            {/* Unified Phase Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 16px',
                height: 42,
                background: isLobby
                  ? 'rgba(24, 144, 255, 0.2)'
                  : isNight
                    ? 'rgba(128, 0, 128, 0.2)'
                    : 'rgba(34, 139, 34, 0.2)',
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${
                  isLobby
                    ? 'rgba(24, 144, 255, 0.4)'
                    : isNight
                      ? 'rgba(147, 112, 219, 0.4)'
                      : 'rgba(34, 139, 34, 0.4)'
                }`,
                backdropFilter: 'blur(4px)',
              }}
            >
              <span style={{ fontSize: 20 }}>{isLobby ? '🏠' : isNight ? '🌙' : '☀️'}</span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: isLobby ? '#1890ff' : isNight ? '#d8bfd8' : '#90ee90',
                  letterSpacing: '0.5px',
                }}
              >
                {isLobby ? 'LOBBY' : gameState.phase}
              </span>
            </div>
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

          {/* Spectator Banner */}
          {isGameInProgress && me && (!me.is_alive || me.is_spectator) && (
            <Card
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>👁️</div>
              <div style={{ color: token.colorTextSecondary, fontSize: 16 }}>
                You are {me.is_spectator ? 'spectating' : 'dead'}. Watch the game unfold...
              </div>
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
