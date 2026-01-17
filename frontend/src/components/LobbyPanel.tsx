import { useState } from "react";
import { getRoleNameWithEmoji } from "../utils/roleUtils";
import {
  Card,
  Form,
  InputNumber,
  Button,
  Spin,
  Typography,
  message,
  theme,
} from "antd";

const { Text } = Typography;
const { useToken } = theme;

import { type GameSettings, RoleType } from "../types";

function getDefaultRoles(playerCount: number): Record<RoleType, number> {
  const defaults: Record<RoleType, number> = {
    [RoleType.WEREWOLF]: 1,
    [RoleType.SEER]: 1,
    [RoleType.DOCTOR]: 1,
    [RoleType.WITCH]: 0,
    [RoleType.HUNTER]: 0,
    [RoleType.VILLAGER]: 0,
    [RoleType.SPECTATOR]: 0,
  };

  if (playerCount <= 4) {
    // 4 players: 1 Wolf, 1 Seer, 2 Villagers
    defaults[RoleType.DOCTOR] = 0;
    defaults[RoleType.VILLAGER] = Math.max(0, playerCount - 2);
    return defaults;
  }

  // 5+ players: 1 Wolf, 1 Seer, 1 Doctor
  if (playerCount <= 6) {
    defaults[RoleType.VILLAGER] = playerCount - 3;
    return defaults;
  }

  // 7+ players: Add Witch
  if (playerCount <= 8) {
    defaults[RoleType.WITCH] = 1;
    defaults[RoleType.VILLAGER] = playerCount - 4;
    return defaults;
  }

  // 9+ players: Add Hunter
  defaults[RoleType.WITCH] = 1;
  defaults[RoleType.HUNTER] = 1;
  defaults[RoleType.WEREWOLF] = 2; // Extra wolf for balance
  defaults[RoleType.VILLAGER] = Math.max(0, playerCount - 6);
  return defaults;
}

interface LobbyPanelProps {
  isAdmin: boolean;
  playerCount: number;
  onStartGame: (settings: GameSettings) => Promise<void>;
}

export function LobbyPanel({
  isAdmin,
  playerCount,
  onStartGame,
}: LobbyPanelProps) {
  const { token } = useToken();
  const [settings, setSettings] = useState<GameSettings>({
    role_distribution: getDefaultRoles(playerCount),
    phase_duration_seconds: 60,
  });
  const [loading, setLoading] = useState(false);

  const [prevPlayerCount, setPrevPlayerCount] = useState(playerCount);
  if (playerCount !== prevPlayerCount) {
    setPrevPlayerCount(playerCount);
    setSettings((prev) => ({
      ...prev,
      role_distribution: getDefaultRoles(playerCount),
    }));
  }

  const updateRole = (role: RoleType, count: number | null) => {
    setSettings((prev) => ({
      ...prev,
      role_distribution: { ...prev.role_distribution, [role]: count ?? 0 },
    }));
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

  if (!isAdmin) {
    return (
      <div style={{ textAlign: "center", padding: token.paddingLG }}>
        <Spin />
        <Text type="secondary" style={{ display: "block", marginTop: 10 }}>
          Waiting for admin to start...
        </Text>
      </div>
    );
  }

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
      style={{ display: "flex", flexDirection: "column", gap: token.marginLG }}
    >
      <Card title="Game Configuration">
        <Form layout="vertical">
          <div style={{ display: "flex", gap: token.margin, flexWrap: "wrap" }}>
            {roles.map((role) => (
              <Form.Item
                key={role}
                label={getRoleNameWithEmoji(role)}
                style={{ flex: 1, minWidth: 100 }}
              >
                <InputNumber
                  min={0}
                  value={settings.role_distribution[role]}
                  onChange={(v) => updateRole(role, v)}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            ))}
          </div>
          <Text type={isValid ? "success" : "danger"}>
            Total: {totalRoles} / {playerCount} players
          </Text>
        </Form>
      </Card>
      <div style={{ textAlign: "center" }}>
        <Button
          type="primary"
          size="large"
          onClick={handleStart}
          loading={loading}
          disabled={!isValid}
        >
          Start Game
        </Button>
      </div>
    </div>
  );
}
