import { useState } from 'react';
import { theme, Button, Typography, Avatar, Space } from 'antd';
import { UserOutlined, StopOutlined, CheckOutlined } from '@ant-design/icons';
import { getRoleNameWithEmoji } from '../../utils/roleUtils';
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

  const handleTargetClick = (pid: string) => {
    setTargetId((prev) => (prev === pid ? null : pid));
  };

  return (
    <div
      style={{
        background: 'rgba(20, 20, 30, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: token.borderRadiusLG,
        padding: 24,
        border: `1px solid rgba(255, 255, 255, 0.1)`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        margin: '0 auto',
        maxWidth: 800,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title
          level={3}
          style={{ margin: 0, color: '#d3adf7', textShadow: '0 0 10px rgba(114, 46, 209, 0.5)' }}
        >
          {getRoleNameWithEmoji(myRole)}
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          {nightInfo?.prompt || 'Select a target for your action.'}
        </Text>
        <div style={{ marginTop: 16 }}>
          <PhaseTimer
            key={phaseStartTime}
            phaseStartTime={phaseStartTime}
            phaseDurationSeconds={phaseDurationSeconds}
            timerEnabled={timerEnabled}
            onExpire={() => onSubmit(NightActionType.SKIP, null)}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 12,
          marginBottom: 24,
          flex: 1,
          alignContent: 'start',
          overflowY: 'auto',
          padding: 4,
        }}
      >
        {alivePlayers.map((p) => {
          const isSelected = targetId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => handleTargetClick(p.id)}
              style={{
                cursor: 'pointer',
                padding: 12,
                borderRadius: 12,
                background: isSelected ? 'rgba(114, 46, 209, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${isSelected ? '#722ed1' : 'transparent'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSelected ? '0 0 15px rgba(114, 46, 209, 0.3)' : 'none',
              }}
            >
              <Avatar
                size={48}
                icon={<UserOutlined />}
                style={{
                  marginBottom: 8,
                  backgroundColor: isSelected ? '#722ed1' : undefined,
                }}
              />
              <Text
                strong={isSelected}
                ellipsis
                style={{
                  maxWidth: '100%',
                  color: isSelected ? '#fff' : token.colorText,
                  fontSize: 13,
                }}
              >
                {p.nickname}
              </Text>
              {isSelected && <CheckOutlined style={{ color: '#52c41a', marginTop: 4 }} />}
            </div>
          );
        })}
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Button
          type="primary"
          block
          size="large"
          icon={targetId ? <CheckOutlined /> : undefined}
          style={{
            height: 50,
            fontSize: 18,
            borderRadius: 25,
            background: targetId ? 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)' : undefined,
            border: targetId ? 'none' : undefined,
          }}
          onClick={() => onSubmit(defaultAction, targetId)}
          disabled={!targetId}
          loading={isPending}
        >
          {targetId ? `Confirm ${defaultAction}` : 'Select a Target'}
        </Button>

        <Button
          type="text"
          block
          icon={<StopOutlined />}
          style={{ color: token.colorTextSecondary }}
          onClick={() => onSubmit(NightActionType.SKIP, null)}
          disabled={isPending}
        >
          Skip Action
        </Button>
      </Space>
    </div>
  );
}
