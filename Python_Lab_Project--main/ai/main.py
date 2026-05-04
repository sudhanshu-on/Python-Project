# FastAPI app entry point. Initialize app and include routers.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import time
import uuid
from routers import analyze, chat, ingest
from db.chroma_client import init_chroma
from dotenv import load_dotenv
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env.local"))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"))

logger = logging.getLogger("clinicalai.api")
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialise ChromaDB collection
    init_chroma()
    print("ChromaDB initialised")
    yield
    # Shutdown: nothing to clean up for now
    print("Shutting down")

app = FastAPI(
    title="ClinicalAI API",
    version="1.0.0",
    description="LangChain-powered clinical note analysis for TeamSprintX",
    lifespan=lifespan,
)

# Only the Express server should call this service.
# Do NOT add a wildcard origin here in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGIN", "http://localhost:3001")],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "x-internal-key"],
)

app.include_router(analyze.router)
app.include_router(chat.router)
app.include_router(ingest.router)


@app.middleware("http")
async def request_logger(request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())[:8]
    start = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = int((time.perf_counter() - start) * 1000)
        logger.exception(
            "request_id=%s method=%s path=%s status=500 duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
        )
        raise

    duration_ms = int((time.perf_counter() - start) * 1000)
    response.headers["x-request-id"] = request_id
    logger.info(
        "request_id=%s method=%s path=%s status=%s duration_ms=%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response

@app.get("/health")
async def health():
    """No auth — used by deployment platform uptime checks."""
    return {"status": "ok", "service": "ClinicalAI"}