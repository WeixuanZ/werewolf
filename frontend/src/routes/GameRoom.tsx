import { useEffect } from "react";
import { useGameSocket } from "../hooks/useGameSocket";
import { useSetCurrentRoomId, useCurrentSession } from "../store/gameStore";
import {
  Card,
  Typography,
  Tag,
  Button,
  Spin,
  Alert,
  message,
  theme,
} from "antd";
import { v4 as uuidv4 } from "uuid";
import { GamePhase } from "../types";
import { useJoinRoom, useStartGame, useEndGame } from "../api/client";
import {
  JoinScreen,
  PlayerList,
  NightPanel,
  LobbyPanel,
  VotingPanel,
  GameOverScreen,
} from "../components";
import type { GameSettings } from "../types";

const { Title } = Typography;
const { useToken } = theme;

export default function GameRoom() {
  const { token } = useToken();
  const roomId = window.location.pathname.split("/").pop() || "";

  // Set current room context for atoms
  const setCurrentRoomId = useSetCurrentRoomId();
  useEffect(() => {
    setCurrentRoomId(roomId);
  }, [roomId, setCurrentRoomId]);

  const { gameState, error, isLoading } = useGameSocket(roomId);
  const [session, setSession] = useCurrentSession();
  const playerId = session?.playerId;

  // API Mutations
  const joinRoom = useJoinRoom(roomId);
  const startGame = useStartGame(roomId);
  const endGame = useEndGame(roomId);

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
      message.success("Joined successfully!");
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to join";
      message.error(errorMessage);
      return false;
    }
  };

  const handleStartGame = async (settings: GameSettings) => {
    if (!playerId) return;
    try {
      await startGame.mutateAsync({ playerId, settings });
      message.success("Game started!");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start";
      message.error(errorMessage);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    message.success("Link copied!");
  };

  const handleEndGame = async () => {
    if (!playerId) return;
    try {
      await endGame.mutateAsync({ playerId });
      message.success("Game ended!");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to end game";
      message.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }
  if (error) return <Alert message="Error loading game" type="error" />;
  if (!gameState) return <Alert message="Game not found" type="warning" />;

  // Render GameOverScreen for game over state
  if (isGameOver && playerId) {
    return <GameOverScreen gameState={gameState} playerId={playerId} />;
  }

  if (!isJoined) {
    return (
      <JoinScreen
        roomId={roomId}
        onJoin={handleJoin}
        isSpectator={isGameInProgress}
      />
    );
  }

  const players = Object.values(gameState.players);

  return (
    <div style={{ padding: token.padding, minHeight: "100vh" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: token.margin,
            marginBottom: token.marginLG,
            padding: token.padding,
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: token.borderRadiusLG,
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0, color: token.colorText }}>
              Room: {roomId}
            </Title>
            <Button
              type="link"
              onClick={handleCopyLink}
              style={{ padding: 0, color: token.colorPrimary }}
            >
              Copy Invite Link
            </Button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isGameInProgress && me?.is_admin && (
              <Button
                danger
                onClick={handleEndGame}
                loading={endGame.isPending}
              >
                End Game
              </Button>
            )}
            <Tag color={isLobby ? "blue" : isNight ? "purple" : "green"}>
              {gameState.phase}
            </Tag>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: token.marginLG,
          }}
        >
          <PlayerList players={players} myId={playerId ?? null} />

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
                key={`night-${gameState.turn_count}`}
                myRole={me.role ?? ""}
                players={players}
                playerId={playerId ?? ""}
                roomId={roomId}
                hasSubmittedAction={me.has_night_action}
              />
            </Card>
          )}

          {isDay && playerId && (
            <VotingPanel gameState={gameState} playerId={playerId} />
          )}
        </div>
      </div>
    </div>
  );
}
