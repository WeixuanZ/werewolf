## 2025-02-18 - Ant Design Accessibility
**Learning:** Ant Design's `Switch` and icon-only `Button` components do not have default accessible names. Explicitly adding `aria-label` works and is supported by the library.
**Action:** Always add `aria-label` to these components when they lack visible text labels.
