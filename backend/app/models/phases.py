"""State Machine pattern for Werewolf game phases.

Each phase is a state that knows how to:
- Validate transitions to other phases
- Process actions specific to that phase
- Check if the phase should complete
- Resolve the phase and return the next phase
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.game import Game

from app.core.exceptions import InvalidActionError
from app.models.roles import RoleType
from app.schemas.game import GamePhase, NightActionType


class PhaseState(ABC):
    """Abstract base class for game phase states."""

    phase: GamePhase

    @abstractmethod
    def on_enter(self, game: Game) -> None:
        """Called when transitioning into this phase."""

    @abstractmethod
    def process_action(self, game: Game, player_id: str, action: dict) -> None:
        """Process a player action (night action or vote)."""

    @abstractmethod
    def check_completion(self, game: Game) -> bool:
        """Check if all required actions are complete."""

    @abstractmethod
    def resolve(self, game: Game) -> GamePhase:
        """Resolve the phase and return the next phase."""


class WaitingState(PhaseState):
    phase = GamePhase.WAITING

    def on_enter(self, game: Game) -> None:
        # Reset all players for new game
        for player in game.players.values():
            player.is_alive = True
            player.role = None
            player.vote_target = None
            player.night_action_target = None
        game.turn_count = 0
        game.winners = None

    def process_action(self, game: Game, player_id: str, action: dict) -> None:
        pass  # No actions in waiting phase

    def check_completion(self, _game: Game) -> bool:
        return False  # Waiting phase only ends via explicit start

    def resolve(self, _game: Game) -> GamePhase:
        return GamePhase.NIGHT  # Start with night phase


class NightState(PhaseState):
    phase = GamePhase.NIGHT

    def on_enter(self, game: Game) -> None:
        # Clear previous night actions
        for player in game.players.values():
            player.night_action_target = None
            player.night_action_type = None
            player.night_action_confirmed = False

    def process_action(self, game: Game, player_id: str, action: dict) -> None:
        player = game.players.get(player_id)
        if not player or not player.is_alive or not player.role:
            return

        if not player.can_act_at_night():
            raise InvalidActionError(f"{player.role} cannot act at night")

        target_id = action.get("target_id")
        action_type = action.get("action_type")

        if not action_type or not isinstance(action_type, str):
            # Invalid action type
            return

        if not player.role_instance:
            return

        # Validate confirmed flag
        confirmed = action.get("confirmed", True)
        player.night_action_confirmed = confirmed

        # Delegate validation and state updates to the Role instance
        try:
            player.role_instance.handle_night_action(game, player_id, action_type, target_id)
        except InvalidActionError as e:
            # You might want to log this or return an error to the user
            # For now, we just return safely without updating state
            print(f"Invalid action for {player_id}: {e}")
            raise e

    def check_completion(self, game: Game) -> bool:
        """All alive players with night actions must have acted. Werewolves must agree."""

        # Check general completion first (everyone acted)
        for player in game.players.values():
            if not player.is_alive or not player.role:
                continue
            if player.can_act_at_night():
                if player.night_action_target is None:
                    return False
                if not player.night_action_confirmed:
                    return False

        # Enforce Werewolf Consensus
        werewolves = [
            p for p in game.players.values() if p.is_alive and p.role == RoleType.WEREWOLF
        ]

        if werewolves:
            targets = {p.night_action_target for p in werewolves}
            if len(targets) > 1:
                return False

        return True

    def resolve(self, game: Game) -> GamePhase:
        """Process kills and saves, then check for winner or move to day."""
        kills: set[str] = set()
        saves: set[str] = set()

        for player in game.players.values():
            if not player.is_alive or not player.role or not player.night_action_target:
                continue

            if player.role == RoleType.WEREWOLF:
                kills.add(player.night_action_target)
            elif player.role == RoleType.WITCH:
                if player.night_action_type == NightActionType.POISON:
                    kills.add(player.night_action_target)
                elif player.night_action_type == NightActionType.HEAL:
                    saves.add(player.night_action_target)
            elif player.role == RoleType.DOCTOR or player.role == RoleType.BODYGUARD:
                saves.add(player.night_action_target)

        # Cupid Logic: Process Links
        for player in game.players.values():
            if (
                player.role == RoleType.CUPID
                and player.night_action_target
                and player.night_action_type == NightActionType.LINK
            ):
                # Apply link
                targets = player.night_action_target.split(",")
                if len(targets) == 2:
                    game.lovers = targets
                # Cupid only works on turn 1, logic prevents action otherwise

        # Calculate deaths (first pass)
        dead_this_round = kills - saves

        # Phase 2: Hunter Revenge (and any other death triggers)
        # Check if any hunters died
        final_deaths = set(dead_this_round)

        hunters = [p for p in game.players.values() if p.role == RoleType.HUNTER]
        for hunter in hunters:
            if hunter.id in dead_this_round and hunter.night_action_target:
                # Hunter died, so their target dies too (Revenge)
                final_deaths.add(hunter.night_action_target)

        # Phase 3: Lovers Suicide Pact
        secondary_deaths = game.resolve_lovers_pact(final_deaths)
        final_deaths.update(secondary_deaths)

        # Apply deaths
        for target_id in final_deaths:
            if target_id in game.players:
                game.players[target_id].is_alive = False

        game.turn_count += 1

        winner = game.check_winners()

        # Lovers Win Condition Check (if not covered by check_winners)
        # Implemented inside check_winners if possible, or here?
        # Standard: Lovers win if they are the last 2 alive.
        # check_winners handles Team Wins.
        # Let's add special check here or modify check_winners.
        # Modifying check_winners is better for consistency.

        if winner:
            game.winners = winner
            return GamePhase.GAME_OVER

        return GamePhase.DAY


class DayState(PhaseState):
    phase = GamePhase.DAY

    def on_enter(self, game: Game) -> None:
        # Clear votes
        for player in game.players.values():
            player.vote_target = None
        game.voted_out_this_round = None

    def process_action(self, game: Game, player_id: str, action: dict) -> None:
        player = game.players.get(player_id)
        if not player or not player.is_alive:
            return

        role = player.role_instance
        if role and not role.can_vote:
            return

        target_id = action.get("target_id")
        if target_id and target_id in game.players:
            player.vote_target = target_id

    def check_completion(self, game: Game) -> bool:
        """All alive players must have voted."""
        for player in game.players.values():
            if not player.is_alive:
                continue

            role = player.role_instance
            if role and not role.can_vote:
                continue

            if player.vote_target is None:
                return False
        return True

    def resolve(self, game: Game) -> GamePhase:
        """Count votes, eliminate player with most votes (plurality), check winner."""
        vote_counts: dict[str, int] = {}
        for player in game.players.values():
            if player.is_alive and player.vote_target:
                vote_counts[player.vote_target] = vote_counts.get(player.vote_target, 0) + 1

        # Find max votes
        if vote_counts:
            max_votes = max(vote_counts.values())
            top_voted = [pid for pid, count in vote_counts.items() if count == max_votes]

            # Only eliminate if there's a clear winner (no tie)
            if len(top_voted) == 1:
                eliminated_id = top_voted[0]

                # Check Tanner
                if game.players[eliminated_id].role == RoleType.TANNER:
                    game.winners = "TANNER"
                    return GamePhase.GAME_OVER

                game.players[eliminated_id].is_alive = False
                game.voted_out_this_round = eliminated_id

                # Lovers Suicide Pact (Day)
                # We treat the eliminated player as dead for the check
                secondary_deaths = game.resolve_lovers_pact({eliminated_id})
                for pid in secondary_deaths:
                    game.players[pid].is_alive = False

                # Check Hunter
                if game.players[eliminated_id].role == RoleType.HUNTER:
                    return GamePhase.HUNTER_REVENGE

        winner = game.check_winners()
        if winner:
            game.winners = winner
            return GamePhase.GAME_OVER

        return GamePhase.NIGHT


class HunterRevengeState(PhaseState):
    phase = GamePhase.HUNTER_REVENGE

    def on_enter(self, game: Game) -> None:
        # We need to find the recently died hunter and prepare them
        # Usually we just clear their action so they can pick again?
        # But wait, they might have picked a target at night (if they thought they'd die at night).
        # We should clear it to ensure a fresh choice for *this* death.
        for player in game.players.values():
            if player.role == RoleType.HUNTER and not player.is_alive:
                player.night_action_target = None
                player.night_action_confirmed = False

    def process_action(self, game: Game, player_id: str, action: dict) -> None:
        player = game.players.get(player_id)
        # Allow action even if not is_alive, BUT only if they are the Hunter who just died?
        # Simpler: Allow any Hunter who is dead to act?
        # Or better: check game.voted_out_this_round
        if not player or player.role != RoleType.HUNTER:
            return

        # If they are not the one voted out, they shouldn't act?
        # Actually, if multiple hunters die? But voting only kills one.
        if game.voted_out_this_round != player_id:
            # Maybe they died earlier and are just chatting?
            # But in this phase, we expect the specific hunter to act.
            return

        target_id = action.get("target_id")
        action_type = action.get("action_type")

        if action_type != NightActionType.REVENGE:
            raise InvalidActionError(f"Invalid action type {action_type} for Hunter Revenge")

        if not target_id or target_id not in game.players:
            raise InvalidActionError("Invalid target")

        if not game.players[target_id].is_alive:
            raise InvalidActionError("Target is already dead")

        player.night_action_target = target_id
        player.night_action_type = action_type
        player.night_action_confirmed = action.get("confirmed", False)
        player.hunter_revenge_target = target_id

    def check_completion(self, game: Game) -> bool:
        # Check if the hunter has acted
        hunter_id = game.voted_out_this_round
        if not hunter_id:
            return True  # Should not happen, but safe fallback

        hunter = game.players.get(hunter_id)
        if not hunter:
            return True

        if hunter.night_action_target and hunter.night_action_confirmed:
            return True

        return False

    def resolve(self, game: Game) -> GamePhase:
        hunter_id = game.voted_out_this_round
        if hunter_id:
            hunter = game.players.get(hunter_id)
            if hunter and hunter.night_action_target:
                target_id = hunter.night_action_target
                if target_id in game.players:
                    game.players[target_id].is_alive = False

                    # Check Lovers Pact for Hunter's victim
                    secondary_deaths = game.resolve_lovers_pact({target_id})
                    for pid in secondary_deaths:
                        game.players[pid].is_alive = False

        winner = game.check_winners()
        if winner:
            game.winners = winner
            return GamePhase.GAME_OVER

        return GamePhase.NIGHT


class GameOverState(PhaseState):
    phase = GamePhase.GAME_OVER

    def on_enter(self, game: Game) -> None:
        pass  # Nothing to do

    def process_action(self, game: Game, player_id: str, action: dict) -> None:
        pass  # No actions in game over

    def check_completion(self, _game: Game) -> bool:
        return False  # Game over is terminal

    def resolve(self, _game: Game) -> GamePhase:
        return GamePhase.GAME_OVER  # Stay in game over


# Phase state registry
PHASE_STATES: dict[GamePhase, PhaseState] = {
    GamePhase.WAITING: WaitingState(),
    GamePhase.NIGHT: NightState(),
    GamePhase.DAY: DayState(),
    GamePhase.HUNTER_REVENGE: HunterRevengeState(),
    GamePhase.GAME_OVER: GameOverState(),
}


def get_phase_state(phase: GamePhase) -> PhaseState:
    return PHASE_STATES[phase]
