import pytest
from app.queue.state_machine import (
    QueueState,
    transition_state,
    validate_transition,
    InvalidStateTransitionError,
)


def test_valid_state_transitions():
    """Verify standard legitimate state transitions."""
    assert transition_state(QueueState.WAITING, QueueState.ADMITTED) == QueueState.ADMITTED
    assert transition_state(QueueState.WAITING, QueueState.REJECTED) == QueueState.REJECTED

    assert transition_state(QueueState.ADMITTED, QueueState.RESERVATION_HELD) == QueueState.RESERVATION_HELD
    assert transition_state(QueueState.ADMITTED, QueueState.EXPIRED) == QueueState.EXPIRED
    assert transition_state(QueueState.ADMITTED, QueueState.REJECTED) == QueueState.REJECTED

    assert transition_state(QueueState.RESERVATION_HELD, QueueState.BOOKED) == QueueState.BOOKED
    assert transition_state(QueueState.RESERVATION_HELD, QueueState.EXPIRED) == QueueState.EXPIRED


def test_invalid_state_transitions_fail():
    """14. Arbitrary and invalid transitions must fail with InvalidStateTransitionError."""
    # Cannot jump WAITING -> BOOKED directly
    with pytest.raises(InvalidStateTransitionError):
        transition_state(QueueState.WAITING, QueueState.BOOKED)

    # Cannot transition backward ADMITTED -> WAITING
    with pytest.raises(InvalidStateTransitionError):
        transition_state(QueueState.ADMITTED, QueueState.WAITING)

    # Cannot transition from terminal states
    with pytest.raises(InvalidStateTransitionError):
        transition_state(QueueState.BOOKED, QueueState.WAITING)

    with pytest.raises(InvalidStateTransitionError):
        transition_state(QueueState.EXPIRED, QueueState.BOOKED)
