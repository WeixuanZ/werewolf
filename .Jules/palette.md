## 2026-02-06 - Accessible Icon Buttons & Status Indicators
**Learning:** Icon-only buttons (like 'Kick Player') are invisible to screen readers without explicit labels, and color-only status indicators (green/red dots) need `role="status"` and text alternatives to be perceptible.
**Action:** Always add `aria-label` to icon-only `Button` components and pair visual status indicators with `role="status"` + `aria-label` describing the state (e.g., "Online"/"Offline").
