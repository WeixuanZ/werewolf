## 2026-02-05 - Unstable Callbacks Defeat Memoization
**Learning:** `PlayerCard` in `PlayerList` was re-rendering on every `gameState` update (timer ticks, etc.) because `onKick` was passed as a new inline arrow function every time, and `PlayerCard` was not memoized. Even if it were memoized, the unstable callback would break it.
**Action:** When memoizing components in lists (like `PlayerCard`), ensure to either stabilize callbacks with `useCallback` (if possible) or use a custom comparator in `React.memo` to ignore unstable callbacks if the underlying data (`player`) hasn't changed.
