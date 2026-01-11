import { useState } from 'react';
import { Card, Typography, Alert, Input, Button } from 'antd';

const { Text } = Typography;

interface JoinScreenProps {
  roomId: string;
  onJoin: (nickname: string) => Promise<boolean>;
  isSpectator?: boolean;
}

export function JoinScreen({ roomId, onJoin, isSpectator }: JoinScreenProps) {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!nickname.trim()) return;
    setLoading(true);
    await onJoin(nickname.trim());
    setLoading(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <Card
        title={isSpectator ? `Spectate Room: ${roomId}` : `Join Room: ${roomId}`}
        style={{ width: 400, textAlign: 'center' }}
      >
        {isSpectator && (
          <Alert
            message="Game in progress"
            description="You'll join as a spectator."
            type="info"
            style={{ marginBottom: 16 }}
          />
        )}
        <Text style={{ display: 'block', marginBottom: 16 }}>Enter your nickname to join.</Text>
        <Input
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          size="large"
          style={{ marginBottom: 16 }}
          onPressEnter={handleSubmit}
          disabled={loading}
        />
        <Button type="primary" block size="large" onClick={handleSubmit} loading={loading}>
          {isSpectator ? 'Spectate' : 'Join Game'}
        </Button>
      </Card>
    </div>
  );
}
