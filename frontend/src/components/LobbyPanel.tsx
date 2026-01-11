import { useState } from 'react';
import { Card, Form, InputNumber, Button, Spin, Typography, message } from 'antd';

const { Text } = Typography;

export interface GameSettings {
    role_distribution: Record<string, number>;
    phase_duration_seconds: number;
}

function getDefaultRoles(playerCount: number): Record<string, number> {
    if (playerCount <= 4)
        return {
            WEREWOLF: 1,
            SEER: 1,
            DOCTOR: 0,
            VILLAGER: Math.max(0, playerCount - 2),
        };
    if (playerCount <= 6) return { WEREWOLF: 1, SEER: 1, DOCTOR: 1, VILLAGER: playerCount - 3 };
    if (playerCount <= 9) return { WEREWOLF: 2, SEER: 1, DOCTOR: 1, VILLAGER: playerCount - 4 };
    return { WEREWOLF: 3, SEER: 1, DOCTOR: 1, VILLAGER: playerCount - 5 };
}

interface LobbyPanelProps {
    isAdmin: boolean;
    playerCount: number;
    onStartGame: (settings: GameSettings) => Promise<void>;
}

export function LobbyPanel({ isAdmin, playerCount, onStartGame }: LobbyPanelProps) {
    const [settings, setSettings] = useState<GameSettings>({
        role_distribution: getDefaultRoles(playerCount),
        phase_duration_seconds: 60,
    });
    const [loading, setLoading] = useState(false);

    const [prevPlayerCount, setPrevPlayerCount] = useState(playerCount);
    if (playerCount !== prevPlayerCount) {
        setPrevPlayerCount(playerCount);
        setSettings((prev) => ({
            ...prev,
            role_distribution: getDefaultRoles(playerCount),
        }));
    }

    const updateRole = (role: string, count: number | null) => {
        setSettings((prev) => ({
            ...prev,
            role_distribution: { ...prev.role_distribution, [role]: count ?? 0 },
        }));
    };

    const totalRoles = Object.values(settings.role_distribution).reduce((a, b) => a + b, 0);
    const isValid = totalRoles === playerCount;

    const handleStart = async () => {
        if (!isValid) {
            message.warning(`Role count (${totalRoles}) must equal player count (${playerCount})`);
            return;
        }
        setLoading(true);
        await onStartGame(settings);
        setLoading(false);
    };

    if (!isAdmin) {
        return (
            <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin />
                <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                    Waiting for admin to start...
                </Text>
            </div>
        );
    }

    const roles = ['WEREWOLF', 'SEER', 'DOCTOR', 'VILLAGER'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card title="Game Configuration">
                <Form layout="vertical">
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {roles.map((role) => (
                            <Form.Item key={role} label={role} style={{ flex: 1, minWidth: 100 }}>
                                <InputNumber
                                    min={0}
                                    value={settings.role_distribution[role]}
                                    onChange={(v) => updateRole(role, v)}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        ))}
                    </div>
                    <Text type={isValid ? 'success' : 'danger'}>
                        Total: {totalRoles} / {playerCount} players
                    </Text>
                </Form>
            </Card>
            <div style={{ textAlign: 'center' }}>
                <Button
                    type="primary"
                    size="large"
                    onClick={handleStart}
                    loading={loading}
                    disabled={!isValid}
                >
                    Start Game
                </Button>
            </div>
        </div>
    );
}
