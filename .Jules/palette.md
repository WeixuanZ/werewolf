## 2025-02-18 - Ant Design Accessibility
**Learning:** Ant Design's `Switch` and icon-only `Button` components do not have default accessible names. Explicitly adding `aria-label` works and is supported by the library.
**Action:** Always add `aria-label` to these components when they lack visible text labels.
## 2026-02-04 - Accessibility in Interactive Lists
**Learning:** Interactive lists implemented as grids of buttons need `aria-pressed` to communicate selection state, not just visual border changes.
**Action:** Always pair visual selection states (borders/backgrounds) with `aria-pressed` or `aria-selected` on the interactive element.
