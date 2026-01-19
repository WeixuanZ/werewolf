export const RoleType = {
  VILLAGER: "VILLAGER",
  WEREWOLF: "WEREWOLF",
  SEER: "SEER",
  DOCTOR: "DOCTOR",
  WITCH: "WITCH",
  HUNTER: "HUNTER",
  SPECTATOR: "SPECTATOR",
} as const;

export type RoleType = (typeof RoleType)[keyof typeof RoleType];

export const GamePhase = {
  WAITING: "WAITING",
  DAY: "DAY",
  NIGHT: "NIGHT",
  VOTING: "VOTING",
  GAME_OVER: "GAME_OVER",
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

export const NightActionType = {
  KILL: "KILL",
  SAVE: "SAVE",
  CHECK: "CHECK",
  HEAL: "HEAL",
  POISON: "POISON",
  REVENGE: "REVENGE",
  SKIP: "SKIP",
} as const;

export type NightActionType =
  (typeof NightActionType)[keyof typeof NightActionType];

export interface Player {
  id: string;
  nickname: string;
  role: RoleType | null;
  role_description?: string;
  is_alive: boolean;
  is_admin: boolean;
  is_spectator: boolean;
  is_online: boolean;
  vote_target?: string | null;
  night_action_target?: string | null;
  has_night_action?: boolean;
  night_info?: {
    prompt?: string;
    actions_available?: NightActionType[];
    victim_id?: string;
  };
  witch_has_heal?: boolean;
  witch_has_poison?: boolean;
  hunter_revenge_target?: string | null;
}

export interface GameSettings {
  role_distribution: Record<RoleType, number>;
  phase_duration_seconds: number;
}

export interface GameState {
  room_id: string;
  phase: GamePhase;
  players: Record<string, Player>;
  settings: GameSettings;
  turn_count: number;
  winners: string | null;
  voted_out_this_round?: string | null;
}

export const WSMessageType = {
  STATE_UPDATE: "STATE_UPDATE",
  ERROR: "ERROR",
  CHAT: "CHAT",
  PLAYER_DISCONNECTED: "PLAYER_DISCONNECTED",
  PLAYER_RECONNECTED: "PLAYER_RECONNECTED",
  PING: "PING",
  PONG: "PONG",
} as const;

export type WSMessageType = (typeof WSMessageType)[keyof typeof WSMessageType];

export interface WSBaseMessage {
  type: WSMessageType;
  room_id?: string;
}

export interface WSStateUpdateMessage extends WSBaseMessage {
  type: typeof WSMessageType.STATE_UPDATE;
  payload: GameState;
}

export interface WSPresenceMessage extends WSBaseMessage {
  type:
    | typeof WSMessageType.PLAYER_DISCONNECTED
    | typeof WSMessageType.PLAYER_RECONNECTED;
  payload: {
    player_id: string;
    nickname: string;
  };
}

export interface WSPingMessage extends WSBaseMessage {
  type: typeof WSMessageType.PING;
}

export interface WSPongMessage extends WSBaseMessage {
  type: typeof WSMessageType.PONG;
}

export interface WSErrorMessage extends WSBaseMessage {
  type: typeof WSMessageType.ERROR;
  payload: {
    message: string;
    code?: string;
  };
}

export type SocketMessage =
  | WSStateUpdateMessage
  | WSPresenceMessage
  | WSPingMessage
  | WSPongMessage
  | WSErrorMessage;
