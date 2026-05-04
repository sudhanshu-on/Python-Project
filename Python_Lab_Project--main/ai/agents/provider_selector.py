"""Provider and model selection helpers for multi-LLM fallback."""

from __future__ import annotations

import os


def provider_order() -> list[str]:
    raw = os.getenv("LLM_PROVIDER_PRIORITY", "groq,openrouter,gemini")
    providers = [p.strip().lower() for p in raw.split(",") if p.strip()]
    # Keep only known providers in declared order.
    return [p for p in providers if p in {"groq", "openrouter", "gemini"}]


def provider_api_key(provider: str) -> str | None:
    if provider == "groq":
        return os.getenv("GROQ_API_KEY")
    if provider == "openrouter":
        return os.getenv("OPENROUTER_API_KEY")
    if provider == "gemini":
        return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    return None


def provider_model(provider: str, task: str) -> str:
    if provider == "groq":
        if task == "verify":
            return os.getenv("GROQ_MODEL_VERIFY", os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"))
        if task == "timeline":
            return os.getenv("GROQ_MODEL_TIMELINE", os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"))
        return os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    if provider == "openrouter":
        if task == "verify":
            return os.getenv("OPENROUTER_MODEL_VERIFY", os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini"))
        if task == "timeline":
            return os.getenv("OPENROUTER_MODEL_TIMELINE", os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini"))
        return os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")

    # gemini defaults
    if task == "verify":
        return os.getenv("GEMINI_MODEL_VERIFY", os.getenv("GEMINI_MODEL", "gemini-2.0-flash"))
    if task == "timeline":
        return os.getenv("GEMINI_MODEL_TIMELINE", os.getenv("GEMINI_MODEL", "gemini-2.0-flash"))
    return os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


def provider_base_url(provider: str) -> str | None:
    if provider == "groq":
        return os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    if provider == "openrouter":
        return os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    return None
