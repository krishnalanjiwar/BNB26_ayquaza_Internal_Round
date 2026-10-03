from enum import Enum
from typing import Set, Dict
from app.core.errors import AppException


class QueueState(str, Enum):
    WAITING = "WAITING"
    ADMITTED = "ADMITTED"
    RESERVATION_HELD = "RESERVATION_HELD"
    BOOKED = "BOOKED"
    EXPIRED = "EXPIRED"
    REJECTED = "REJECTED"


VALID_TRANSITIONS: Dict[QueueState, Set[QueueState]] = {
    QueueState.WAITING: {QueueState.ADMITTED, QueueState.REJECTED},
    QueueState.ADMITTED: {QueueState.RESERVATION_HELD, QueueState.EXPIRED, QueueState.REJECTED},
    QueueState.RESERVATION_HELD: {QueueState.BOOKED, QueueState.EXPIRED, QueueState.REJECTED},
    QueueState.BOOKED: set(),
    QueueState.EXPIRED: set(),
    QueueState.REJECTED: set(),
}


class InvalidStateTransitionError(AppException):
    def __init__(self, current_state: str, new_state: str):
        super().__init__(
            code="INVALID_STATE_TRANSITION",
            message=f"Cannot transition queue state from {current_state} to {new_state}",
            status_code=400,
        )


def validate_transition(current_state: str, new_state: str) -> bool:
    """Check if transitioning from current_state to new_state is allowed."""
    try:
        curr = QueueState(current_state)
        nxt = QueueState(new_state)
    except ValueError:
        return False
    return nxt in VALID_TRANSITIONS.get(curr, set())


def transition_state(current_state: str, new_state: str) -> QueueState:
    """Validate and perform state transition, raising InvalidStateTransitionError on failure."""
    if not validate_transition(current_state, new_state):
        raise InvalidStateTransitionError(current_state, new_state)
    return QueueState(new_state)
