import { useState } from 'react';
import { theme, Button, Typography, Badge, Tag } from 'antd';
import { HeartOutlined, HeartFilled, StopOutlined } from '@ant-design/icons';
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
      <div style={{ marginBottom: 16 }}>
        <PhaseTimer
          key={phaseStartTime}
          phaseStartTime={phaseStartTime}
          phaseDurationSeconds={phaseDurationSeconds}
          timerEnabled={timerEnabled}
          onExpire={() => onSubmit(NightActionType.SKIP, null, true)}
        />
      </div>

      {/* Targets Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 16,
          marginBottom: 24,
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
                background: isSelected ? roleTheme.shadow : 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${isSelected ? roleTheme.secondary : 'transparent'}`,
                borderRadius: token.borderRadiusLG,
                color: token.colorText,
                cursor: isConfirmed ? 'default' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSelected ? `0 0 15px ${roleTheme.shadow}` : 'none',
                minHeight: 160,
                opacity:
                  isConfirmed && !isSelected
                    ? 0.5
                    : selectedTargets.length >= 2 && !isSelected
                      ? 0.3
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
        {!isConfirmed && (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            {activeTargets.length === 2 ? (
              <Text style={{ color: roleTheme.primary }}>
                Selection complete. Confirm to link them.
              </Text>
            ) : (
              <Text style={{ color: token.colorTextSecondary }}>
                Select {2 - activeTargets.length} more player(s)...
              </Text>
            )}
          </div>
        )}

        {isConfirmed ? (
          <div
            style={{
              padding: 16,
              background: 'rgba(46, 125, 50, 0.2)',
              borderRadius: 8,
              border: '1px solid rgba(46, 125, 50, 0.5)',
              textAlign: 'center',
              color: '#a5d6a7',
              width: '100%',
            }}
          >
            <HeartFilled style={{ marginRight: 8 }} />
            Cupid's Arrows Fired
          </div>
        ) : (
          <>
            <Button
              type="primary"
              block
              size="large"
              icon={<HeartOutlined />}
              disabled={activeTargets.length !== 2 || isPending}
              onClick={handleConfirm}
              style={{
                height: 50,
                fontSize: 18,
                borderRadius: 25,
                background:
                  activeTargets.length === 2
                    ? `linear-gradient(135deg, ${roleTheme.secondary} 0%, ${roleTheme.primary} 100%)`
                    : undefined,
                border: activeTargets.length === 2 ? 'none' : undefined,
                boxShadow: activeTargets.length === 2 ? `0 4px 15px ${roleTheme.shadow}` : 'none',
              }}
            >
              {`Link Lovers (${activeTargets.length}/2)`}
            </Button>

            <Button
              type="text"
              block
              icon={<StopOutlined />}
              style={{ color: token.colorTextSecondary }}
              onClick={() => onSubmit(NightActionType.SKIP, null, true)}
              disabled={isPending}
            >
              Skip Action
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
