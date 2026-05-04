# Custom middleware for API key validation or JWT handling.
from fastapi import Request, HTTPException
import os


async def verify_internal_key(request: Request):
    """
    Shared-secret guard. Every route except /health requires this.
    The key must match AI_INTERNAL_KEY in both server/.env and ai/.env.
    """
    key = request.headers.get("x-internal-key", "")
    expected = os.getenv("AI_INTERNAL_KEY", "")

    if not expected:
        raise HTTPException(status_code=500, detail="AI_INTERNAL_KEY not configured on server")

    if key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized: invalid internal key")