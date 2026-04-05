"""Aggregates for charts and Gemini consulting prompts."""

from __future__ import annotations

from typing import Any

from src.db.repository import get_repository


def monthly_totals_all_months() -> list[dict[str, Any]]:
    repo = get_repository()
    return repo.monthly_totals(reference_month=None)


def totals_for_month(reference_month: str) -> dict[str, float]:
    rows = get_repository().monthly_totals(reference_month=reference_month)
    if not rows:
        return {"total": 0.0, "necessario": 0.0, "superfluo": 0.0}
    r = rows[0]
    return {
        "total": r["total"],
        "necessario": r["necessario"],
        "superfluo": r["superfluo"],
    }


def build_consulting_payload(reference_month: str, history_months: int = 12) -> dict[str, Any]:
    repo = get_repository()
    hist = repo.history_monthly_summary(last_n=history_months)
    current = totals_for_month(reference_month)
    by_card = repo.monthly_totals_by_card(reference_month)
    return {
        "current_month": reference_month,
        "current_totals": {
            "total": current["total"],
            "necessario": current["necessario"],
            "superfluo": current["superfluo"],
            "por_cartao": by_card,
        },
        "history": hist,
    }
