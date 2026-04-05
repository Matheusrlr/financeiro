"""Unit tests for generic line parsing (no real PDFs)."""

from __future__ import annotations

from src.pdf.parsers.base import parse_generic_lines


def test_parse_generic_lines_valid_row() -> None:
    text = "15/03/2025  MERCADO EXEMPLO  123,45"
    rows = parse_generic_lines(text)
    assert len(rows) == 1
    assert rows[0].txn_date == "2025-03-15"
    assert rows[0].description == "MERCADO EXEMPLO"
    assert rows[0].amount == 123.45


def test_parse_generic_lines_thousands_separator() -> None:
    text = "01/01/2025  LOJA  1.234,56"
    rows = parse_generic_lines(text)
    assert len(rows) == 1
    assert rows[0].amount == 1234.56


def test_parse_generic_lines_skips_totals_header_lines() -> None:
    text = """15/03/2025  MERCADO OK  10,00
TOTAL DA FATURA  0,00
10/03/2025  OUTRA COISA  5,50
"""
    rows = parse_generic_lines(text)
    assert len(rows) == 2
    assert rows[0].amount == 10.0
    assert rows[1].amount == 5.5


def test_parse_generic_lines_empty() -> None:
    assert parse_generic_lines("") == []
    assert parse_generic_lines("not a txn line") == []
