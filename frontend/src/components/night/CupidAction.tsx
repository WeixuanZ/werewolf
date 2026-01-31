import { useState } from 'react';
import { theme, Button, Typography, Badge, Tag } from 'antd';
import { HeartOutlined, HeartFilled } from '@ant-design/icons';
import { getRoleNameWithEmoji, getRoleEmoji, getRoleTheme } from '../../utils/roleUtils';
import { PhaseTimer } from '../game/PhaseTimer';
import type { Player } from '../../types';
import { NightActionType } from '../../types';

const { Title, Text } = Typography;

interface CupidActionProps {
  myRole: string;
  alivePlayers: Player[];
  nightInfo: { prompt?: string } | undefined;
  phaseStartTime: number | null | undefined;
  phaseDurationSeconds: number;
  timerEnabled: boolean;
  onSubmit: (actionType: string, tid: string | null | string[], confirmed?: boolean) => void;
  isPending: boolean;
  confirmedTargetId?: string | null;
}

export function CupidAction({
  myRole,
  alivePlayers,
  nightInfo,
  phaseStartTime,
  phaseDurationSeconds,
  timerEnabled,
  onSubmit,
  isPending,
  confirmedTargetId,
}: CupidActionProps) {
  const { token } = theme.useToken();
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  const isConfirmed = !!confirmedTargetId;
  const activeTargets = isConfirmed ? (confirmedTargetId as string).split(',') : selectedTargets;
  const roleTheme = getRoleTheme(myRole);

  const toggleTarget = (tid: string) => {
    if (isConfirmed) return;
    if (selectedTargets.includes(tid)) {
      setSelectedTargets(selectedTargets.filter((id) => id !== tid));
    } else {
      if (selectedTargets.length < 2) {
        setSelectedTargets([...selectedTargets, tid]);
      }
    }
  };

  const handleConfirm = () => {
    if (selectedTargets.length === 2) {
      onSubmit(NightActionType.LINK, selectedTargets, true);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(20, 20, 30, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: token.borderRadiusLG,
        padding: token.paddingLG,
        border: `2px solid ${isConfirmed ? token.colorSuccess : 'rgba(255, 255, 255, 0.1)'}`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        margin: '0 auto',
        maxWidth: 800,
      }}
    >
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: token.margin }}>
        <Title
          level={3}
          style={{
            margin: 0,
            color: roleTheme.primary,
            textShadow: `0 0 10px ${roleTheme.shadow}`,
          }}
        >
          {getRoleNameWithEmoji(myRole)}
          {isConfirmed && (
            <Tag color="success" style={{ verticalAlign: 'middle', marginLeft: 8 }}>
              COMPLETED
            </Tag>
          )}
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          {isConfirmed
            ? 'Lovers linked. Waiting for night to end...'
            : nightInfo?.prompt || 'Choose two players to fall in love.'}
        </Text>
      </div>

      {/* Timer Bar */}
      <PhaseTimer
        key={phaseStartTime}
        phaseStartTime={phaseStartTime}
        phaseDurationSeconds={phaseDurationSeconds}
        timerEnabled={timerEnabled}
        onExpire={() => onSubmit(NightActionType.SKIP, null, true)}
      />

      {/* Targets Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 16,
          marginBottom: token.marginLG,
          flex: 1,
          alignContent: 'start',
          overflowY: 'auto',
          padding: 4,
        }}
      >
        {alivePlayers.map((p) => {
          const isSelected = activeTargets.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggleTarget(p.id)}
              disabled={isConfirmed || (selectedTargets.length >= 2 && !isSelected) || isPending}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '16px',
                background: isSelected ? `${roleTheme.primary}33` : 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${isSelected ? roleTheme.primary : 'transparent'}`,
                borderRadius: token.borderRadiusLG,
                color: token.colorText,
                cursor: isConfirmed ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                minHeight: 160,
                opacity:
                  isConfirmed && !isSelected
                    ? 0.5
                    : selectedTargets.length >= 2 && !isSelected
                      ? 0.5
                      : 1,
              }}
            >
              <Badge
                count={isSelected ? <HeartFilled style={{ color: roleTheme.primary }} /> : 0}
                offset={[-5, 5]}
              >
                <span style={{ fontSize: 32, marginBottom: 8 }}>
                  {p.role ? getRoleEmoji(p.role) : '👤'}
                </span>
              </Badge>
              <span
                style={{
                  fontWeight: 500,
                  textAlign: 'center',
                  fontSize: 18,
                  lineHeight: 1.2,
                  marginBottom: 12,
                }}
              >
                {p.nickname}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions Section */}
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
          {activeTargets.length === 2 ? (
            <Text style={{ color: roleTheme.primary }}>
              {isConfirmed ? 'Lovers linked.' : 'Selection complete. Confirm to link them.'}
            </Text>
          ) : (
            <Text style={{ color: token.colorTextSecondary }}>
              Select {2 - activeTargets.length} more player(s)...
            </Text>
          )}
        </div>

        {!isConfirmed && (
          <Button
            type="primary"
            block
            size="large"
            icon={<HeartOutlined />}
            disabled={activeTargets.length !== 2 || isPending}
            onClick={handleConfirm}
            style={{
              height: 48,
              fontSize: 18,
              // Use role-based color for the action button
              backgroundColor: activeTargets.length === 2 ? roleTheme.primary : undefined,
            }}
          >
            {`Link Lovers (${activeTargets.length}/2)`}
          </Button>
        )}

        <Button
          type="default"
          block
          size="large"
          style={{ height: 48, fontSize: 18 }}
          onClick={() => onSubmit(NightActionType.SKIP, null, true)}
          disabled={isConfirmed || isPending}
        >
          Skip Action
        </Button>
      </div>
    </div>
  );
}
