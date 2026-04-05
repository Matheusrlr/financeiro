"""Identify bank / parser id from PDF content."""

from __future__ import annotations

from pathlib import Path

from src.pdf.extract import read_pdf_text_first_pages

# Keywords for two distinct layouts (tune to your real banks).
BANK_A_MARKERS = ("NU PAGAMENTOS", "NUBANK", "Nubank", "nubank")
BANK_B_MARKERS = ("INTER", "Inter", "Intermedium", "Banco Inter")


def detect_bank_from_text(text: str) -> str:
    """Classify bank from PDF snippet (first pages text). Used by tests without a file."""
    upper = text.upper()
    for m in BANK_A_MARKERS:
        if m.upper() in upper:
            return "bank_a"
    for m in BANK_B_MARKERS:
        if m.upper() in upper or m in text:
            return "bank_b"
    return "generic"


def detect_bank(pdf_path: Path) -> str:
    text = read_pdf_text_first_pages(pdf_path, max_pages=3)
    return detect_bank_from_text(text)
