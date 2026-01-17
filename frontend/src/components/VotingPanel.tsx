import { useState } from "react";
import { Button, theme } from "antd";
import { useSubmitVote } from "../api/client";
import type { GameState, Player } from "../types";
import { getRoleEmoji } from "../utils/roleUtils";

const { useToken } = theme;

interface VotingPanelProps {
  gameState: GameState;
  playerId: string;
}

export function VotingPanel({ gameState, playerId }: VotingPanelProps) {
  const { token } = useToken();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const submitVote = useSubmitVote(gameState.room_id);

  const currentPlayer = gameState.players[playerId];
  const hasVoted = currentPlayer?.vote_target != null;

  const alivePlayers = Object.values(gameState.players).filter(
    (p) => p.is_alive && p.id !== playerId,
  );

  // Calculate vote counts (visible to all)
  const voteCounts: Record<string, number> = {};
  Object.values(gameState.players).forEach((p) => {
    if (p.vote_target) {
      voteCounts[p.vote_target] = (voteCounts[p.vote_target] || 0) + 1;
    }
  });

  const handleVote = () => {
    if (!selectedTarget) return;
    submitVote.mutate({ playerId, targetId: selectedTarget });
  };

  const votedPlayers = Object.values(gameState.players).filter(
    (p) => p.vote_target,
  );
  const totalAlive = Object.values(gameState.players).filter(
    (p) => p.is_alive,
  ).length;

  const panelStyle: React.CSSProperties = {
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: token.borderRadiusLG,
    padding: token.paddingLG,
    border: `1px solid ${token.colorBorder}`,
  };

  if (hasVoted) {
    return (
      <div style={{ ...panelStyle, textAlign: "center" }}>
        <div
          style={{ color: token.colorSuccess, fontSize: 16, marginBottom: 8 }}
        >
          ✅ You voted for{" "}
          <strong>
            {gameState.players[currentPlayer.vote_target!]?.nickname ||
              "someone"}
          </strong>
        </div>
        <div style={{ color: token.colorTextSecondary }}>
          Waiting for other players to vote...
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ textAlign: "center", marginBottom: token.margin }}>
        <h2 style={{ color: token.colorText, margin: 0 }}>
          🗳️ Day Phase - Voting
        </h2>
        <p style={{ color: token.colorTextSecondary, margin: "8px 0 0" }}>
          Votes: {votedPlayers.length} / {totalAlive}
        </p>
      </div>

      <p
        style={{
          color: token.colorTextSecondary,
          textAlign: "center",
          marginBottom: token.margin,
        }}
      >
        Choose a player to eliminate:
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: token.margin,
        }}
      >
        {alivePlayers.map((player: Player) => (
          <button
            key={player.id}
            onClick={() => setSelectedTarget(player.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "16px",
              background:
                selectedTarget === player.id
                  ? `${token.colorPrimary}33`
                  : "rgba(255, 255, 255, 0.05)",
              border: `2px solid ${
                selectedTarget === player.id
                  ? token.colorPrimary
                  : "transparent"
              }`,
              borderRadius: token.borderRadiusLG,
              color: token.colorText,
              fontSize: 18,
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
              minHeight: "120px",
            }}
          >
            <span style={{ fontSize: 24, marginBottom: 8 }}>
              {player.role ? getRoleEmoji(player.role) : "👤"}
            </span>
            <span
              style={{ fontWeight: 500, textAlign: "center", marginBottom: 4 }}
            >
              {player.nickname}
            </span>

            {voteCounts[player.id] && (
              <span
                style={{
                  fontSize: 12,
                  color: token.colorTextLightSolid,
                  background: token.colorPrimary,
                  padding: "2px 8px",
                  borderRadius: 12,
                  marginTop: 4,
                }}
              >
                {voteCounts[player.id]} votes
              </span>
            )}
          </button>
        ))}
      </div>

      <Button
        type="primary"
        block
        size="large"
        style={{ height: 56, fontSize: 20 }}
        onClick={handleVote}
        disabled={!selectedTarget}
        loading={submitVote.isPending}
      >
        {submitVote.isPending ? "Submitting..." : "Confirm Vote"}
      </Button>
    </div>
  );
}
