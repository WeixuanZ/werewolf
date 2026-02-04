# Bolt's Journal

## 2024-05-22 - [Ref Object Stability in Lists]
**Learning:** When rendering lists of items derived from a frequently updating global state (like a game state object), object references often change even if the data is identical. `React.memo`'s default shallow comparison fails here.
**Action:** Use a custom comparison function for `React.memo` that checks specific relevant fields of the data object, rather than relying on reference equality.
