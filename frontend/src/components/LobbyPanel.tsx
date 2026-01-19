import { useState } from "react";
import { getRoleNameWithEmoji } from "../utils/roleUtils";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";
import { Card, Button, Spin, Typography, message, theme } from "antd";
import { useCurrentSession } from "../store/gameStore";
import { useUpdateSettings } from "../api/client";

const { Text } = Typography;
const { useToken } = theme;

import { type GameSettings, RoleType } from "../types";

interface LobbyPanelProps {
  isAdmin: boolean;
  playerCount: number;
  onStartGame: (settings: GameSettings) => Promise<void>;
  serverSettings?: GameSettings;
}

export function LobbyPanel({
  isAdmin,
  playerCount,
  onStartGame,
  serverSettings,
}: LobbyPanelProps) {
  const { token } = useToken();
  const [session] = useCurrentSession();
  const roomId = window.location.pathname.split("/").pop() || "";
  const { mutate: updateSettings } = useUpdateSettings(roomId);

  const [settings, setSettings] = useState<GameSettings>(
    serverSettings || {
      role_distribution: {
        [RoleType.WEREWOLF]: 1,
        [RoleType.SEER]: 1,
        [RoleType.DOCTOR]: 1,
        [RoleType.WITCH]: 0,
        [RoleType.HUNTER]: 0,
        [RoleType.VILLAGER]: 0,
        [RoleType.SPECTATOR]: 0,
      },
      phase_duration_seconds: 60,
    },
  );
  const [loading, setLoading] = useState(false);

  // Sync with server settings
  const [prevServerSettings, setPrevServerSettings] = useState(serverSettings);
  if (serverSettings !== prevServerSettings) {
    setPrevServerSettings(serverSettings);
    if (serverSettings) {
      setSettings(serverSettings);
    }
  }

  const updateRole = (role: RoleType, value: number) => {
    const newSettings = {
      ...settings,
      role_distribution: { ...settings.role_distribution, [role]: value },
    };
    setSettings(newSettings); // Optimistic update
    if (session?.playerId) {
      updateSettings({
        playerId: session.playerId,
        settings: newSettings,
      });
    }
  };

  const totalRoles = Object.values(settings.role_distribution).reduce(
    (a, b) => a + b,
    0,
  );
  const isValid = totalRoles === playerCount;

  const handleStart = async () => {
    if (!isValid) {
      message.warning(
        `Role count (${totalRoles}) must equal player count (${playerCount})`,
      );
      return;
    }
    setLoading(true);
    await onStartGame(settings);
    setLoading(false);
  };

  const roles = [
    RoleType.WEREWOLF,
    RoleType.SEER,
    RoleType.DOCTOR,
    RoleType.WITCH,
    RoleType.HUNTER,
    RoleType.VILLAGER,
  ];

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: token.margin }}
    >
      <Card title="Game Configuration">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: token.margin,
          }}
        >
          {roles.map((role) => {
            const count = settings.role_distribution[role];
            return (
              <div
                key={role}
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  borderRadius: token.borderRadiusLG,
                  padding: token.padding,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: token.marginSM,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <Text
                  strong
                  style={{
                    fontSize: 14,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getRoleNameWithEmoji(role)}
                </Text>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: token.marginSM,
                    background: "rgba(0, 0, 0, 0.2)",
                    borderRadius: token.borderRadius,
                    padding: 4,
                  }}
                >
                  {isAdmin && (
                    <Button
                      type="text"
                      icon={<MinusOutlined style={{ fontSize: 20 }} />}
                      onClick={() => updateRole(role, Math.max(0, count - 1))}
                      disabled={count <= 0}
                      style={{
                        color: token.colorText,
                        width: 44,
                        height: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    />
                  )}
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "bold",
                      minWidth: 32,
                      textAlign: "center",
                    }}
                  >
                    {count}
                  </Text>
                  {isAdmin && (
                    <Button
                      type="text"
                      icon={<PlusOutlined style={{ fontSize: 20 }} />}
                      onClick={() => updateRole(role, count + 1)}
                      style={{
                        color: token.colorText,
                        width: 44,
                        height: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: token.marginLG, textAlign: "center" }}>
          <Text
            type={isValid ? "success" : "danger"}
            style={{ fontSize: 16, display: "block", marginBottom: 8 }}
          >
            Total: {totalRoles} / {playerCount} players
          </Text>
        </div>
      </Card>

      {isAdmin ? (
        <Button
          type="primary"
          size="large"
          onClick={handleStart}
          loading={loading}
          disabled={!isValid}
          block
          style={{ height: 56, fontSize: 20 }}
        >
          Start Game
        </Button>
      ) : (
        <div style={{ textAlign: "center", padding: 12 }}>
          <Spin />
          <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            Host is configuring the game...
          </Text>
        </div>
      )}
    </div>
  );
}
