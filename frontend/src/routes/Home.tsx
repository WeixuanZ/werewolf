import { useNavigate } from '@tanstack/react-router';
import { useDefaultNickname } from '../store/gameStore';
import { useState } from 'react';
import { Button, Input, Card, Typography, Space, message, theme } from 'antd';
import { useCreateRoom } from '../api/client';

const { Title } = Typography;
const { useToken } = theme;

export default function Home() {
  const { token } = useToken();
  const navigate = useNavigate();
  const [nickname, setNickname] = useDefaultNickname();
  const [roomIdInput, setRoomIdInput] = useState('');
  const createRoom = useCreateRoom();

  const handleCreateRoom = async () => {
    try {
      const data = await createRoom.mutateAsync();
      if (data?.room_id) {
        navigate({ to: `/room/${data.room_id}` });
      } else {
        message.error('Failed to create room. Please try again.');
      }
    } catch (e) {
      console.error(e);
      message.error('Failed to create room');
    }
  };

  const handleJoinRoom = () => {
    if (!nickname || !roomIdInput) {
      message.warning('Enter nickname and room ID');
      return;
    }
    navigate({ to: `/room/${roomIdInput}` });
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        padding: token.padding,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <Title level={2}>🐺 Werewolf</Title>
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <div
            style={{
              paddingBottom: token.paddingLG,
              borderBottom: `1px solid ${token.colorBorder}`,
            }}
          >
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Start a new game as Admin
            </Typography.Text>
            <Button
              type="primary"
              block
              size="large"
              onClick={handleCreateRoom}
              loading={createRoom.isPending}
            >
              Create New Room
            </Button>
          </div>

          <div>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Or join an existing game
            </Typography.Text>
            <Input
              placeholder="Your Nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              size="large"
              style={{ marginBottom: 12 }}
              onPressEnter={handleJoinRoom}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                placeholder="Room ID"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                onPressEnter={handleJoinRoom}
              />
              <Button onClick={handleJoinRoom}>Join</Button>
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
}
