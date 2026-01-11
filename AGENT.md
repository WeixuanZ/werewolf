# AGENT.md - Project Context & Learnings

This document tracks the technical decisions, code style, and architectural patterns established for the Werewolf game.

## 🚀 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Persistence/Presence**: Redis
- **Real-time**: WebSockets (custom `ConnectionManager` with Redis Pub/Sub for horizontal scaling)
- **Validation**: Pydantic v2
- **Formatting/Linting**: Ruff (replacing Black/Flake8)

### Frontend
- **Framework**: React 19 + Vite
- **UI Library**: Ant Design (Premium/Rich aesthetics)
- **State Management**: Jotai (Encapsulated pattern: Private ALL_CAPS atoms, exposed via custom hooks in `gameStore.ts`)
- **Data Fetching**: React Query (@tanstack/react-query)
- **WebSocket**: `react-use-websocket`
- **Optimization**: **React Compiler** (enabled via `babel-plugin-react-compiler`)
- **Formatting**: Prettier (Single quotes, 100 line width)

---

## 🛠️ Key Architectural Decisions

### 1. Robust WebSocket Presence
- **Rising Edge Reconnection**: The backend implements "rising edge" detection for reconnection notifications. A `PLAYER_RECONNECTED` event is only broadcast if the player was previously marked as offline in Redis.
- **Redis Presence**: Player online status is tracked via Redis keys (`presence:{room_id}:{player_id}`) with a 30s TTL, refreshed by periodic PING/PONG heartbeats.
- **Heartbeat Loop**: A global background task on the server sends PINGs to all connected clients to ensure stale connections are pruned.

### 2. Session Persistence
- **Room-specific Sessions**: Using Jotai and `localStorage`, the frontend stores a mapping of `room_id -> {player_id, nickname}`. This allows players to refresh their browsers or reconnect mid-game without losing their identity or role.

### 3. Role Visibility & Game Logic
- **Seer Reveals**: The `Game` model tracks `seer_reveals` specifically. The `get_player_view` service filters the game state server-side to hide roles unless:
  - The player owns the role.
  - The player is dead.
  - The Seer has revealed that specific player.
  - The game is over.
- **End Game Early**: Admins have a dedicated endpoint to terminate a session, which immediately reveals all roles to all participants.

---

## 🎨 Code Style & Conventions

### Python (Ruff)
- **Line Length**: 100 characters.
- **Rules**: Strict set of rules including `B` (Bugbear), `SIM` (Simplify), `I` (Isort), and `ARG` (Unused arguments).
- **FastAPI**: Exception raises use the `raise ... from e` pattern for better traceback context.
- **Asyncio**: Background tasks (fire-and-forget) must be stored in a `set` to prevent garbage collection (`RUF006`).

### TypeScript / React
- **Formatting**: Single quotes, 100 line width, trailing commas.
- **State Management**: Atoms must be **private** (internal to `gameStore.ts`) and use **`ALL_CAPS`** naming. Access state only via exposed custom hooks.
- **React Compiler**: Hooks like `useMemo` and `useCallback` are **omitted** as the compiler handles memoization automatically.

---

## 📦 Project Structure
- `backend/app/models`: Core game logic and state transitions.
- `backend/app/services`: Business logic (GameService) and connection management (WebsocketManager).
- `frontend/src/store`: Jotai atoms for global and persistent state.
- `frontend/src/hooks`: Custom `useGameSocket` for unified status/state management.
