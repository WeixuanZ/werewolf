class GameLogicError(Exception):
    """Base exception for game logic errors."""

    pass


class InvalidActionError(GameLogicError):
    """Raised when a player attempts an invalid action."""

    pass


class PhaseError(GameLogicError):
    """Raised when an action is attempted in the wrong phase."""

    pass
