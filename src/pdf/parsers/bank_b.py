"""Parser for Inter (bank_b): same heuristics as generic until layout-specific rules exist."""

from __future__ import annotations

from pathlib import Path

from src.pdf.parsers.base import ParsedTxn, parse_pdf_generic


def parse_bank_b(pdf_path: Path) -> list[ParsedTxn]:
    # Inter faturas often match DD/MM/AAAA + valor BR on full text; add crops/regex here if needed.
    return parse_pdf_generic(pdf_path)
