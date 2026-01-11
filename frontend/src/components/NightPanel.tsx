import { useState } from 'react';
import { Typography, Select, Button, message } from 'antd';
import type { Player } from '../types';
import { API_BASE_URL } from '../config';

const { Text } = Typography;

const ACTION_MAP: Record<string, string> = {
    WEREWOLF: 'KILL',
    DOCTOR: 'SAVE',
    SEER: 'CHECK',
};

interface NightPanelProps {
    myRole: string;
    players: Player[];
    playerId: string;
    roomId: string;
}

export function NightPanel({ myRole, players, playerId, roomId }: NightPanelProps) {
    const [targetId, setTargetId] = useState<string | null>(null);
    const [actionSubmitted, setActionSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!myRole || ['VILLAGER', 'SPECTATOR'].includes(myRole)) {
        return <Text>You are sleeping... 💤</Text>;
    }

    if (actionSubmitted) {
        return <Text>Waiting for night to end... 🌙</Text>;
    }

    const alivePlayers = players.filter((p) => p.is_alive);

    const handleSubmit = async () => {
        if (!targetId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/action?player_id=${playerId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action_type: ACTION_MAP[myRole],
                    target_id: targetId,
                }),
            });
            if (res.ok) {
                message.success('Action submitted!');
                setActionSubmitted(true);
            } else {
                message.error('Failed to submit action');
            }
        } catch {
            message.error('Network error');
        }
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Text>Select a target ({myRole}):</Text>
            <Select
                style={{ width: '100%' }}
                placeholder="Select target"
                onChange={setTargetId}
                value={targetId}
            >
                {alivePlayers.map((p) => (
                    <Select.Option key={p.id} value={p.id}>
                        {p.nickname} {p.id === playerId ? '(You)' : ''}
                    </Select.Option>
                ))}
            </Select>
            <Button type="primary" onClick={handleSubmit} disabled={!targetId} loading={loading}>
                Submit Action
            </Button>
        </div>
    );
}
