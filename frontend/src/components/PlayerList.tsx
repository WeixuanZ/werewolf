import { Card, List, Tag } from 'antd';
import type { Player } from '../types';

interface PlayerCardProps {
  player: Player;
  isMe: boolean;
  isDisconnected?: boolean;
}

function PlayerCard({ player, isMe, isDisconnected }: PlayerCardProps) {
  return (
    <Card
      size="small"
      title={player.nickname}
      style={{ height: 120, display: 'flex', flexDirection: 'column' }}
      styles={{
        body: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        },
      }}
    >
      <div style={{ marginBottom: 8 }}>{player.is_alive ? '🟢 Alive' : '💀 Dead'}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {player.role && <Tag color="purple">{player.role}</Tag>}
        {isMe && <Tag color="gold">YOU</Tag>}
        {player.is_admin && <Tag color="red">ADMIN</Tag>}
        {isDisconnected && <Tag color="orange">OFFLINE</Tag>}
      </div>
    </Card>
  );
}

interface PlayerListProps {
  players: Player[];
  myId: string | null;
  offlineIds?: Set<string>;
}

export function PlayerList({ players, myId, offlineIds = new Set() }: PlayerListProps) {
  return (
    <Card title={`Players (${players.length})`} style={{ marginBottom: 24 }}>
      <List
        grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 4 }}
        dataSource={players}
        renderItem={(player) => (
          <List.Item>
            <PlayerCard
              player={player}
              isMe={player.id === myId}
              isDisconnected={offlineIds.has(player.id) || !player.is_online}
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
