from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.api.routes.chat import router as chat_router
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:8080",
            "http://127.0.0.1:8080",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )   

    app.include_router(health_router, prefix="/api")
    app.include_router(chat_router, prefix="/api")

    return app


app = create_app()
