from typing import Optional
from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        retry_after: Optional[int] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retry_after = retry_after
        super().__init__(message)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(code="UNAUTHORIZED", message=message, status_code=401)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Access denied"):
        super().__init__(code="FORBIDDEN", message=message, status_code=403)


class BlockedException(AppException):
    def __init__(self, message: str = "Temporarily blocked due to security policy", retry_after: int = 30):
        super().__init__(
            code="TEMPORARILY_BLOCKED",
            message=message,
            status_code=403,
            retry_after=retry_after,
        )


class ConflictException(AppException):
    def __init__(self, message: str = "Conflict or duplicate request"):
        super().__init__(code="CONFLICT", message=message, status_code=409)


class ExpiredException(AppException):
    def __init__(self, message: str = "Hold or token has expired"):
        super().__init__(code="EXPIRED", message=message, status_code=410)


class RateLimitedException(AppException):
    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 1):
        super().__init__(
            code="RATE_LIMITED",
            message=message,
            status_code=429,
            retry_after=retry_after,
        )


class InternalServerErrorException(AppException):
    def __init__(self, message: str = "Internal server error"):
        super().__init__(code="INTERNAL_SERVER_ERROR", message=message, status_code=500)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    content = {
        "code": exc.code,
        "message": exc.message,
    }
    if exc.retry_after is not None:
        content["retry_after"] = exc.retry_after

    headers = {}
    if exc.retry_after is not None:
        headers["Retry-After"] = str(exc.retry_after)

    return JSONResponse(status_code=exc.status_code, content=content, headers=headers)
