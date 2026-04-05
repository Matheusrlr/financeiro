"""Parser tuned for layout similar to Nubank (bank_a)."""

from __future__ import annotations

from pathlib import Path

import pdfplumber

from src.pdf.parsers.base import ParsedTxn, parse_generic_lines, parse_pdf_generic


def _from_tables(pdf_path: Path) -> list[ParsedTxn]:
    rows: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables() or []
            for table in tables:
                for row in table:
                    if not row:
                        continue
                    cells = [str(c).strip() if c else "" for c in row]
                    line = " ".join(c for c in cells if c)
                    if line:
                        rows.append(line)
    return parse_generic_lines("\n".join(rows))


def parse_bank_a(pdf_path: Path) -> list[ParsedTxn]:
    table_txns = _from_tables(pdf_path)
    if len(table_txns) >= 3:
        return table_txns
    return parse_pdf_generic(pdf_path)
