from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.upload import router as upload_router
from app.routes.chat import router as chat_router

__all__ = ["health_router", "auth_router", "upload_router", "chat_router"]

