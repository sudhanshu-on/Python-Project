"""Helpers to prevent repeated Gemini calls during quota exhaustion windows."""

from __future__ import annotations

import re
import time


_blocked_until_epoch = 0.0


def _extract_retry_seconds(error_text: str) -> int:
    # Handles forms like: "Please retry in 27.4259275s" or "retryDelay': '27s'"
    patterns = [
        r"retry in\s+([0-9]+(?:\.[0-9]+)?)s",
        r"retryDelay[^0-9]*([0-9]+)s",
    ]
    for pattern in patterns:
        match = re.search(pattern, error_text, re.IGNORECASE)
        if match:
            return max(1, int(float(match.group(1))))
    return 30


def ensure_quota_open() -> None:
    global _blocked_until_epoch
    now = time.time()
    if now < _blocked_until_epoch:
        remaining = int(_blocked_until_epoch - now)
        raise RuntimeError(
            f"Gemini quota cooldown active. Retry after about {remaining}s."
        )


def register_llm_exception(exc: Exception) -> None:
    global _blocked_until_epoch
    text = str(exc)
    upper = text.upper()
    if "RESOURCE_EXHAUSTED" in upper or "QUOTA" in upper or "429" in upper:
        wait_seconds = _extract_retry_seconds(text)
        _blocked_until_epoch = max(_blocked_until_epoch, time.time() + wait_seconds)
