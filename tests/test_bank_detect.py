"""Bank detection from text snippets (no PDF files)."""

from __future__ import annotations

from src.pdf.bank_detect import detect_bank_from_text


def test_detect_nubank() -> None:
    assert detect_bank_from_text("Fatura Nubank cartão") == "bank_a"
    assert detect_bank_from_text("NU PAGAMENTOS S.A.") == "bank_a"


def test_detect_inter() -> None:
    assert detect_bank_from_text("Banco Inter — fatura") == "bank_b"
    assert detect_bank_from_text("INTERMEDIUM") == "bank_b"


def test_detect_generic() -> None:
    assert detect_bank_from_text("Outro banco qualquer") == "generic"
    assert detect_bank_from_text("") == "generic"


def test_bank_a_takes_priority_over_b() -> None:
    text = "NUBANK e também INTER no texto"
    assert detect_bank_from_text(text) == "bank_a"
