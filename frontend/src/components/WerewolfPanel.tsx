import { Typography, Button, theme, Avatar, Tooltip, Tag } from 'antd';
import { getRoleEmoji } from '../utils/roleUtils';
import { useSubmitAction } from '../api/client';
import { RoleType, NightActionType } from '../types';
import type { Player } from '../types';
import { PhaseTimer } from './PhaseTimer';

const { Text, Title } = Typography;

interface WerewolfPanelProps {
  players: Player[];
  playerId: string;
  roomId: string;
  phaseStartTime?: number | null;
  phaseDurationSeconds: number;
  timerEnabled?: boolean;
}

export function WerewolfPanel({
  players,
  playerId,
  roomId,
  phaseStartTime,
  phaseDurationSeconds,
  timerEnabled = true,
}: WerewolfPanelProps) {
  const { token } = theme.useToken();
  const submitAction = useSubmitAction(roomId);

  const handleActionSubmit = (
    actionType: string,
    tid: string | null,
    confirmed: boolean = false,
  ) => {
    if (actionType === NightActionType.SKIP) {
      submitAction.mutate({
        playerId,
        actionType,
        targetId: 'SKIP',
        confirmed: true,
      });
      return;
    }

    if (!tid) return;

    submitAction.mutate({
      playerId,
      actionType,
      targetId: tid,
      confirmed,
    });
  };

  const alivePlayers = players.filter((p) => p.is_alive && !p.is_spectator);
  const myPlayer = players.find((p) => p.id === playerId);
  const myTarget = myPlayer?.night_action_target;
  const isMyActionConfirmed = myPlayer?.night_action_confirmed;

  // Identify other werewolves and their targets
  const otherWerewolves = players.filter(
    (p) => p.role === RoleType.WEREWOLF && p.id !== playerId && p.is_alive,
  );

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: token.borderRadiusLG,
        padding: token.paddingLG,
        border: `2px solid ${isMyActionConfirmed ? token.colorSuccess : token.colorBorder}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: token.margin }}>
        <Title level={3} style={{ color: token.colorText, margin: 0 }}>
          {otherWerewolves.length > 0 ? '🐺 Werewolf Council ' : '🐺 Werewolf Action '}
          {isMyActionConfirmed && (
            <Tag color="success" style={{ verticalAlign: 'middle' }}>
              LOCKED
            </Tag>
          )}
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          {otherWerewolves.length > 0
            ? 'Select a target. Vote together to eliminate.'
            : 'Select a target to eliminate.'}
        </Text>
      </div>

      {/* Timer Bar */}
      <PhaseTimer
        key={phaseStartTime}
        phaseStartTime={phaseStartTime}
        phaseDurationSeconds={phaseDurationSeconds}
        timerEnabled={timerEnabled}
        onExpire={() => handleActionSubmit(NightActionType.SKIP, 'SKIP', true)}
      />

      {/* Targets Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 16,
          marginBottom: token.marginLG,
          flex: 1,
        }}
      >
        {alivePlayers.map((p) => {
          const isSelected = myTarget === p.id;
          const targetingWerewolves = otherWerewolves.filter((w) => w.night_action_target === p.id);

          return (
            <button
              key={p.id}
              onClick={() => handleActionSubmit(NightActionType.KILL, p.id, false)}
              disabled={isMyActionConfirmed || submitAction.isPending}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '16px',
                background: isSelected ? `${token.colorPrimary}33` : 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${isSelected ? token.colorPrimary : 'transparent'}`,
                borderRadius: token.borderRadiusLG,
                color: token.colorText,
                fontSize: 18,
                cursor: isMyActionConfirmed ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                minHeight: '160px',
                opacity: isMyActionConfirmed && !isSelected ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 32, marginBottom: 8 }}>
                {p.role ? getRoleEmoji(p.role) : '👤'}
              </span>
              <span
                style={{
                  fontWeight: 500,
                  textAlign: 'center',
                  marginBottom: 12,
                  lineHeight: 1.2,
                }}
              >
                {p.nickname}
              </span>

              {/* Collaborative Avatars Footer */}
              <div
                style={{
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                {targetingWerewolves.length > 0 ? (
                  <Avatar.Group maxCount={3} size="small">
                    {targetingWerewolves.map((w) => (
                      <Tooltip
                        key={w.id}
                        title={`${w.nickname} ${
                          w.night_action_confirmed
                            ? 'confirmed this target'
                            : 'selected this target'
                        }`}
                      >
                        <div style={{ position: 'relative' }}>
                          <Avatar
                            style={{
                              backgroundColor: token.colorError,
                              border: `2px solid ${token.colorBgBase}`,
                              cursor: 'help',
                              opacity: w.night_action_confirmed ? 1 : 0.6,
                            }}
                          >
                            {w.nickname[0].toUpperCase()}
                          </Avatar>
                          {w.night_action_confirmed && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: -4,
                                right: -4,
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: token.colorSuccess,
                                border: `2px solid ${token.colorBgBase}`,
                              }}
                            />
                          )}
                        </div>
                      </Tooltip>
                    ))}
                  </Avatar.Group>
                ) : (
                  <div style={{ height: 24 }} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {myTarget === 'SKIP' ? (
            <Text style={{ color: token.colorWarning }}>You voted to SKIP.</Text>
          ) : myTarget ? (
            <Text style={{ color: token.colorSuccess }}>
              {isMyActionConfirmed
                ? 'Target confirmed. Waiting for others to confirm...'
                : 'Target selected. Confirm to lock in your vote.'}
            </Text>
          ) : (
            <Text style={{ color: token.colorTextSecondary }}>Select a target...</Text>
          )}
        </div>

        {/* Confirm / Unlock Button */}
        <Button
          type={isMyActionConfirmed ? 'default' : 'primary'}
          block
          size="large"
          disabled={!myTarget}
          onClick={() => {
            if (isMyActionConfirmed) {
              // Unlock: send confirmed=false
              if (myTarget) {
                // If target is SKIP, we send "SKIP" as targetId with confirmed=false
                const targetToSend = myTarget === 'SKIP' ? 'SKIP' : myTarget;
                handleActionSubmit(NightActionType.KILL, targetToSend, false);
              }
            } else {
              // Confirm: send confirmed=true
              if (myTarget) {
                const targetToSend = myTarget === 'SKIP' ? 'SKIP' : myTarget;
                handleActionSubmit(NightActionType.KILL, targetToSend, true);
              }
            }
          }}
          style={{ height: 48, fontSize: 18 }}
        >
          {isMyActionConfirmed ? 'Unlock Selection' : 'Confirm Target'}
        </Button>

        {/* Skip Button */}
        <Button
          type={myTarget === 'SKIP' ? 'primary' : 'default'}
          danger={myTarget === 'SKIP'}
          block
          size="large"
          style={{ height: 48, fontSize: 18 }}
          onClick={() => handleActionSubmit(NightActionType.SKIP, null, true)}
          disabled={isMyActionConfirmed}
          loading={submitAction.isPending && myTarget === 'SKIP'}
        >
          Skip Night Action
        </Button>
      </div>

      {/* SKIP Voters */}
      {otherWerewolves.some((w) => w.night_action_target === 'SKIP') && (
        <div
          style={{
            marginTop: 16,
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text type="secondary">Skipping:</Text>
          <Avatar.Group maxCount={5} size="small">
            {otherWerewolves
              .filter((w) => w.night_action_target === 'SKIP')
              .map((w) => (
                <Tooltip
                  key={w.id}
                  title={`${w.nickname} is skipping ${
                    w.night_action_confirmed ? '(Confirmed)' : '(Pending)'
                  }`}
                >
                  <Avatar
                    style={{
                      backgroundColor: token.colorWarning,
                      color: token.colorTextLightSolid,
                      opacity: w.night_action_confirmed ? 1 : 0.6,
                    }}
                  >
                    {w.nickname[0]}
                  </Avatar>
                </Tooltip>
              ))}
          </Avatar.Group>
        </div>
      )}
    </div>
  );
}
