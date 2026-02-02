# Bolt's Journal ⚡

## 2025-02-12 - State-Driven List Re-renders
**Learning:** The application derives lists (e.g., `players`) from the global `gameState` object on every render using `Object.values()`. This creates new array references and new object references for items, causing full list re-renders even if data is unchanged.
**Action:** Always check for `Object.values()` or `Object.keys()` usage in render loops when optimizing lists. Use `React.memo` with custom deep comparison (or key field comparison) for list items when the source data is immutable/structural but referentially unstable.
