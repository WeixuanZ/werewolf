import { useAtom, useAtomValue, useSetAtom, atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// Store player data per room to support mid-game refreshes
interface RoomSession {
  playerId: string;
  nickname: string;
}

// Private atoms with ALL_CAPS naming convention
const ROOM_SESSIONS_ATOM = atomWithStorage<Record<string, RoomSession>>(
  "werewolf_sessions",
  {},
);

const DEFAULT_NICKNAME_ATOM = atomWithStorage<string>(
  "werewolf_default_nickname",
  "",
);

const CURRENT_ROOM_ID_ATOM = atom<string | null>(null);

const CURRENT_SESSION_ATOM = atom(
  (get) => {
    const roomId = get(CURRENT_ROOM_ID_ATOM);
    const sessions = get(ROOM_SESSIONS_ATOM);
    return roomId ? sessions[roomId] : null;
  },
  (get, set, session: RoomSession | null) => {
    const roomId = get(CURRENT_ROOM_ID_ATOM);
    if (!roomId) return;

    const sessions = get(ROOM_SESSIONS_ATOM);
    if (session) {
      set(ROOM_SESSIONS_ATOM, { ...sessions, [roomId]: session });
    } else {
      const newSessions = { ...sessions };
      delete newSessions[roomId];
      set(ROOM_SESSIONS_ATOM, newSessions);
    }
  },
);

// Hooks to expose state
export function useSetCurrentRoomId() {
  return useSetAtom(CURRENT_ROOM_ID_ATOM);
}

export function useCurrentSession() {
  return useAtom(CURRENT_SESSION_ATOM);
}

export function useCurrentSessionValue() {
  return useAtomValue(CURRENT_SESSION_ATOM);
}

export function useDefaultNickname() {
  return useAtom(DEFAULT_NICKNAME_ATOM);
}
