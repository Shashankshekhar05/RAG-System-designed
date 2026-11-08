from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import engine, Base
import app.models  # Ensure models are imported so Base.metadata knows about them
from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.upload import router as upload_router
from app.routes.chat import router as chat_router
from app.services.email_callback.worker import start_worker, stop_worker
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: auto-create PostgreSQL tables if they don't exist
    logger.info("Initializing database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified / created successfully.")
    except Exception as e:
        logger.error(f"Database table initialization warning (Database may not be ready yet): {e}")

    # Start asynchronous Redis email callback worker
    worker_task = start_worker()

    yield

    # Shutdown logic
    logger.info("Shutting down Advisor.ai backend...")
    stop_worker()
    if worker_task:
        worker_task.cancel()
    logger.info("Background email callback worker stopped.")


app = FastAPI(
    title="Advisor.ai API",
    version="1.0.0",
    description="Zero-cost, local-first RAG with semantic caching, hybrid search, and async email callback.",
    lifespan=lifespan
)

# CORS configuration allowing localhost:3000 (and configured FRONTEND_URL)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(chat_router)
