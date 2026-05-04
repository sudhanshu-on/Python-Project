"""Provider-specific cooldown guard to avoid hammering exhausted LLM APIs."""

from __future__ import annotations

import re
import time


_blocked_until_by_provider: dict[str, float] = {}


def _extract_retry_seconds(error_text: str) -> int:
    patterns = [
        r"retry in\s+([0-9]+(?:\.[0-9]+)?)s",
        r"retryDelay[^0-9]*([0-9]+)s",
    ]
    for pattern in patterns:
        match = re.search(pattern, error_text, re.IGNORECASE)
        if match:
            return max(1, int(float(match.group(1))))
    return 30


def ensure_provider_open(provider: str) -> None:
    now = time.time()
    blocked_until = _blocked_until_by_provider.get(provider, 0.0)
    if now < blocked_until:
        remaining = int(blocked_until - now)
        raise RuntimeError(
            f"{provider} cooldown active. Retry after about {remaining}s."
        )


def register_provider_exception(provider: str, exc: Exception) -> None:
    text = str(exc)
    upper = text.upper()
    if "RESOURCE_EXHAUSTED" in upper or "QUOTA" in upper or "429" in upper or "RATE" in upper:
        wait_seconds = _extract_retry_seconds(text)
        now = time.time()
        existing = _blocked_until_by_provider.get(provider, 0.0)
        _blocked_until_by_provider[provider] = max(existing, now + wait_seconds)
