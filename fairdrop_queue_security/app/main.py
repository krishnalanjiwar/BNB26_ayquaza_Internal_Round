import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import AppException, app_exception_handler
from app.db.database import init_db
from app.api.queue_routes import router as queue_router
from app.api.admin_routes import router as admin_router
from app.queue.admission_worker import AdmissionWorker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("fairdrop.main")

settings = get_settings()
admission_worker = AdmissionWorker()
_worker_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized successfully.")

    # Start background admission worker task
    global _worker_task
    # The worker periodically admits active events
    _worker_task = asyncio.create_task(
        admission_worker.start(
            get_active_event_ids_callable=lambda: ["demo-event"]
        )
    )
    logger.info("Background admission worker started.")

    yield

    # Shutdown
    admission_worker.stop()
    if _worker_task:
        _worker_task.cancel()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title="Fair Drop — Queue & Security Backend",
    description="High-demand ticket sale queue and security backend component.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_ORIGIN,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)

# Include routers
app.include_router(queue_router)
app.include_router(admin_router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": "fairdrop_queue_security",
        "mitigation_enabled": settings.MITIGATION_ENABLED,
    }
