import { useState } from 'react';
import { theme, Button, Typography, Tag, Space } from 'antd';
import { StopOutlined, CheckOutlined } from '@ant-design/icons';
import { getRoleNameWithEmoji, getRoleEmoji } from '../../utils/roleUtils';
import { PhaseTimer } from '../game/PhaseTimer';
import type { Player } from '../../types';
import { NightActionType } from '../../types';

const { Title, Text } = Typography;

interface GenericActionProps {
  myRole: string;
  alivePlayers: Player[];
  nightInfo: { prompt?: string; actions_available?: string[] } | undefined;
  phaseStartTime: number | null | undefined;
  phaseDurationSeconds: number;
  timerEnabled: boolean;
  onSubmit: (actionType: string, tid: string | null) => void;
  isPending: boolean;
  confirmedTargetId?: string | null;
}

export function GenericAction({
  myRole,
  alivePlayers,
  nightInfo,
  phaseStartTime,
  phaseDurationSeconds,
  timerEnabled,
  onSubmit,
  isPending,
  confirmedTargetId,
}: GenericActionProps) {
  const { token } = theme.useToken();
  const [targetId, setTargetId] = useState<string | null>(confirmedTargetId || null);

  const actionsAvailable = nightInfo?.actions_available || [];
  const defaultAction = actionsAvailable[0] || 'ACTION';
  const isConfirmed = !!confirmedTargetId;

  const handleTargetClick = (pid: string) => {
    if (isConfirmed) return; // Locked
    setTargetId((prev) => (prev === pid ? null : pid));
  };

  const handleConfirm = () => {
    if (!targetId) return;
    onSubmit(defaultAction, targetId);
  };

  const handleSkip = () => {
    onSubmit(NightActionType.SKIP, null);
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
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: token.margin }}>
        <Title
          level={3}
          style={{ margin: 0, color: '#d3adf7', textShadow: '0 0 10px rgba(114, 46, 209, 0.5)' }}
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
            ? 'Action completed. Waiting for night to end...'
            : nightInfo?.prompt || 'Select a target for your action.'}
        </Text>
        <div style={{ marginTop: 16 }}>
          <PhaseTimer
            key={phaseStartTime}
            phaseStartTime={phaseStartTime}
            phaseDurationSeconds={phaseDurationSeconds}
            timerEnabled={timerEnabled}
            onExpire={handleSkip}
          />
        </div>
      </div>

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
          const isSelected = targetId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleTargetClick(p.id)}
              disabled={isConfirmed}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '16px',
                background: isSelected ? 'rgba(114, 46, 209, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${isSelected ? '#722ed1' : 'transparent'}`,
                borderRadius: token.borderRadiusLG,
                color: token.colorText,
                fontSize: 18,
                cursor: isConfirmed ? 'default' : 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                minHeight: '160px',
                opacity: isConfirmed && !isSelected ? 0.5 : 1,
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
              {isSelected && <CheckOutlined style={{ color: '#52c41a', fontSize: 24 }} />}
            </button>
          );
        })}
      </div>

      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        {isConfirmed ? (
          <div
            style={{
              padding: 16,
              background: 'rgba(46, 125, 50, 0.2)',
              borderRadius: 8,
              border: '1px solid rgba(46, 125, 50, 0.5)',
              textAlign: 'center',
              color: '#a5d6a7',
            }}
          >
            <CheckOutlined style={{ marginRight: 8 }} />
            Action Submitted
          </div>
        ) : (
          <>
            <Button
              type="primary"
              block
              size="large"
              icon={targetId ? <CheckOutlined /> : undefined}
              style={{
                height: 50,
                fontSize: 18,
                borderRadius: 25,
                background: targetId
                  ? 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)'
                  : undefined,
                border: targetId ? 'none' : undefined,
              }}
              onClick={handleConfirm}
              disabled={!targetId || isPending}
              loading={isPending}
            >
              {targetId ? `Confirm ${defaultAction}` : 'Select a Target'}
            </Button>

            <Button
              type="text"
              block
              icon={<StopOutlined />}
              style={{ color: token.colorTextSecondary }}
              onClick={handleSkip}
              disabled={isPending}
            >
              Skip Action
            </Button>
          </>
        )}
      </Space>
    </div>
  );
}
