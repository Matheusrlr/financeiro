"""Google GenAI client for categorization and consulting."""

from __future__ import annotations

import json
import re
from typing import Any

from google import genai

from src.ai.prompts import categorization_prompt, consulting_prompt
from src.ai.schemas import CategorizationResponse, ConsultingResponse
from src.config import GEMINI_API_KEY, GEMINI_MODEL


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    return text.strip()


def _parse_json_object(text: str) -> dict[str, Any]:
    raw = _strip_code_fence(text)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if m:
            return json.loads(m.group(0))
        raise


def _client() -> genai.Client:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY não configurada no .env")
    return genai.Client(api_key=GEMINI_API_KEY)


def categorize_transactions(
    transactions: list[dict[str, Any]],
    reference_month: str,
) -> CategorizationResponse:
    """transactions: dicts with description, amount, txn_date optional."""
    prompt = categorization_prompt(transactions, reference_month)
    client = _client()
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )
    text = response.text or ""
    data = _parse_json_object(text)
    return CategorizationResponse.model_validate(data)


def apply_categories_to_transactions(
    parsed: list[tuple[str, str, float]],
    categorization: CategorizationResponse,
) -> list[tuple[str, str, float, str]]:
    """
    parsed: list of (txn_date, description, amount)
    returns rows for DB: (txn_date, description, amount, category)
    """
    by_index = {item.index: item for item in categorization.items}
    out: list[tuple[str, str, float, str]] = []
    for i, (txn_date, desc, amt) in enumerate(parsed):
        item = by_index.get(i)
        if item is None:
            # fallback: match amount + description
            item = next(
                (
                    it
                    for it in categorization.items
                    if abs(it.amount - amt) < 0.02 and it.description.strip() == desc.strip()
                ),
                None,
            )
        if item is None:
            category = "necessario"
        else:
            category = item.category
        out.append((txn_date, desc, amt, category))
    return out


def generate_consulting(analytics: dict[str, Any]) -> ConsultingResponse:
    prompt = consulting_prompt(analytics)
    client = _client()
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )
    text = response.text or ""
    data = _parse_json_object(text)
    return ConsultingResponse.model_validate(data)


def consulting_to_cache_payload(response: ConsultingResponse) -> dict[str, Any]:
    return response.model_dump()
