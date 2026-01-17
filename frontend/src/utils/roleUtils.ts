import { RoleType } from "../types";

export const ROLE_EMOJIS: Record<string, string> = {
  [RoleType.WEREWOLF]: "🐺",
  [RoleType.VILLAGER]: "🧑‍🌾",
  [RoleType.SEER]: "🔮",
  [RoleType.DOCTOR]: "💉",
  [RoleType.WITCH]: "🧙‍♀️",
  [RoleType.HUNTER]: "🔫",
  [RoleType.SPECTATOR]: "👻",
};

export function getRoleEmoji(role?: string | null): string {
  if (!role) return "❓";
  // Normalize role to handle potential case issues
  const upperRole = role.toUpperCase();
  return ROLE_EMOJIS[upperRole] || "❓";
}

export function getRoleNameWithEmoji(role: string): string {
  return `${getRoleEmoji(role)} ${role}`;
}
