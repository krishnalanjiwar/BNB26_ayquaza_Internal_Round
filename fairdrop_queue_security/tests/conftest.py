import pytest
import fakeredis.aioredis
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.auth import create_session_token
from app.db.models import Base
from app.db.database import get_db
from app.queue.redis_queue import set_redis_client, RedisQueue
from app.main import app


@pytest.fixture(autouse=True)
def setup_fake_redis():
    """Use an isolated in-memory FakeRedis instance for every test."""
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    set_redis_client(fake)
    yield fake


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a fresh in-memory SQLite database session for each test."""
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_maker() as session:
        yield session

    await test_engine.dispose()


@pytest.fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provide an AsyncClient for testing FastAPI endpoints with overridden database."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers():
    """Helper fixture to generate Bearer Authorization header."""
    def _headers(user_id: str):
        token = create_session_token(user_id)
        return {"Authorization": f"Bearer {token}"}
    return _headers
