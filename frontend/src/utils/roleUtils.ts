import { RoleType } from '../types';

export const ROLE_EMOJIS: Record<string, string> = {
  [RoleType.WEREWOLF]: '🐺',
  [RoleType.VILLAGER]: '🧑‍🌾',
  [RoleType.SEER]: '🔮',
  [RoleType.DOCTOR]: '💉',
  [RoleType.WITCH]: '🧙‍♀️',
  [RoleType.HUNTER]: '🔫',
  [RoleType.CUPID]: '💘',
  [RoleType.BODYGUARD]: '🛡️',
  [RoleType.LYCAN]: '🐺❓',
  [RoleType.TANNER]: '🤡',
  [RoleType.SPECTATOR]: '👻',
};

export function getRoleEmoji(role?: string | null): string {
  if (!role) return '❓';
  // Normalize role to handle potential case issues
  const upperRole = role.toUpperCase();
  return ROLE_EMOJIS[upperRole] || '❓';
}

export function getRoleNameWithEmoji(role: string): string {
  return `${getRoleEmoji(role)} ${role}`;
}

export function getRoleTheme(role: string) {
  switch (role) {
    case RoleType.WEREWOLF:
      return { primary: '#ff4d4f', secondary: '#ff7875', shadow: 'rgba(255, 77, 79, 0.5)' };
    case RoleType.WITCH:
      return { primary: '#722ed1', secondary: '#b37feb', shadow: 'rgba(114, 46, 209, 0.5)' };
    case RoleType.CUPID:
      return { primary: '#eb2f96', secondary: '#ffadd2', shadow: 'rgba(235, 47, 150, 0.5)' };
    case RoleType.SEER:
      return { primary: '#1890ff', secondary: '#40a9ff', shadow: 'rgba(24, 144, 255, 0.5)' };
    default:
      return { primary: '#1890ff', secondary: '#40a9ff', shadow: 'rgba(24, 144, 255, 0.5)' };
  }
}
