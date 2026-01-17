import { useState } from "react";
import { Card, Typography, Alert, Input, Button, theme } from "antd";

const { Text } = Typography;
const { useToken } = theme;

interface JoinScreenProps {
  roomId: string;
  onJoin: (nickname: string) => Promise<boolean>;
  isSpectator?: boolean;
}

export function JoinScreen({ roomId, onJoin, isSpectator }: JoinScreenProps) {
  const { token } = useToken();
  const [nickname, setNickname] = useState("");
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
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: token.padding,
      }}
    >
      <Card
        title={
          isSpectator ? `Spectate Room: ${roomId}` : `Join Room: ${roomId}`
        }
        style={{ width: "100%", maxWidth: 400, textAlign: "center" }}
      >
        {isSpectator && (
          <Alert
            message="Game in progress"
            description="You'll join as a spectator."
            type="info"
            style={{ marginBottom: 16 }}
          />
        )}
        <Text style={{ display: "block", marginBottom: 16 }}>
          Enter your nickname to join.
        </Text>
        <Input
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          size="large"
          style={{ marginBottom: 16, height: 56, fontSize: 18 }}
          onPressEnter={handleSubmit}
          disabled={loading}
        />
        <Button
          type="primary"
          block
          size="large"
          onClick={handleSubmit}
          loading={loading}
          style={{ height: 56, fontSize: 20 }}
        >
          {isSpectator ? "Spectate" : "Join Game"}
        </Button>
      </Card>
    </div>
  );
}
