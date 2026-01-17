import { Card, Tag, theme } from "antd";
import { getRoleNameWithEmoji } from "../utils/roleUtils";
import type { Player } from "../types";

const { useToken } = theme;

interface PlayerCardProps {
  player: Player;
  isMe: boolean;
}

function PlayerCard({ player, isMe }: PlayerCardProps) {
  const { token } = useToken();
  const statusColor = player.is_online ? token.colorSuccess : token.colorError;

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        border: `1px solid ${token.colorBorder}`,
        borderRadius: token.borderRadius,
        padding: 12,
        minHeight: 100,
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
        }}
      >
        <span
          style={{
            fontWeight: 600,
            color: token.colorText,
            fontSize: 14,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {player.nickname}
        </span>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: statusColor,
            flexShrink: 0,
            marginLeft: 8,
            boxShadow: player.is_online
              ? `0 0 8px ${token.colorSuccess}`
              : "none",
            transition: "all 0.3s ease",
          }}
          title={player.is_online ? "Online" : "Offline"}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
        <Tag color={player.is_alive ? "success" : "default"} bordered={false}>
          {player.is_alive ? "Alive" : "Dead"}
        </Tag>
        {player.role && (
          <Tag color="purple">{getRoleNameWithEmoji(player.role)}</Tag>
        )}
        {isMe && <Tag color="gold">YOU</Tag>}
        {player.is_admin && <Tag color="red">ADMIN</Tag>}
      </div>
    </div>
  );
}

interface PlayerListProps {
  players: Player[];
  myId: string | null;
}

export function PlayerList({ players, myId }: PlayerListProps) {
  return (
    <Card title={`Players (${players.length})`}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isMe={player.id === myId}
          />
        ))}
      </div>
    </Card>
  );
}
