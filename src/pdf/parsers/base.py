"""Shared parsing utilities for invoice lines."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from src.pdf.extract import read_pdf_full_text


@dataclass
class ParsedTxn:
    txn_date: str  # YYYY-MM-DD
    description: str
    amount: float


# DD/MM/YYYY followed by description and Brazilian amount at end of line
_LINE_RE = re.compile(
    r"^(?P<d>\d{2}/\d{2}/\d{4})\s+(?P<desc>.+?)\s+(?P<amt>\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*$"
)

_SKIP_SUBSTR = (
    "TOTAL",
    "SUBTOTAL",
    "SALDO",
    "IOF",
    "JUROS",
    "ANUIDADE",
    "PAGAMENTO",
    "CREDITO",
    "CRÉDITO",
    "ENCARGOS",
    "LIMITE",
    "FATURA",
    "VENCIMENTO",
    "MULTA",
)


def _br_to_float(s: str) -> float:
    s = s.strip().replace(".", "").replace(",", ".")
    return float(s)


def _parse_date_br(d: str) -> str:
    day, month, year = d.split("/")
    return f"{year}-{month}-{day}"


def parse_generic_lines(text: str) -> list[ParsedTxn]:
    """Heuristic: each line looks like DD/MM/YYYY ... 1.234,56"""
    out: list[ParsedTxn] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        u = line.upper()
        if any(sk in u for sk in _SKIP_SUBSTR):
            continue
        m = _LINE_RE.match(line)
        if not m:
            continue
        desc = m.group("desc").strip()
        if len(desc) < 3:
            continue
        try:
            amt = abs(_br_to_float(m.group("amt")))
        except ValueError:
            continue
        if amt <= 0:
            continue
        txn_date = _parse_date_br(m.group("d"))
        out.append(ParsedTxn(txn_date=txn_date, description=desc, amount=amt))
    return out


def parse_pdf_generic(pdf_path: Path) -> list[ParsedTxn]:
    text = read_pdf_full_text(pdf_path)
    return parse_generic_lines(text)
