
# Refactor: Game Logic & Phase Timer UI

## Summary
This PR refactors the backend game logic to be more domain-driven and enhances the frontend with a new Phase Timer feature.

## Changes

### Backend
- **Refactoring**: Moved view filtering logic from `GameService` to `Game` model (`get_view_for_player`). This centralizes visibility rules (e.g., what Seers/Wolves see).
- **Role Balancing**: Implemented a progressive role distribution algorithm in `auto_balance_roles` (adds Doctors, Witches, Hunters based on player count).
- **Timer Support**: Added `phase_start_time` to `GameState` and `timer_enabled` to `GameSettings`.
- **Testing**: Added `tests/test_role_balance.py` covering 4-12 player scenarios.

### Frontend
- **New Component**: Created `PhaseTimer` for consistent countdowns.
- **Lobby**: Added "Enable Phase Timer" switch and Duration controls (Admin only).
- **Panels**: Integrated timer into `WerewolfPanel`, `NightPanel`, and `VotingPanel`.
- **Linting**: Fixed lint errors in `GameRoom.tsx` and `PhaseTimer.tsx`.

## Verification
- Backend tests passed: `uv run pytest` (36/36 passed).
- Linting checks passed.
