import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "../config";
import type { GameState, GameSettings } from "../types";

// ============================================================================
// API Client - Low-level fetch functions
// ============================================================================

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(res.status, data.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ============================================================================
// API Functions
// ============================================================================

export const api = {
  rooms: {
    create: () => fetchApi<GameState>("/rooms", { method: "POST", body: "{}" }),

    get: (roomId: string, playerId?: string) =>
      fetchApi<GameState>(
        `/rooms/${roomId}${playerId ? `?player_id=${playerId}` : ""}`,
      ),

    join: (roomId: string, nickname: string, playerId: string) =>
      fetchApi<GameState>(`/rooms/${roomId}/join`, {
        method: "POST",
        body: JSON.stringify({ nickname, player_id: playerId }),
      }),

    updateSettings: (
      roomId: string,
      playerId: string,
      settings: GameSettings,
    ) =>
      fetchApi<GameState>(
        `/rooms/${roomId}/settings?player_id=${encodeURIComponent(playerId)}`,
        {
          method: "POST",
          body: JSON.stringify(settings),
        },
      ),

    start: (roomId: string, playerId: string, settings?: GameSettings) =>
      fetchApi<GameState>(`/rooms/${roomId}/start`, {
        method: "POST",
        body: JSON.stringify({ player_id: playerId, settings }),
      }),

    submitAction: (
      roomId: string,
      playerId: string,
      actionType: string,
      targetId: string,
      confirmed: boolean = true,
    ) =>
      fetchApi<GameState>(`/rooms/${roomId}/action?player_id=${playerId}`, {
        method: "POST",
        body: JSON.stringify({
          action_type: actionType,
          target_id: targetId,
          confirmed,
        }),
      }),

    submitVote: (roomId: string, playerId: string, targetId: string) =>
      fetchApi<GameState>(`/rooms/${roomId}/vote?player_id=${playerId}`, {
        method: "POST",
        body: JSON.stringify({ target_id: targetId }),
      }),

    end: (roomId: string, playerId: string) =>
      fetchApi<GameState>(`/rooms/${roomId}/end`, {
        method: "POST",
        body: JSON.stringify({ player_id: playerId }),
      }),

    restart: (roomId: string, playerId: string) =>
      fetchApi<GameState>(`/rooms/${roomId}/restart`, {
        method: "POST",
        body: JSON.stringify({ player_id: playerId }),
      }),

    kick: (roomId: string, playerId: string, targetId: string) =>
      fetchApi<GameState>(`/rooms/${roomId}/kick`, {
        method: "POST",
        body: JSON.stringify({ player_id: playerId, target_id: targetId }),
      }),
  },
};

// ============================================================================
// React Query Hooks
// ============================================================================

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.rooms.create,
    onSuccess: (data) => {
      queryClient.setQueryData(["gameState", data.room_id], data);
    },
  });
}

export function useJoinRoom(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      nickname,
      playerId,
    }: {
      nickname: string;
      playerId: string;
    }) => api.rooms.join(roomId, nickname, playerId),
    onSuccess: (data) => {
      queryClient.setQueryData(["gameState", roomId], data);
    },
  });
}

export function useUpdateSettings(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playerId,
      settings,
    }: {
      playerId: string;
      settings: GameSettings;
    }) => api.rooms.updateSettings(roomId, playerId, settings),
    onSuccess: (data) => {
      queryClient.setQueryData(["gameState", roomId], data);
    },
  });
}

export function useStartGame(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playerId,
      settings,
    }: {
      playerId: string;
      settings?: GameSettings;
    }) => api.rooms.start(roomId, playerId, settings),
    onSuccess: (data) => {
      queryClient.setQueryData(["gameState", roomId], data);
    },
  });
}

export function useSubmitAction(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playerId,
      actionType,
      targetId,
      confirmed,
    }: {
      playerId: string;
      actionType: string;
      targetId: string;
      confirmed?: boolean;
    }) =>
      api.rooms.submitAction(roomId, playerId, actionType, targetId, confirmed),
    onSuccess: (data) => {
      queryClient.setQueryData(["gameState", roomId], data);
    },
  });
}

export function useSubmitVote(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playerId,
      targetId,
    }: {
      playerId: string;
      targetId: string;
    }) => api.rooms.submitVote(roomId, playerId, targetId),
    onSuccess: (data) => {
      queryClient.setQueryData(["gameState", roomId], data);
    },
  });
}

export function useEndGame(roomId: string) {
  return useMutation({
    mutationFn: ({ playerId }: { playerId: string }) =>
      api.rooms.end(roomId, playerId),
  });
}

export function useRestartGame(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playerId }: { playerId: string }) =>
      api.rooms.restart(roomId, playerId),
    onSuccess: (data) => {
      queryClient.setQueryData(["gameState", roomId], data);
    },
  });
}

export function useKickPlayer(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playerId,
      targetId,
    }: {
      playerId: string;
      targetId: string;
    }) => api.rooms.kick(roomId, playerId, targetId),
    onSuccess: (data) => {
      queryClient.setQueryData(["gameState", roomId], data);
    },
  });
}
