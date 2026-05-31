import { useState } from 'react';
import { theme, Button, Typography, Tag } from 'antd';
import { getRoleNameWithEmoji, getRoleTheme } from '../../utils/roleUtils';
import { PhaseTimer } from '../game/PhaseTimer';
import { NightActionType } from '../../types';

const { Title, Text } = Typography;

interface DreamActionProps {
  myRole: string;
  nightInfo: { prompt?: string; actions_available?: string[] } | undefined;
  phaseStartTime: number | null | undefined;
  phaseDurationSeconds: number;
  timerEnabled: boolean;
  onSubmit: (actionType: string, tid: string | null) => void;
  isPending: boolean;
  confirmedTargetId?: string | null;
}

const DREAM_EMOJIS = [
  '🍕',
  '🍔',
  '🍟',
  '🌭',
  '🍿',
  '🥓',
  '🍳',
  '🥞',
  '🥨',
  '🍩',
  '🍪',
  '🍰',
  '🧁',
  '🥧',
  '🍫',
  '🍬',
  '🍭',
  '🍮',
  '🍯',
  '🍦',
  '🍧',
  '🍨',
  '🍓',
  '🍒',
  '🍑',
  '🍊',
  '🍋',
  '🍍',
  '🍎',
  '🍏',
  '🍐',
  '🥝',
  '🍇',
  '🍉',
  '🍌',
  '🌽',
  '🥕',
  '🥔',
  '🍠',
  '🍄',
  '🥜',
  '🌰',
  '🍞',
  '🥐',
  '🥖',
  '🥪',
  '🌮',
  '🌯',
  '🥗',
  '🥘',
  '🍝',
  '🍜',
  '🍲',
  '🍛',
  '🍣',
  '🍱',
  '🥟',
  '🍤',
  '🍙',
  '🍚',
];

export function DreamAction({
  myRole,
  nightInfo,
  phaseStartTime,
  phaseDurationSeconds,
  timerEnabled,
  onSubmit,
  isPending,
  confirmedTargetId,
}: DreamActionProps) {
  const { token } = theme.useToken();
  const roleTheme = getRoleTheme(myRole);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(confirmedTargetId || null);

  const seed = phaseStartTime || 0;
  const targetEmojiIndex = Math.floor(Math.abs(Math.sin(seed) * DREAM_EMOJIS.length));
  const targetEmoji = DREAM_EMOJIS[targetEmojiIndex];

  const isConfirmed = !!confirmedTargetId;

  const handleEmojiClick = (emoji: string) => {
    if (isConfirmed) return;
    setSelectedEmoji(emoji);
  };

  const handleConfirm = () => {
    if (!selectedEmoji) return;
    onSubmit(NightActionType.DREAM, selectedEmoji);
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
          style={{
            margin: 0,
            color: roleTheme.primary,
            textShadow: `0 0 10px ${roleTheme.shadow}`,
          }}
        >
          {getRoleNameWithEmoji(myRole)}
          {isConfirmed && (
            <Tag color="success" style={{ verticalAlign: 'middle', marginLeft: 8 }}>
              LOCKED
            </Tag>
          )}
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          {isConfirmed
            ? 'You are dreaming peacefully...'
            : nightInfo?.prompt || 'Choose what you are dreaming about...'}
        </Text>
      </div>

      <div style={{ textAlign: 'center', marginBottom: token.marginLG }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{targetEmoji}</div>
        <Text style={{ fontSize: 16 }}>Find this emoji in your dream!</Text>
      </div>

      <PhaseTimer
        key={phaseStartTime}
        phaseStartTime={phaseStartTime}
        phaseDurationSeconds={phaseDurationSeconds}
        timerEnabled={timerEnabled}
        onExpire={() => {
          if (!isConfirmed) {
            onSubmit(NightActionType.DREAM, selectedEmoji || targetEmoji);
          }
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: 12,
          marginBottom: token.marginLG,
          flex: 1,
          alignContent: 'start',
          overflowY: 'auto',
          padding: 4,
        }}
      >
        {DREAM_EMOJIS.map((emoji) => {
          const isSelected = selectedEmoji === emoji;
          return (
            <button
              key={emoji}
              type="button"
              aria-label={`Dream of ${emoji}`}
              aria-pressed={isSelected}
              onClick={() => handleEmojiClick(emoji)}
              disabled={isConfirmed}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                background: isSelected ? `${token.colorPrimary}33` : 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${isSelected ? token.colorPrimary : 'transparent'}`,
                borderRadius: token.borderRadiusLG,
                color: token.colorText,
                cursor: isConfirmed ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                minHeight: 96,
                opacity: isConfirmed && !isSelected ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 40 }}>{emoji}</span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        {!isConfirmed && (
          <Button
            type="primary"
            block
            size="large"
            disabled={!selectedEmoji}
            onClick={handleConfirm}
            style={{
              height: 48,
              fontSize: 18,
            }}
            loading={isPending}
          >
            {selectedEmoji ? `Dream of ${selectedEmoji}` : 'Choose an Emoji'}
          </Button>
        )}
      </div>
    </div>
  );
}
