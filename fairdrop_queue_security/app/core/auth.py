from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import get_settings
from app.core.errors import UnauthorizedException

security_scheme = HTTPBearer(auto_error=False)


def create_session_token(user_id: str, extra_claims: Optional[Dict[str, Any]] = None) -> str:
    """Create a signed development session token (JWT) containing user_id."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "user_id": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=settings.SESSION_TOKEN_TTL_SECONDS)).timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.SESSION_SECRET_KEY, algorithm="HS256")


def decode_session_token(token: str) -> Dict[str, Any]:
    """Decode and verify a signed development session token."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SESSION_SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedException("Session token has expired")
    except jwt.InvalidTokenError:
        raise UnauthorizedException("Invalid session token")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> str:
    """FastAPI dependency to extract and validate the authenticated user_id from Bearer token."""
    if not credentials or not credentials.credentials:
        raise UnauthorizedException("Authorization header with Bearer token is required")

    payload = decode_session_token(credentials.credentials)
    user_id = payload.get("user_id") or payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Malformed session token: missing user_id")
    return str(user_id)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Optional[str]:
    """Extract user_id if token provided, otherwise return None without raising."""
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_session_token(credentials.credentials)
        return str(payload.get("user_id") or payload.get("sub"))
    except Exception:
        return None
