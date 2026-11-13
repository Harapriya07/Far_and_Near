"""FastAPI application entry point for Far & Near."""
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from sqlalchemy.exc import SQLAlchemyError

from app.api.auth import router as auth_router
from app.api.spaces import router as spaces_router
from app.api.bucket_list import router as bucket_list_router
from app.api.ludo import router as ludo_router
from app.api.games import router as games_router
from app.core.config import get_settings
from app.core.security import AuthConfigurationError
from app.db.session import DatabaseConfigurationError, probe_database
from app.services.auth import AuthError

settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    description="Far & Near API foundation and authentication, shared spaces, bucket-list collaboration, a shared six-game lounge, synchronized game state, and Ludo.",
    version="0.2.0",
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    docs_url=f"{settings.api_v1_prefix}/docs",
    redoc_url=f"{settings.api_v1_prefix}/redoc",
)

if settings.frontend_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.frontend_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
    )


@app.exception_handler(AuthError)
def auth_error_handler(request: Request, exc: AuthError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": []}},
        headers={"Cache-Control": "no-store"},
    )


@app.exception_handler(AuthConfigurationError)
def auth_configuration_handler(request: Request, exc: AuthConfigurationError) -> JSONResponse:
    # Do not return secret values or raw configuration details.
    return JSONResponse(status_code=503, content={"error": {"code": "auth_not_configured", "message": "Authentication is temporarily unavailable", "details": []}})


@app.exception_handler(DatabaseConfigurationError)
def database_configuration_handler(request: Request, exc: DatabaseConfigurationError) -> JSONResponse:
    return JSONResponse(status_code=503, content={"error": {"code": "database_unavailable", "message": "Database is temporarily unavailable", "details": []}})


@app.exception_handler(SQLAlchemyError)
def database_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    # Detailed exceptions remain in server diagnostics; responses never include SQL or credentials.
    import logging
    logging.getLogger("far_near.database").error("Database operation failed (%s)", type(exc).__name__)
    return JSONResponse(status_code=503, content={"error": {"code": "database_unavailable", "message": "Database is temporarily unavailable", "details": []}})


@app.exception_handler(RequestValidationError)
def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    safe_details = [{"loc": list(item.get("loc", ())), "msg": item.get("msg", "Invalid value"), "type": item.get("type", "value_error")} for item in exc.errors()]
    return JSONResponse(status_code=422, content={"error": {"code": "validation_error", "message": "Request validation failed", "details": safe_details}})


@app.get(f"{settings.api_v1_prefix}/health", tags=["health"], summary="Application and database health")
def health_check() -> dict[str, str]:
    connected, database_status = probe_database()
    if not connected:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail={"status": "degraded", "database": database_status})
    return {"status": "ok", "database": "connected"}


app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(spaces_router, prefix=settings.api_v1_prefix)
app.include_router(bucket_list_router, prefix=settings.api_v1_prefix)
app.include_router(ludo_router, prefix=settings.api_v1_prefix)
app.include_router(games_router, prefix=settings.api_v1_prefix)


# In production, FastAPI serves the Vite build from the same origin. This keeps
# refresh/CSRF cookies first-party and avoids cross-subdomain cookie problems.
_frontend_dist = Path(__file__).resolve().parents[2] / "dist"
if (_frontend_dist / "index.html").is_file():
    _assets = _frontend_dist / "assets"
    if _assets.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets)), name="frontend-assets")

    @app.get("/", include_in_schema=False)
    def frontend_root() -> FileResponse:
        return FileResponse(_frontend_dist / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    def frontend_routes(full_path: str) -> FileResponse:
        if full_path.startswith("api/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (_frontend_dist / full_path).resolve()
        if _frontend_dist.resolve() in candidate.parents and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_frontend_dist / "index.html")
