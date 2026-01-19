import { useState } from "react";
import { Card, Tag, theme, Button, Modal } from "antd";
import { getRoleNameWithEmoji } from "../utils/roleUtils";
import { DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import type { Player } from "../types";

const { useToken } = theme;

interface PlayerCardProps {
  player: Player;
  isMe: boolean;
  canKick: boolean;
  onKick: () => void;
}

function PlayerCard({ player, isMe, canKick, onKick }: PlayerCardProps) {
  const { token } = useToken();
  const statusColor = player.is_online ? token.colorSuccess : token.colorError;

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        border: `1px solid ${token.colorBorder}`,
        borderRadius: token.borderRadius,
        padding: 16,
        minHeight: 120,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: 44, // Match button height for alignment
        }}
      >
        <span
          style={{
            fontWeight: 600,
            color: token.colorText,
            fontSize: 18, // Increased for better legibility
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            marginRight: 8,
            lineHeight: "44px", // Vertical center
          }}
        >
          {player.nickname}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: "100%",
          }}
        >
          {canKick && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined style={{ fontSize: 20 }} />}
              onClick={onKick}
              style={{
                width: 44,
                height: 44,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
          )}
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: statusColor,
              flexShrink: 0,
              boxShadow: player.is_online
                ? `0 0 8px ${token.colorSuccess}`
                : "none",
              transition: "all 0.3s ease",
            }}
            title={player.is_online ? "Online" : "Offline"}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {player.is_spectator ? (
          <Tag color="cyan" style={{ padding: "4px 8px", fontSize: 13 }}>
            SPECTATOR
          </Tag>
        ) : (
          <Tag
            color={player.is_alive ? "success" : "default"}
            bordered={false}
            style={{ padding: "4px 8px", fontSize: 13 }}
          >
            {player.is_alive ? "Alive" : "Dead"}
          </Tag>
        )}
        {player.role && !player.is_spectator && (
          <Tag color="purple" style={{ padding: "4px 8px", fontSize: 13 }}>
            {getRoleNameWithEmoji(player.role)}
          </Tag>
        )}
        {isMe && (
          <Tag color="gold" style={{ padding: "4px 8px", fontSize: 13 }}>
            YOU
          </Tag>
        )}
        {player.is_admin && (
          <Tag color="red" style={{ padding: "4px 8px", fontSize: 13 }}>
            ADMIN
          </Tag>
        )}
      </div>
    </div>
  );
}

interface PlayerListProps {
  players: Player[];
  myId: string | null;
  onKick?: (targetId: string) => void;
}

export function PlayerList({ players, myId, onKick }: PlayerListProps) {
  const me = players.find((p) => p.id === myId);
  const amIAdmin = me?.is_admin ?? false;
  const [kickTarget, setKickTarget] = useState<Player | null>(null);

  const handleKickClick = (player: Player) => {
    setKickTarget(player);
  };

  const confirmKick = () => {
    if (kickTarget && onKick) {
      onKick(kickTarget.id);
      setKickTarget(null);
    }
  };

  return (
    <>
      <Card title={`Players (${players.length})`}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 16,
          }}
        >
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isMe={player.id === myId}
              canKick={amIAdmin && player.id !== myId && !!onKick}
              onKick={() => handleKickClick(player)}
            />
          ))}
        </div>
      </Card>

      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ExclamationCircleOutlined style={{ color: "#faad14" }} />
            <span>Kick Player</span>
          </div>
        }
        open={!!kickTarget}
        onCancel={() => setKickTarget(null)}
        footer={
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <Button
              onClick={() => setKickTarget(null)}
              size="large"
              style={{ flex: 1, height: 48 }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              danger
              onClick={confirmKick}
              size="large"
              style={{ flex: 1, height: 48 }}
            >
              Kick
            </Button>
          </div>
        }
        centered
      >
        <p style={{ fontSize: 16, margin: "16px 0" }}>
          Are you sure you want to remove{" "}
          <strong>{kickTarget?.nickname}</strong> from the game?
        </p>
      </Modal>
    </>
  );
}
