import { useState } from 'react';
import { theme, Button, Typography, Badge, Tag } from 'antd';
import {
  MedicineBoxOutlined,
  ExperimentOutlined,
  StopOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { getRoleNameWithEmoji, getRoleEmoji, getRoleTheme } from '../../utils/roleUtils';
import { PhaseTimer } from '../game/PhaseTimer';
import type { Player } from '../../types';
import { NightActionType } from '../../types';

const { Title, Text } = Typography;

interface WitchActionProps {
  myRole: string;
  alivePlayers: Player[];
  me: Player;
  nightInfo:
    | {
        prompt?: string;
        actions_available?: string[];
        victim_id?: string;
      }
    | undefined;
  phaseStartTime: number | null | undefined;
  phaseDurationSeconds: number;
  timerEnabled: boolean;
  onSubmit: (actionType: string, tid: string | null, confirmed?: boolean) => void;
  isPending: boolean;
  confirmedActionType?: string | null;
  confirmedTargetId?: string | null;
}

export function WitchAction({
  myRole,
  alivePlayers,
  me,
  nightInfo,
  phaseStartTime,
  phaseDurationSeconds,
  timerEnabled,
  onSubmit,
  isPending,
  confirmedActionType,
  confirmedTargetId,
}: WitchActionProps) {
  const { token } = theme.useToken();
  const [viewingPoisonTargets, setViewingPoisonTargets] = useState(false);
  const [selectedPoisonId, setSelectedPoisonId] = useState<string | null>(null);

  const isConfirmed = !!confirmedActionType;
  const roleTheme = getRoleTheme(myRole);

  const actionsAvailable = nightInfo?.actions_available || [];
  const canHeal = actionsAvailable.includes(NightActionType.HEAL) && me?.witch_has_heal;
  const canPoison = actionsAvailable.includes(NightActionType.POISON) && me?.witch_has_poison;

  const victimId = nightInfo?.victim_id;
  const victimName = victimId ? alivePlayers.find((p) => p.id === victimId)?.nickname : null;

  const handleHeal = () => {
    if (canHeal && victimId) {
      onSubmit(NightActionType.HEAL, victimId, true);
    }
  };

  const handlePoisonClick = (tid: string) => {
    if (isConfirmed) return;
    setSelectedPoisonId((prev) => (prev === tid ? null : tid));
  };

  const handleConfirmPoison = () => {
    if (selectedPoisonId) {
      onSubmit(NightActionType.POISON, selectedPoisonId, true);
    }
  };

  const handleUnlock = () => {
    onSubmit(confirmedActionType!, confirmedTargetId || null, false);
    if (confirmedActionType === NightActionType.POISON) {
      setViewingPoisonTargets(true);
      setSelectedPoisonId(confirmedTargetId || null);
    }
  };

  const handleSkip = () => {
    onSubmit(NightActionType.SKIP, null, true);
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
              LOCKED: {confirmedActionType}
            </Tag>
          )}
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          {isConfirmed
            ? 'Your action is locked in.'
            : viewingPoisonTargets
              ? 'Choose someone to poison.'
              : nightInfo?.prompt || 'Choose your fate.'}
        </Text>
      </div>

      {/* Timer Section */}
      <div style={{ marginBottom: 16 }}>
        <PhaseTimer
          key={phaseStartTime}
          phaseStartTime={phaseStartTime}
          phaseDurationSeconds={phaseDurationSeconds}
          timerEnabled={timerEnabled}
          onExpire={() => onSubmit(NightActionType.SKIP, null, true)}
        />
      </div>

      {/* Content Section */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 24, padding: 4 }}>
        {!viewingPoisonTargets && !isConfirmed ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {/* Life Potion */}
            <button
              onClick={handleHeal}
              disabled={!canHeal || isPending}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 24,
                background: 'rgba(40, 60, 40, 0.3)',
                border: `2px solid ${canHeal ? '#52c41a' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: token.borderRadiusLG,
                cursor: canHeal ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                opacity: canHeal ? 1 : 0.5,
                minHeight: 200,
                justifyContent: 'center',
              }}
            >
              <MedicineBoxOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
              <Title level={4} style={{ margin: 0, color: '#fff' }}>
                Life Potion
              </Title>
              {victimId ? (
                <Text style={{ marginTop: 8, color: '#ff7875' }}>Save 💀 {victimName}</Text>
              ) : (
                <Text style={{ marginTop: 8, opacity: 0.6 }}>No victim to save</Text>
              )}
              <Badge
                status={me?.witch_has_heal ? 'success' : 'default'}
                text={me?.witch_has_heal ? 'Available' : 'Empty'}
                style={{ marginTop: 12 }}
              />
            </button>

            {/* Death Potion */}
            <button
              onClick={() => setViewingPoisonTargets(true)}
              disabled={!canPoison || isPending}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 24,
                background: 'rgba(60, 40, 60, 0.3)',
                border: `2px solid ${canPoison ? '#722ed1' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: token.borderRadiusLG,
                cursor: canPoison ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                opacity: canPoison ? 1 : 0.5,
                minHeight: 200,
                justifyContent: 'center',
              }}
            >
              <ExperimentOutlined style={{ fontSize: 48, color: '#722ed1', marginBottom: 16 }} />
              <Title level={4} style={{ margin: 0, color: '#fff' }}>
                Death Potion
              </Title>
              <Text style={{ marginTop: 8, opacity: 0.6 }}>Eliminate a player</Text>
              <Badge
                status={me?.witch_has_poison ? 'processing' : 'default'}
                color={me?.witch_has_poison ? '#722ed1' : undefined}
                text={me?.witch_has_poison ? 'Available' : 'Empty'}
                style={{ marginTop: 12 }}
              />
            </button>
          </div>
        ) : viewingPoisonTargets && !isConfirmed ? (
          <div>
            <Button
              icon={<ArrowLeftOutlined />}
              type="text"
              onClick={() => setViewingPoisonTargets(false)}
              style={{ color: roleTheme.primary, marginBottom: 16 }}
            >
              Back to Potions
            </Button>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 16,
              }}
            >
              {alivePlayers.map((p) => {
                const isSelected = selectedPoisonId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePoisonClick(p.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: 16,
                      background: isSelected ? 'rgba(114, 46, 209, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${isSelected ? '#722ed1' : 'transparent'}`,
                      borderRadius: token.borderRadiusLG,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      minHeight: 160,
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 32, marginBottom: 8 }}>
                      {p.role ? getRoleEmoji(p.role) : '👤'}
                    </span>
                    <Text
                      strong
                      style={{ fontSize: 18, color: isSelected ? '#fff' : token.colorText }}
                    >
                      {p.nickname}
                    </Text>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>
              {confirmedActionType === NightActionType.HEAL ? '💚' : '💜'}
            </div>
            <Title level={3} style={{ color: '#fff' }}>
              {confirmedActionType === NightActionType.HEAL ? 'Healed Victim' : 'Poisoned Target'}
            </Title>
            {confirmedTargetId && confirmedTargetId !== 'SKIP' && (
              <Text style={{ fontSize: 18, opacity: 0.8 }}>
                Target:{' '}
                {alivePlayers.find((p) => p.id === confirmedTargetId)?.nickname ||
                  confirmedTargetId}
              </Text>
            )}
          </div>
        )}
      </div>

      {/* Actions Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {viewingPoisonTargets && !isConfirmed && (
          <Button
            type="primary"
            block
            size="large"
            disabled={!selectedPoisonId || isPending}
            onClick={handleConfirmPoison}
            style={{
              height: 48,
              fontSize: 18,
              borderRadius: 24,
              background: selectedPoisonId
                ? 'linear-gradient(135deg, #722ed1 0%, #b37feb 100%)'
                : undefined,
              border: 'none',
              boxShadow: selectedPoisonId ? '0 4px 15px rgba(114, 46, 209, 0.4)' : 'none',
            }}
          >
            Confirm Poison
          </Button>
        )}

        {isConfirmed && (
          <Button
            block
            size="large"
            onClick={handleUnlock}
            style={{ height: 48, fontSize: 18, borderRadius: 24 }}
          >
            Unlock Selection
          </Button>
        )}

        <Button
          size="large"
          icon={<StopOutlined />}
          onClick={handleSkip}
          disabled={isConfirmed || isPending}
          style={{ height: 48, fontSize: 18, borderRadius: 24, width: '100%' }}
        >
          Do Nothing & Sleep
        </Button>
      </div>
    </div>
  );
}
