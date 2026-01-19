import { useState, useEffect } from "react";
import { Typography, Button, theme, Progress, Avatar, Tooltip } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useSubmitAction } from "../api/client";
import { type Player, NightActionType, RoleType } from "../types";

const { Text, Title } = Typography;

interface WerewolfPanelProps {
  players: Player[];
  playerId: string;
  roomId: string;
  phaseStartTime?: number | null;
  phaseDurationSeconds: number;
}

export function WerewolfPanel({
  players,
  playerId,
  roomId,
  phaseStartTime,
  phaseDurationSeconds,
}: WerewolfPanelProps) {
  const { token } = theme.useToken();
  const submitAction = useSubmitAction(roomId);

  // Calculate remaining time
  const [timeLeft, setTimeLeft] = useState<number>(phaseDurationSeconds);
  const [hasAutoSkipped, setHasAutoSkipped] = useState(false);

  useEffect(() => {
    if (!phaseStartTime || phaseDurationSeconds <= 0) return;

    const interval = setInterval(() => {
      const now = Date.now() / 1000;
      const elapsed = now - phaseStartTime;
      const remaining = Math.max(0, phaseDurationSeconds - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0 && !hasAutoSkipped) {
        setHasAutoSkipped(true);
        // Auto-skip logic
        submitAction.mutate({
          playerId,
          actionType: NightActionType.SKIP,
          targetId: "SKIP",
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    phaseStartTime,
    phaseDurationSeconds,
    hasAutoSkipped,
    playerId,
    submitAction,
  ]);

  const handleActionSubmit = (actionType: string, tid: string | null) => {
    if (actionType === NightActionType.SKIP) {
      submitAction.mutate({ playerId, actionType, targetId: "SKIP" });
      return;
    }

    if (!tid) return;

    submitAction.mutate({
      playerId,
      actionType,
      targetId: tid,
    });
  };

  const alivePlayers = players.filter(
    (p) => p.is_alive && !p.is_spectator && p.id !== playerId,
  );
  const myPlayer = players.find((p) => p.id === playerId);
  const myTarget = myPlayer?.night_action_target;

  // Identify other werewolves and their targets
  const otherWerewolves = players.filter(
    (p) => p.role === RoleType.WEREWOLF && p.id !== playerId && p.is_alive,
  );

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.3)",
        borderRadius: token.borderRadiusLG,
        padding: token.paddingLG,
        border: `1px solid ${token.colorBorder}`,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: token.margin }}>
        <Title level={3} style={{ color: token.colorText, margin: 0 }}>
          🐺 Werewolf Council
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Agree on a single target to eliminate.
        </Text>
      </div>

      {/* Timer Bar */}
      {phaseStartTime && (
        <div style={{ marginBottom: token.marginLG }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text style={{ color: token.colorTextSecondary }}>
              Time Remaining
            </Text>
            <Text
              style={{
                color: timeLeft < 10 ? token.colorError : token.colorText,
              }}
            >
              {Math.ceil(timeLeft)}s
            </Text>
          </div>
          <Progress
            percent={(timeLeft / phaseDurationSeconds) * 100}
            showInfo={false}
            strokeColor={timeLeft < 10 ? token.colorError : token.colorPrimary}
            trailColor="rgba(255, 255, 255, 0.1)"
          />
        </div>
      )}

      {/* Targets Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 16,
          marginBottom: token.marginLG,
        }}
      >
        {alivePlayers.map((p) => {
          const isSelected = myTarget === p.id;
          // Find which other werewolves are targeting this player
          const targetingWerewolves = otherWerewolves.filter(
            (w) => w.night_action_target === p.id,
          );

          return (
            <button
              key={p.id}
              onClick={() => handleActionSubmit(NightActionType.KILL, p.id)}
              disabled={submitAction.isPending}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "16px",
                background: isSelected
                  ? `${token.colorPrimary}33`
                  : "rgba(255, 255, 255, 0.05)",
                border: `2px solid ${isSelected ? token.colorPrimary : "transparent"}`,
                borderRadius: token.borderRadiusLG,
                color: token.colorText,
                fontSize: 16,
                cursor: "pointer",
                transition: "all 0.2s",
                minHeight: "120px",
              }}
            >
              <Avatar
                size={48}
                style={{
                  marginBottom: 8,
                  backgroundColor: token.colorBgContainer,
                }}
                icon={<UserOutlined />}
              >
                {p.nickname[0]}
              </Avatar>
              <span
                style={{
                  fontWeight: 500,
                  textAlign: "center",
                  wordBreak: "break-word",
                }}
              >
                {p.nickname}
              </span>

              {/* Badges for other werewolves */}
              {targetingWerewolves.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 2,
                    maxWidth: 80,
                  }}
                >
                  {targetingWerewolves.map((w) => (
                    <Tooltip
                      key={w.id}
                      title={`${w.nickname} chose this target`}
                    >
                      <Avatar
                        size="small"
                        style={{
                          backgroundColor: token.colorError,
                          border: `1px solid ${token.colorBgBase}`,
                          fontSize: 10,
                        }}
                      >
                        {w.nickname[0]}
                      </Avatar>
                    </Tooltip>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          {myTarget === "SKIP" ? (
            <Text style={{ color: token.colorWarning }}>
              You voted to SKIP.
            </Text>
          ) : myTarget ? (
            <Text style={{ color: token.colorSuccess }}>Target selected.</Text>
          ) : (
            <Text style={{ color: token.colorTextSecondary }}>
              Select a target...
            </Text>
          )}
        </div>

        <Button
          danger={myTarget === "SKIP"}
          ghost={myTarget !== "SKIP"}
          onClick={() => handleActionSubmit(NightActionType.SKIP, null)}
          loading={submitAction.isPending && myTarget === "SKIP"}
        >
          Skip Night Action
        </Button>
      </div>

      {/* Consensus Info */}
      <div style={{ marginTop: 16, textAlign: "center" }}>
        {otherWerewolves.map((w) => (
          <div
            key={w.id}
            style={{ fontSize: 12, color: token.colorTextSecondary }}
          >
            {w.nickname} has selected:{" "}
            {w.night_action_target === "SKIP"
              ? "SKIP"
              : w.night_action_target
                ? players.find((p) => p.id === w.night_action_target)?.nickname
                : "Nothing"}
          </div>
        ))}
      </div>
    </div>
  );
}
