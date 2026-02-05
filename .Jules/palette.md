## 2025-10-26 - Importance of Semantic Toggle States
**Learning:** Large interactive elements (like player cards in voting) often act as toggle buttons but are implemented as generic buttons. Adding `aria-pressed` instantly makes the "selected" state accessible to screen readers without needing complex radio group structures.
**Action:** When implementing "select one" or "toggle" interfaces, always verify if `aria-pressed` is needed to communicate the active state.
