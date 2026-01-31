import { useState } from 'react';
import { theme, Button, Typography, Badge, Tag } from 'antd';
import {
  MedicineBoxOutlined,
  ExperimentOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
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
  const victimId = nightInfo?.victim_id;
  const victimName = victimId ? alivePlayers.find((p) => p.id === victimId)?.nickname : null;

  const canHeal =
    actionsAvailable.includes(NightActionType.HEAL) && me?.witch_has_heal && !!victimId;
  const canPoison = actionsAvailable.includes(NightActionType.POISON) && me?.witch_has_poison;

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

  const handleSkip = () => {
    onSubmit(NightActionType.SKIP, null, true);
  };

  // Define colors using tokens or roleTheme where applicable
  // Heal is always "Green" (Life), Poison is "Purple" (Death/Magic) - fits Witch theme
  const healColor = token.colorSuccess;
  const poisonColor = roleTheme.primary; // Witch primary is Purple

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

      <PhaseTimer
        key={phaseStartTime}
        phaseStartTime={phaseStartTime}
        phaseDurationSeconds={phaseDurationSeconds}
        timerEnabled={timerEnabled}
        onExpire={() => onSubmit(NightActionType.SKIP, null, true)}
      />

      {/* Content Section */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: token.marginLG, padding: 4 }}>
        {!viewingPoisonTargets && !isConfirmed ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
                background: canHeal ? `${healColor}33` : 'rgba(255,255,255,0.05)',
                border: `2px solid ${canHeal ? healColor : 'transparent'}`,
                borderRadius: token.borderRadiusLG,
                cursor: canHeal ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                opacity: canHeal ? 1 : 0.5,
                minHeight: 200,
                justifyContent: 'center',
              }}
            >
              <MedicineBoxOutlined style={{ fontSize: 48, color: healColor, marginBottom: 16 }} />
              <Title level={4} style={{ margin: 0, color: token.colorText }}>
                Life Potion
              </Title>
              <Text
                style={{
                  marginTop: 8,
                  color: victimId ? token.colorError : token.colorTextSecondary,
                  textAlign: 'center',
                }}
              >
                {victimId ? `Save 💀 ${victimName}` : 'No victim tonight'}
              </Text>
              <Badge
                status={me?.witch_has_heal ? 'success' : 'default'}
                text={me?.witch_has_heal ? 'Available' : 'Empty'}
                style={{ marginTop: 12, color: token.colorTextSecondary }}
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
                background: canPoison ? `${poisonColor}33` : 'rgba(255,255,255,0.05)',
                border: `2px solid ${canPoison ? poisonColor : 'transparent'}`,
                borderRadius: token.borderRadiusLG,
                cursor: canPoison ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                opacity: canPoison ? 1 : 0.5,
                minHeight: 200,
                justifyContent: 'center',
              }}
            >
              <ExperimentOutlined style={{ fontSize: 48, color: poisonColor, marginBottom: 16 }} />
              <Title level={4} style={{ margin: 0, color: token.colorText }}>
                Death Potion
              </Title>
              <Text style={{ marginTop: 8, opacity: 0.6 }}>Eliminate a player</Text>
              <Badge
                status={me?.witch_has_poison ? 'processing' : 'default'}
                color={me?.witch_has_poison ? poisonColor : undefined}
                text={me?.witch_has_poison ? 'Available' : 'Empty'}
                style={{ marginTop: 12, color: token.colorTextSecondary }}
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
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: 16,
                      background: isSelected ? `${poisonColor}33` : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${isSelected ? poisonColor : 'transparent'}`,
                      borderRadius: token.borderRadiusLG,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      minHeight: 160,
                      color: token.colorText,
                    }}
                  >
                    <span style={{ fontSize: 32, marginBottom: 8 }}>
                      {p.role ? getRoleEmoji(p.role) : '👤'}
                    </span>
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
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            {/* Confirmed State View */}
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
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              {selectedPoisonId ? (
                <Text style={{ color: roleTheme.primary }}>
                  Target selected. Confirm to poison.
                </Text>
              ) : (
                <Text style={{ color: token.colorTextSecondary }}>Select a target...</Text>
              )}
            </div>

            <Button
              type="primary"
              block
              size="large"
              disabled={!selectedPoisonId || isPending}
              onClick={handleConfirmPoison}
              style={{
                height: 48,
                fontSize: 18,
                backgroundColor: selectedPoisonId ? poisonColor : undefined,
              }}
            >
              Confirm Poison
            </Button>
          </>
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
            <CheckOutlined style={{ marginRight: 8 }} />
            Action Submitted
          </div>
        ) : (
          <Button
            type="default"
            block
            size="large"
            style={{ height: 48, fontSize: 18 }}
            onClick={handleSkip}
            disabled={isPending}
          >
            Skip Action
          </Button>
        )}
      </div>
    </div>
  );
}
