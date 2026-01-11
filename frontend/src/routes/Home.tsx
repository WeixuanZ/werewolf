import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useDefaultNickname } from '../store/gameStore';
import { Button, Input, Card, Typography, Space, message } from 'antd';
import { API_BASE_URL } from '../config';

const { Title } = Typography;

export default function Home() {
    const navigate = useNavigate();
    const [nickname, setNickname] = useDefaultNickname();
    const [roomIdInput, setRoomIdInput] = useState('');

    const handleCreateRoom = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await res.json();

            if (data && data.room_id) {
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
                height: '100vh',
            }}
        >
            <Card style={{ width: 400, textAlign: 'center' }}>
                <Title level={2}>Werewolf</Title>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div
                        style={{
                            borderBottom: '1px solid #333',
                            paddingBottom: 24,
                            marginBottom: 8,
                        }}
                    >
                        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                            Start a new game as Admin
                        </Typography.Text>
                        <Button type="primary" block size="large" onClick={handleCreateRoom}>
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
                        <div style={{ display: 'flex', gap: '8px' }}>
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
