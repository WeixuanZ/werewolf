import { CopyOutlined, QrcodeOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGameSocket } from '../hooks/useGameSocket';
import { useSetCurrentRoomId, useCurrentSession } from '../store/gameStore';
import {
  Card,
  Typography,
  Button,
  Spin,
  message,
  theme,
  QRCode,
  Modal,
  Grid,
  Flex,
  Space,
} from 'antd';
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
import { PhaseTransitionOverlay } from '../components/game/PhaseTransitionOverlay';
import type { GameSettings } from '../types';

const { Title } = Typography;
const { useToken } = theme;
const { useBreakpoint } = Grid;

export default function GameRoom() {
  const { token } = useToken();
  const screens = useBreakpoint();
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

  // UI STATE SUSPENSION LOGIC
  // We want to keep showing the *old* phase/state while the PhaseTransitionOverlay fades in.
  // We only update the displayed state after a short delay during dramatic transitions.
  const [displayedGameState, setDisplayedGameState] = useState<typeof gameState>(gameState);

  useEffect(() => {
    if (!gameState) return;

    // Initial load or sync if phase matches (standard update)
    if (!displayedGameState) {
      const t = setTimeout(() => setDisplayedGameState(gameState), 0);
      return () => clearTimeout(t);
    }

    // If phases match, we generally just want to sync the latest state (e.g. new votes, new chat, etc)
    // We only delay if the PHASE changed dramatically.
    if (displayedGameState.phase === gameState.phase) {
      if (displayedGameState !== gameState) {
        const t = setTimeout(() => setDisplayedGameState(gameState), 0);
        return () => clearTimeout(t);
      }
      return;
    }

    const currentPhase = gameState.phase;
    const prevPhase = displayedGameState.phase;

    // Check if a dramatic transition is happening
    const isDramatic =
      (prevPhase === GamePhase.NIGHT && currentPhase === GamePhase.DAY) ||
      (prevPhase === GamePhase.DAY &&
        currentPhase !== GamePhase.DAY &&
        currentPhase !== GamePhase.WAITING &&
        currentPhase !== GamePhase.GAME_OVER) || // Day -> Night (Voting finished)
      (currentPhase === GamePhase.GAME_OVER && prevPhase !== GamePhase.GAME_OVER);

    if (isDramatic) {
      // Delay the UI update to allow the Overlay to cover the screen first.
      // Overlay fades in over 0.5s. We wait 1.5s to be safe and smooth.
      const timer = setTimeout(() => {
        setDisplayedGameState(gameState);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      // Immediate update for non-dramatic changes (e.g. someone joining lobby, votes updating)
      const t = setTimeout(() => setDisplayedGameState(gameState), 0);
      return () => clearTimeout(t);
    }
  }, [gameState, displayedGameState]);

  // Use the DISPLAYED state for rendering the board
  const activeState = displayedGameState || gameState;
  // Fallback to gameState if displayed is null (first render) but normally handled by effect

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
    if (!activeState || !playerId) return null;
    return activeState.players[playerId] ?? null;
  })();

  const isJoined = !!me;
  const isLobby = activeState?.phase === GamePhase.WAITING;
  const isNight = activeState?.phase === GamePhase.NIGHT;
  const isDay = activeState?.phase === GamePhase.DAY;
  const isGameOver = activeState?.phase === GamePhase.GAME_OVER;
  const isGameInProgress = !!activeState && activeState.phase !== GamePhase.WAITING;

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

  if (!isJoined) {
    return <JoinScreen roomId={roomId} onJoin={handleJoin} isSpectator={isGameInProgress} />;
  }

  const players = activeState ? Object.values(activeState.players) : [];

  // Render GameOverScreen for game over state or main game content
  // Note: We use activeState here so the screen switches only after delay
  const mainContent =
    isGameOver && playerId && activeState ? (
      <GameOverScreen gameState={activeState} playerId={playerId} />
    ) : (
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

        {isLobby && activeState && (
          <LobbyPanel
            isAdmin={me?.is_admin ?? false}
            playerCount={players.length}
            onStartGame={handleStartGame}
            serverSettings={activeState.settings}
          />
        )}

        {isNight && me?.is_alive && activeState && (
          <Card title="🌙 Night Action">
            <NightPanel
              key={`night-${activeState.turn_count}`}
              myRole={me.role ?? ''}
              players={players}
              playerId={playerId ?? ''}
              roomId={roomId}
              hasSubmittedAction={me.has_night_action}
              phaseStartTime={activeState.phase_start_time}
              phaseDurationSeconds={activeState.settings?.phase_duration_seconds}
              timerEnabled={activeState.settings?.timer_enabled ?? true}
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

        {isDay && playerId && activeState && (
          <VotingPanel
            gameState={activeState}
            playerId={playerId}
            timerEnabled={activeState.settings?.timer_enabled ?? true}
          />
        )}
      </div>
    );

  const isDesktop = screens.lg; // Define isDesktop here

  const adminControls = isGameInProgress && me?.is_admin && (
    <Button
      type="primary"
      danger
      onClick={() => setShowEndGameConfirm(true)}
      size={isDesktop ? 'middle' : 'small'}
      icon={<ExclamationCircleOutlined />}
    >
      End Game
    </Button>
  );

  return (
    <div style={{ padding: token.padding, flex: 1 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
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
          {/* Unified Responsive Header Layout */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={isDesktop ? 16 : 12}>
            {/* Left Group: Room ID + Buttons + Admin */}
            <Flex align="center" wrap="wrap" gap={isDesktop ? 16 : 8} style={{ flex: 1 }}>
              <Title
                level={3}
                style={{
                  margin: 0,
                  color: token.colorText,
                  fontSize: isDesktop ? 24 : 18,
                  whiteSpace: 'nowrap',
                }}
              >
                Room: {roomId}
              </Title>

              {isLobby && (
                <Space>
                  <Button
                    icon={<CopyOutlined />}
                    onClick={handleCopyLink}
                    size={isDesktop ? 'middle' : 'small'}
                  >
                    Copy Link
                  </Button>
                  <Button
                    icon={<QrcodeOutlined />}
                    onClick={() => setShowQrCode(true)}
                    size={isDesktop ? 'middle' : 'small'}
                  >
                    QR Code
                  </Button>
                </Space>
              )}

              {adminControls}
            </Flex>

            {/* Right Group: Phase Indicator */}
            <Flex
              align="center"
              justify="center"
              gap={8}
              style={{
                padding: isDesktop ? '0 16px' : '0 12px',
                height: isDesktop ? 40 : 36,
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
                minWidth: isDesktop ? 120 : 'auto',
              }}
            >
              <span style={{ fontSize: isDesktop ? 20 : 18 }}>
                {isLobby ? '🏠' : isNight ? '🌙' : '☀️'}
              </span>
              <span
                style={{
                  fontSize: isDesktop ? 15 : 14,
                  fontWeight: 600,
                  color: isLobby ? '#1890ff' : isNight ? '#d8bfd8' : '#90ee90',
                  letterSpacing: '0.5px',
                }}
              >
                {isLobby ? 'LOBBY' : activeState?.phase}
              </span>
            </Flex>
          </Flex>

          {/* QR Code Modal (Common) */}
          <Modal
            title="Join via QR Code"
            open={showQrCode}
            onCancel={() => setShowQrCode(false)}
            footer={null}
            centered
            width="auto"
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
              <QRCode value={window.location.href} size={250} />
            </div>
          </Modal>

          {/* End Game Modal (Common) */}
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
        </div>

        {/* Main Content */}
        {mainContent}
      </div>
      <PhaseTransitionOverlay gameState={gameState} />
    </div>
  );
}
