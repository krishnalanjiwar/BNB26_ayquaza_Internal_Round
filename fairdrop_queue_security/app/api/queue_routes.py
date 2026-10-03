from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.auth import get_current_user, create_session_token
from app.core.errors import RateLimitedException, BlockedException
from app.db.database import get_db
from app.queue.service import QueueService
from app.security.decisions import evaluate_request

router = APIRouter(tags=["Queue"])


class DevTokenRequest(BaseModel):
    user_id: str


class DevTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str


@router.post("/auth/dev-token", response_model=DevTokenResponse)
async def create_dev_token(payload: DevTokenRequest):
    """
    Utility endpoint for local dev/testing: generates a signed session Bearer token.
    """
    token = create_session_token(payload.user_id)
    return DevTokenResponse(access_token=token, user_id=payload.user_id)


@router.post("/events/{event_id}/join-queue")
async def join_queue_endpoint(
    event_id: str,
    request: Request,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Join FIFO queue for an event. Idempotent: repeated joins preserve position.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Evaluate rate limiting and risk
    sec = await evaluate_request(
        ip_address=client_ip,
        user_id=current_user,
        endpoint="join_queue",
        event_id=event_id,
    )
    if sec["decision"] == "TEMPORARY_BLOCK":
        raise BlockedException(
            message="Temporarily blocked due to high abuse signals",
            retry_after=sec.get("retry_after", 30),
        )
    if sec["decision"] == "THROTTLE":
        raise RateLimitedException(
            message="Too many requests. Please wait before retrying.",
            retry_after=sec.get("retry_after", 1),
        )

    queue_service = QueueService(db)
    result = await queue_service.join_queue(event_id, current_user)
    return result


@router.get("/queue/{entry_id}")
async def get_queue_status_endpoint(
    entry_id: str,
    request: Request,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Retrieve authoritative server queue status for the authenticated user.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Evaluate rate limiting and risk
    sec = await evaluate_request(
        ip_address=client_ip,
        user_id=current_user,
        endpoint="queue_status",
    )
    if sec["decision"] == "TEMPORARY_BLOCK":
        raise BlockedException(
            message="Temporarily blocked due to security policy",
            retry_after=sec.get("retry_after", 30),
        )
    if sec["decision"] == "THROTTLE":
        raise RateLimitedException(
            message="Rate limit exceeded. Waiting room poll rate too high.",
            retry_after=sec.get("retry_after", 2),
        )

    queue_service = QueueService(db)
    result = await queue_service.get_queue_status(entry_id, current_user)
    return result
