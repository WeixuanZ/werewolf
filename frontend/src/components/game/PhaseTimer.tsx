import { useEffect, useState } from 'react';
import { Progress, Typography, theme } from 'antd';

const { Text } = Typography;

interface PhaseTimerProps {
  phaseStartTime?: number | null;
  phaseDurationSeconds: number;
  onExpire?: () => void;
  timerEnabled: boolean;
}

export function PhaseTimer({
  phaseStartTime,
  phaseDurationSeconds,
  onExpire,
  timerEnabled,
}: PhaseTimerProps) {
  const { token } = theme.useToken();
  const [timeLeft, setTimeLeft] = useState<number>(phaseDurationSeconds);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (!timerEnabled || !phaseStartTime || phaseDurationSeconds <= 0) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now() / 1000;
      const elapsed = now - phaseStartTime;
      const remaining = Math.max(0, phaseDurationSeconds - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (!hasExpired) {
          setHasExpired(true);
          onExpire?.();
        }
      }
    }, 200); // 5Hz update for smoothness

    return () => clearInterval(interval);
  }, [phaseStartTime, phaseDurationSeconds, timerEnabled, hasExpired, onExpire]);

  if (!timerEnabled) return null;

  return (
    <div style={{ marginBottom: token.marginLG, padding: '0 8px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: token.colorTextSecondary, fontSize: 13 }}>Time Remaining</Text>
        <Text
          strong
          style={{
            color: timeLeft < 10 ? token.colorError : token.colorText,
            fontSize: 16,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Math.ceil(timeLeft)}s
        </Text>
      </div>
      <Progress
        percent={Math.min(100, (timeLeft / phaseDurationSeconds) * 100)}
        showInfo={false}
        strokeColor={timeLeft < 10 ? token.colorError : token.colorPrimary}
        trailColor="rgba(255, 255, 255, 0.1)"
        size="small"
      />
    </div>
  );
}
