"""Pydantic models for Gemini JSON outputs."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class CategorizationItem(BaseModel):
    index: int
    description: str
    amount: float
    category: Literal["necessario", "superfluo"]


class CategorizationResponse(BaseModel):
    reference_month: Optional[str] = None
    items: list[CategorizationItem] = Field(default_factory=list)


class MonthOverMonthItem(BaseModel):
    metric: Literal["total", "necessario", "superfluo"]
    direction: Literal["up", "down", "flat"]
    comment: str


class ConsultingResponse(BaseModel):
    summary: str
    month_over_month: list[MonthOverMonthItem] = Field(default_factory=list)
    leaks: list[str] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)
