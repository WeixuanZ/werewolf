# Code Review: Multiplayer Werewolf Game

## 1. Executive Summary

The codebase demonstrates a high level of engineering quality, employing modern Python and React practices. The architecture is modular, type-safe, and designed for scalability. However, from a game design perspective, there are significant deviations from standard Werewolf rules (specifically regarding the Hunter role and dead player visibility) that impact gameplay balance and fairness.

## 2. Code Quality & Architecture

### Positives
- **Backend Architecture**: The use of FastAPI with Pydantic ensures robust data validation and serialization. The separation of concerns between `models` (state), `services` (logic), and `schemas` (API contract) is excellent.
- **State Management**: The **State Machine pattern** implemented in `backend/app/models/phases.py` is an elegant solution for managing complex game transitions. It makes adding new phases or modifying transition logic straightforward.
- **Factory Pattern**: The `get_role_instance` factory facilitates easy extension of new roles without cluttering the main game logic.
- **Scalability**: The use of Redis for state persistence and Pub/Sub for WebSockets allows the application to scale horizontally, a best practice for real-time multiplayer games.
- **Type Safety**: The codebase makes extensive use of Python type hints, enhancing maintainability and reducing runtime errors.

### Areas for Improvement
- **Error Handling**: Some valid game actions (like Witch using a potion she doesn't have) raise `ValueError`, which might result in 500 errors or unhandled exceptions if not caught by a middleware or the service layer. A custom exception hierarchy for Game Logic errors would be cleaner.
- **Frontend-Backend Contract**: The strict "Werewolf Consensus" logic (`NightState.check_completion`) requires perfect coordination without an in-game mechanism for it, potentially causing game stalls if the frontend doesn't handle split votes gracefully.

## 3. Game Rules Verification

### Correctly Implemented
- **Phasing**: The Day/Night cycle and Waiting phases function correctly.
- **Winning Conditions**: Villager vs. Werewolf count logic is correct.
- **Basic Role Actions**: Seer (check), Doctor (save), and Werewolf (kill) standard actions are implemented correctly.
- **Witch Potions**: The Witch performs one action per night (Heal OR Poison). While strict, this is a valid implementation choice.

### Issues & Deviations
1.  **Hunter Day-Death Logic (Critical)**:
    - **Current Behavior**: The Hunter role only has a "Revenge" action during the **Night**. If a Hunter is voted out (lynched) during the **Day**, they simply die without triggering their ability.
    - **Standard Rule**: The Hunter should be able to "shoot" and eliminate a target immediately upon death if killed by a Werewolf or by Village Vote. Note: Death by Witch poison usually does *not* trigger the ability.
    - **Impact**: This significantly nerfs the Hunter role, making them just a regular Villager if lynched.

2.  **Dead Player Role Visibility (Major)**:
    - **Current Behavior**: When a player dies, their role is **not** revealed to the living players. The `get_view_for_player` logic hides roles unless the viewer is the player themselves, a spectator, or the game is over.
    - **Standard Rule**: In most Werewolf variants, the role of a dead player is revealed to all players immediately. This is crucial information for the Village to deduce who remains.
    - **Impact**: The Village has much less information to work with, tilting the balance heavily in favor of the Werewolves.

3.  **Tie Voting**:
    - **Current Behavior**: If the day vote results in a tie, no one is eliminated.
    - **Standard Rule**: Valid variant. Some rules invoke a revote or a random kill, but "no kill" is acceptable.

## 4. Missing Functionalities & Roles

### Missing Roles
- **Cupid**: Adds a layer of complexity with "Lovers" who must survive together.
- **Bodyguard/Protector**: Similar to Doctor but often cannot protect themselves or the same person twice in a row (Doctor implementation allows this currently).
- **Lycan/Cursed**: A villager who appears as a Wolf to the Seer.
- **Tanner/Fool**: A neutral role who wins if they get lynched.

### Missing Features
- **Events Log**: A history of public events (e.g., "Player X was eliminated", "Player Y voted for Z") is not explicitly tracked in the game state for client replay or history.
- **Disconnect Handling**: While presence is tracked, the game logic doesn't pause or handle a player disconnecting during a critical vote/action phase.

## 5. Recommendations

1.  **Fix Hunter Logic**: Modify `DayState.resolve` to check if the eliminated player is a Hunter. If so, transition to a temporary `HUNTER_REVENGE` phase or allow an immediate target selection before proceeding to Night. Ensure this only triggers on Vote or Wolf Kill, not Witch Poison.
2.  **Update Visibility Rules**: Add a game setting to toggle "Reveal Role on Death". This allows admins to choose the desired game style.
3.  **Improve Consensus UI**: Enhance the frontend to better visualize and facilitate Werewolf consensus during the Night phase to prevent stalls, rather than strictly relaxing the backend rule.
4.  **Add Events/History**: Implement an event log in `GameState` to provide a narrative of the game to the frontend.
