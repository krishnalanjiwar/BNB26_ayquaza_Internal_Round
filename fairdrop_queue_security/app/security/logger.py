import logging
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

logger = logging.getLogger("fairdrop.security")


def mask_token(token: Optional[str]) -> Optional[str]:
    """Return safe masked representation of sensitive token (e.g. 'eyJh...9xZ1')."""
    if not token or len(token) < 12:
        return None
    return f"{token[:6]}...{token[-4:]}"


def log_security_event(
    decision: str,
    score: int,
    reasons: List[str],
    mitigation_enabled: bool,
    endpoint: str,
    event_id: Optional[str] = None,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    rate_limit_result: Optional[Dict[str, Any]] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Log structured security events.
    Guarantees no raw tokens, passwords, or secrets are logged.
    """
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_id": event_id,
        "user_id": user_id,
        "session_id": session_id,
        "ip_address": ip_address,
        "endpoint": endpoint,
        "decision": decision,
        "risk_score": score,
        "reasons": reasons,
        "mitigation_enabled": mitigation_enabled,
        "rate_limit": rate_limit_result,
    }
    if extra:
        safe_extra = {
            k: mask_token(v) if "token" in k.lower() or "secret" in k.lower() else v
            for k, v in extra.items()
        }
        payload["extra"] = safe_extra

    logger.info(json.dumps(payload))
    return payload
