## 2026-02-04 - Accessibility in Interactive Lists
**Learning:** Interactive lists implemented as grids of buttons need `aria-pressed` to communicate selection state, not just visual border changes.
**Action:** Always pair visual selection states (borders/backgrounds) with `aria-pressed` or `aria-selected` on the interactive element.
