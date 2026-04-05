"""Orchestrate PDF parsing, AI categorization, and persistence."""

from __future__ import annotations

import hashlib
import shutil
import uuid
from pathlib import Path

from src.ai.client import apply_categories_to_transactions, categorize_transactions
from src.config import ROOT, UPLOADS_DIR
from src.db.repository import get_repository
from src.pdf.bank_detect import detect_bank
from src.pdf.parsers.bank_a import parse_bank_a
from src.pdf.parsers.bank_b import parse_bank_b
from src.pdf.parsers.base import ParsedTxn, parse_pdf_generic


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_statement_pdf(pdf_path: Path) -> tuple[str, list[ParsedTxn]]:
    bank = detect_bank(pdf_path)
    if bank == "bank_a":
        txns = parse_bank_a(pdf_path)
    elif bank == "bank_b":
        txns = parse_bank_b(pdf_path)
    else:
        txns = parse_pdf_generic(pdf_path)
    return bank, txns


def store_uploaded_pdf(uploaded_file_bytes: bytes, original_name: str) -> Path:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}.pdf"
    dest = UPLOADS_DIR / safe_name
    dest.write_bytes(uploaded_file_bytes)
    return dest


def copy_path_to_uploads(pdf_path: Path) -> Path:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOADS_DIR / f"{uuid.uuid4().hex}.pdf"
    shutil.copy2(pdf_path, dest)
    return dest


def process_upload(
    uploaded_bytes: bytes,
    original_filename: str,
    card_code: str,
    reference_month: str,
    *,
    reject_duplicate: bool = True,
) -> tuple[int, str, int]:
    """
    Parse PDF, categorize with Gemini, persist statement + transactions.

    Returns (statement_id, bank_detected, transaction_count).
    """
    repo = get_repository()
    card = repo.get_card_by_code(card_code)
    if card is None:
        raise ValueError(f"Cartão desconhecido: {card_code}")

    dest = store_uploaded_pdf(uploaded_bytes, original_filename)
    raw_hash = file_sha256(dest)
    if reject_duplicate and repo.statement_exists_with_hash(raw_hash):
        dest.unlink(missing_ok=True)
        raise ValueError(
            "Este PDF já foi processado anteriormente (mesmo hash). "
            "Envie outro arquivo ou desative a verificação."
        )

    bank, txns = parse_statement_pdf(dest)
    if not txns:
        raise ValueError(
            "Nenhuma transação extraída do PDF. Verifique o layout ou ajuste os parsers."
        )

    for_prompt = [{"description": t.description, "amount": t.amount} for t in txns]
    cat = categorize_transactions(for_prompt, reference_month)

    parsed_tuples = [(t.txn_date, t.description, t.amount) for t in txns]
    rows = apply_categories_to_transactions(parsed_tuples, cat)

    stored_path = str(dest.relative_to(ROOT))

    sid = repo.insert_statement(
        card_id=card.id,
        reference_month=reference_month,
        source_filename=original_filename,
        stored_path=stored_path,
        bank_detected=bank,
        raw_hash=raw_hash,
    )
    repo.insert_transactions(sid, card.id, reference_month, rows)
    repo.delete_consulting_cache(reference_month)
    return sid, bank, len(rows)
