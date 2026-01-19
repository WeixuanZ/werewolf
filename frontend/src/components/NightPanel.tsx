import { useState } from 'react';
import { getRoleNameWithEmoji } from '../utils/roleUtils';
import { Typography, Button, theme, Space, Tag } from 'antd';
import { useSubmitAction } from '../api/client';
import { NightActionType, RoleType } from '../types';
import type { Player } from '../types';
import { WerewolfPanel } from './WerewolfPanel';

const { Text } = Typography;

import { PhaseTimer } from './PhaseTimer';

interface NightPanelProps {
  myRole: string;
  players: Player[];
  playerId: string;
  roomId: string;
  hasSubmittedAction?: boolean;
  phaseStartTime?: number | null;
  phaseDurationSeconds?: number;
  timerEnabled?: boolean;
}

export function NightPanel({
  myRole,
  players,
  playerId,
  roomId,
  hasSubmittedAction = false,
  phaseStartTime,
  phaseDurationSeconds = 60,
  timerEnabled = true,
}: NightPanelProps) {
  const { token } = theme.useToken();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const submitAction = useSubmitAction(roomId);

  // Special handling for Werewolf role (live voting)
  if (myRole === RoleType.WEREWOLF) {
    return (
      <WerewolfPanel
        players={players}
        playerId={playerId}
        roomId={roomId}
        phaseStartTime={phaseStartTime}
        phaseDurationSeconds={phaseDurationSeconds}
        timerEnabled={timerEnabled}
      />
    );
  }

  const me = players.find((p) => p.id === playerId);
  const nightInfo = me?.night_info;
  const actionsAvailable = nightInfo?.actions_available || [];

  const handleActionSubmit = (actionType: string, tid: string | null) => {
    // Validation: Must have target unless it is SKIP or implicit HEAL
    if (!tid && actionType !== NightActionType.HEAL && actionType !== NightActionType.SKIP) return;

    // For Witch HEAL, target is implied as victim if not provided, but mostly provided by button click context
    const finalTarget = actionType === NightActionType.HEAL ? tid || nightInfo?.victim_id : tid;

    // Skip allows no target, send "SKIP" keyword to backend
    if (actionType === NightActionType.SKIP) {
      submitAction.mutate({ playerId, actionType, targetId: 'SKIP' });
      return;
    }

    if (!finalTarget) return;

    submitAction.mutate({
      playerId,
      actionType,
      targetId: finalTarget,
    });
  };

  if (!myRole || ['VILLAGER', 'SPECTATOR'].includes(myRole)) {
    return (
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: token.borderRadiusLG,
          padding: token.paddingLG,
          border: `1px solid ${token.colorBorder}`,
          textAlign: 'center',
        }}
      >
        <PhaseTimer
          key={phaseStartTime}
          phaseStartTime={phaseStartTime}
          phaseDurationSeconds={phaseDurationSeconds}
          timerEnabled={timerEnabled}
        />
        <Text style={{ fontSize: 16 }}>You are sleeping... 💤</Text>
      </div>
    );
  }

  if (hasSubmittedAction || submitAction.isSuccess) {
    return (
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: token.borderRadiusLG,
          padding: token.paddingLG,
          border: `1px solid ${token.colorBorder}`,
          textAlign: 'center',
        }}
      >
        <PhaseTimer
          key={phaseStartTime}
          phaseStartTime={phaseStartTime}
          phaseDurationSeconds={phaseDurationSeconds}
          timerEnabled={timerEnabled}
        />
        <div style={{ color: token.colorSuccess, fontSize: 16, marginBottom: 8 }}>
          ✅ Action submitted
        </div>
        <div style={{ color: token.colorTextSecondary }}>Waiting for night to end... 🌙</div>
      </div>
    );
  }

  const alivePlayers = players.filter((p) => p.is_alive && !p.is_spectator);

  // WITCH SPECIFIC UI
  if (myRole === 'WITCH') {
    // Since actionsAvailable is explicitly typed now, we can check directly
    const canHeal = actionsAvailable.includes(NightActionType.HEAL) && me?.witch_has_heal;
    const canPoison = actionsAvailable.includes(NightActionType.POISON) && me?.witch_has_poison;
    const victimId = nightInfo?.victim_id;

    return (
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: token.borderRadiusLG,
          padding: token.paddingLG,
          border: `1px solid ${token.colorBorder}`,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: token.margin }}>
          <h3 style={{ color: token.colorText, margin: 0 }}>{getRoleNameWithEmoji(myRole)}</h3>
          <p style={{ color: token.colorTextSecondary, marginTop: 8 }}>
            {nightInfo?.prompt || me?.role_description}
          </p>
          <PhaseTimer
            key={phaseStartTime}
            phaseStartTime={phaseStartTime}
            phaseDurationSeconds={phaseDurationSeconds}
            timerEnabled={timerEnabled}
            onExpire={() => handleActionSubmit(NightActionType.SKIP, null)}
          />
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* HEAL SECTION */}
          <div
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              padding: 12,
              borderRadius: 8,
            }}
          >
            <div
              style={{
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Text strong>Potion of Healing</Text>
              <Tag color={me?.witch_has_heal ? 'green' : 'red'}>
                {me?.witch_has_heal ? 'Available' : 'Empty'}
              </Tag>
            </div>
            {victimId ? (
              <Button
                block
                type="primary"
                ghost
                disabled={!canHeal}
                onClick={() => handleActionSubmit(NightActionType.HEAL, victimId)}
                size="large"
                style={{ height: 56, fontSize: 20 }}
              >
                Heal {players.find((p) => p.id === victimId)?.nickname || 'Victim'}
              </Button>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                No victim to heal yet.
              </Text>
            )}
          </div>

          {/* POISON SECTION */}
          <div
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              padding: 12,
              borderRadius: 8,
            }}
          >
            <div
              style={{
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Text strong>Potion of Poison</Text>
              <Tag color={me?.witch_has_poison ? 'green' : 'red'}>
                {me?.witch_has_poison ? 'Available' : 'Empty'}
              </Tag>
            </div>

            {selectedAction === NightActionType.POISON ? (
              <div>
                <Text style={{ display: 'block', marginBottom: 8 }}>
                  Select a player to poison:
                </Text>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 8,
                  }}
                >
                  {alivePlayers.map((p) => (
                    <Button
                      key={p.id}
                      onClick={() => handleActionSubmit(NightActionType.POISON, p.id)}
                      danger
                      size="large"
                      style={{ height: 60, whiteSpace: 'normal' }}
                    >
                      {p.nickname}
                    </Button>
                  ))}
                  <Button onClick={() => setSelectedAction(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button
                block
                danger
                disabled={!canPoison}
                onClick={() => setSelectedAction(NightActionType.POISON)}
                size="large"
                style={{ height: 56, fontSize: 20 }}
              >
                Use Poison...
              </Button>
            )}
          </div>

          <Button
            block
            size="large"
            style={{ height: 56, fontSize: 20 }}
            onClick={() => handleActionSubmit(NightActionType.SKIP, null)}
            disabled={submitAction.isPending}
          >
            Skip Turn
          </Button>
        </Space>
      </div>
    );
  }

  // GENERIC UI (Werewolf, Seer, Doctor, Hunter)
  // Assumes single action type available for these roles
  const defaultAction = actionsAvailable[0] || 'ACTION';

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: token.borderRadiusLG,
        padding: token.paddingLG,
        border: `1px solid ${token.colorBorder}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: token.margin }}>
        <h3 style={{ color: token.colorText, margin: 0 }}>{getRoleNameWithEmoji(myRole)}</h3>
        <p style={{ color: token.colorTextSecondary, margin: '8px 0 0' }}>
          {nightInfo?.prompt || 'Select a target.'}
        </p>
        <PhaseTimer
          key={phaseStartTime}
          phaseStartTime={phaseStartTime}
          phaseDurationSeconds={phaseDurationSeconds}
          timerEnabled={timerEnabled}
          onExpire={() => handleActionSubmit(NightActionType.SKIP, null)}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 16,
          marginBottom: token.marginLG,
          flex: 1,
        }}
      >
        {alivePlayers.map((p) => (
          <button
            key={p.id}
            onClick={() => setTargetId(p.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '16px',
              background:
                targetId === p.id ? `${token.colorPrimary}33` : 'rgba(255, 255, 255, 0.05)',
              border: `2px solid ${targetId === p.id ? token.colorPrimary : 'transparent'}`,
              borderRadius: token.borderRadiusLG,
              color: token.colorText,
              fontSize: 18,
              cursor: 'pointer',
              transition: 'all 0.2s',
              minHeight: '160px',
            }}
          >
            <span style={{ fontSize: 32, marginBottom: 8 }}>👤</span>
            <span style={{ fontWeight: 500, textAlign: 'center' }}>{p.nickname}</span>
          </button>
        ))}
      </div>

      <Button
        type="primary"
        block
        size="large"
        style={{ height: 56, fontSize: 20 }}
        onClick={() => handleActionSubmit(defaultAction, targetId)}
        disabled={!targetId}
        loading={submitAction.isPending}
      >
        Confirm {defaultAction}
      </Button>

      <Button
        type="default"
        block
        size="large"
        style={{ height: 56, fontSize: 20, marginTop: 16 }}
        onClick={() => handleActionSubmit(NightActionType.SKIP, null)}
        disabled={submitAction.isPending}
      >
        Skip Action
      </Button>
    </div>
  );
}
