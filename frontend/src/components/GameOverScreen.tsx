import { Button, theme } from 'antd';
import { useRestartGame } from '../api/client';
import type { GameState, Player } from '../types';
import { RoleType } from '../types';
import { getRoleEmoji } from '../utils/roleUtils';

const { useToken } = theme;

interface GameOverScreenProps {
  gameState: GameState;
  playerId: string;
}

export function GameOverScreen({ gameState, playerId }: GameOverScreenProps) {
  const { token } = useToken();
  const restartGame = useRestartGame(gameState.room_id);
  const currentPlayer = gameState.players[playerId];
  const isAdmin = currentPlayer?.is_admin;
  const winners = gameState.winners;

  // Determine if current player won
  const playerRole = currentPlayer?.role;
  const isWerewolf = playerRole === RoleType.WEREWOLF;
  const playerWon =
    (isWerewolf && winners === 'WEREWOLVES') || (!isWerewolf && winners === 'VILLAGERS');

  const handleRestart = () => {
    restartGame.mutate({ playerId });
  };

  // Separate players by team for display
  const werewolves = Object.values(gameState.players).filter((p) => p.role === RoleType.WEREWOLF);
  const villagers = Object.values(gameState.players).filter((p) => p.role !== RoleType.WEREWOLF);

  const bgColor = playerWon ? 'rgba(46, 125, 50, 0.2)' : 'rgba(198, 40, 40, 0.2)';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: token.padding,
        background: bgColor,
      }}
    >
      <div style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
        {/* Result Banner */}
        <div style={{ marginBottom: token.marginLG }}>
          <span style={{ fontSize: 64, display: 'block', marginBottom: 8 }}>
            {playerWon ? '🎉' : '💀'}
          </span>
          <h1
            style={{
              fontSize: 48,
              margin: 0,
              background: playerWon
                ? 'linear-gradient(135deg, #ffd700, #ffb347)'
                : 'linear-gradient(135deg, #ff6b6b, #cc5555)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {playerWon ? 'Victory!' : 'Defeat'}
          </h1>
          <p style={{ color: token.colorTextSecondary, fontSize: 18, margin: 0 }}>
            {playerWon ? `You and the ${winners} have won!` : `The ${winners} have won.`}
          </p>
        </div>

        {/* Role Reveal */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: token.borderRadiusLG,
            padding: token.paddingLG,
            marginBottom: token.marginLG,
          }}
        >
          <h2 style={{ color: token.colorText, marginTop: 0 }}>All Roles Revealed</h2>

          {/* Werewolves */}
          <div style={{ marginBottom: token.margin }}>
            <h3 style={{ color: '#ff8a80', margin: '0 0 8px 0' }}>🐺 Werewolves</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {werewolves.map((p: Player) => (
                <li
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 6,
                    marginBottom: 4,
                    opacity: p.is_alive ? 1 : 0.5,
                    textDecoration: p.is_alive ? 'none' : 'line-through',
                    color: token.colorText,
                  }}
                >
                  <span>
                    {getRoleEmoji(p.role)} {p.nickname}
                    {p.id === playerId && (
                      <span style={{ color: token.colorPrimary, marginLeft: 8 }}>(You)</span>
                    )}
                  </span>
                  {!p.is_alive && <span>☠️</span>}
                </li>
              ))}
            </ul>
          </div>

          {/* Villagers */}
          <div>
            <h3 style={{ color: '#80cbc4', margin: '0 0 8px 0' }}>🏘️ Villagers</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {villagers.map((p: Player) => (
                <li
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 6,
                    marginBottom: 4,
                    opacity: p.is_alive ? 1 : 0.5,
                    textDecoration: p.is_alive ? 'none' : 'line-through',
                    color: token.colorText,
                  }}
                >
                  <span>
                    {getRoleEmoji(p.role)} {p.nickname}
                    {p.id === playerId && (
                      <span style={{ color: token.colorPrimary, marginLeft: 8 }}>(You)</span>
                    )}
                  </span>
                  {!p.is_alive && <span>☠️</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Restart Button */}
        {isAdmin ? (
          <Button
            type="primary"
            size="large"
            onClick={handleRestart}
            loading={restartGame.isPending}
            block
            style={{ height: 56, fontSize: 20, marginTop: token.margin }}
          >
            {restartGame.isPending ? 'Restarting...' : '🔄 Play Again'}
          </Button>
        ) : (
          <p style={{ color: token.colorTextSecondary, fontStyle: 'italic' }}>
            Waiting for admin to start a new game...
          </p>
        )}
      </div>
    </div>
  );
}
