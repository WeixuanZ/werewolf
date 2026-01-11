import { useState } from "react";
import { Typography, Select, Button } from "antd";
import { useSubmitAction } from "../api/client";
import type { Player } from "../types";

const { Text } = Typography;

const ACTION_MAP: Record<string, string> = {
  WEREWOLF: "KILL",
  DOCTOR: "SAVE",
  SEER: "CHECK",
};

interface NightPanelProps {
  myRole: string;
  players: Player[];
  playerId: string;
  roomId: string;
  hasSubmittedAction?: boolean;
}

export function NightPanel({
  myRole,
  players,
  playerId,
  roomId,
  hasSubmittedAction = false,
}: NightPanelProps) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const submitAction = useSubmitAction(roomId);

  if (!myRole || ["VILLAGER", "SPECTATOR"].includes(myRole)) {
    return <Text>You are sleeping... 💤</Text>;
  }

  // Use server state or local state for submitted check
  if (hasSubmittedAction || submitAction.isSuccess) {
    return <Text>Waiting for night to end... 🌙</Text>;
  }

  const alivePlayers = players.filter((p) => p.is_alive);

  const handleSubmit = () => {
    if (!targetId) return;
    submitAction.mutate({
      playerId,
      actionType: ACTION_MAP[myRole],
      targetId,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Text>Select a target ({myRole}):</Text>
      <Select
        style={{ width: "100%" }}
        placeholder="Select target"
        onChange={setTargetId}
        value={targetId}
      >
        {alivePlayers.map((p) => (
          <Select.Option key={p.id} value={p.id}>
            {p.nickname} {p.id === playerId ? "(You)" : ""}
          </Select.Option>
        ))}
      </Select>
      <Button
        type="primary"
        onClick={handleSubmit}
        disabled={!targetId}
        loading={submitAction.isPending}
      >
        Submit Action
      </Button>
    </div>
  );
}
