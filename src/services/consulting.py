"""Load or generate Gemini consulting insights with SQLite cache."""

from __future__ import annotations

from typing import Any

from src.ai.client import consulting_to_cache_payload, generate_consulting
from src.db.repository import get_repository
from src.services.analytics import build_consulting_payload


def get_or_generate_insights(
    reference_month: str,
    *,
    force_refresh: bool = False,
) -> dict[str, Any]:
    repo = get_repository()
    if not force_refresh:
        cached = repo.get_consulting_cache(reference_month)
        if cached is not None:
            return cached
    analytics = build_consulting_payload(reference_month)
    resp = generate_consulting(analytics)
    payload = consulting_to_cache_payload(resp)
    repo.set_consulting_cache(reference_month, payload)
    return payload
