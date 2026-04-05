"""SQLite persistence."""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from src.config import DB_PATH, ROOT, ensure_data_dirs


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@dataclass
class CardRow:
    id: int
    code: str
    label: str
    bank_hint: str | None


@dataclass
class StatementRow:
    id: int
    card_id: int
    reference_month: str
    source_filename: str
    stored_path: str
    bank_detected: str
    raw_hash: str | None
    processed_at: str


class Repository:
    def __init__(self, db_path: Path | None = None) -> None:
        ensure_data_dirs()
        self._db_path = db_path or DB_PATH
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _init_schema(self) -> None:
        schema_file = ROOT / "src" / "db" / "schema.sql"
        sql = schema_file.read_text(encoding="utf-8")
        with self._connect() as conn:
            conn.executescript(sql)
            self._seed_cards(conn)
            conn.commit()

    def _seed_cards(self, conn: sqlite3.Connection) -> None:
        cur = conn.execute("SELECT COUNT(*) FROM cards")
        if cur.fetchone()[0] > 0:
            return
        now = _utc_now_iso()
        conn.executemany(
            "INSERT INTO cards (code, label, bank_hint, created_at) VALUES (?, ?, ?, ?)",
            [
                ("card_a", "Cartão A", None, now),
                ("card_b", "Cartão B", None, now),
            ],
        )

    def list_cards(self) -> list[CardRow]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, code, label, bank_hint FROM cards ORDER BY id"
            ).fetchall()
        return [CardRow(r["id"], r["code"], r["label"], r["bank_hint"]) for r in rows]

    def get_card_by_code(self, code: str) -> CardRow | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT id, code, label, bank_hint FROM cards WHERE code = ?",
                (code,),
            ).fetchone()
        if row is None:
            return None
        return CardRow(row["id"], row["code"], row["label"], row["bank_hint"])

    def insert_statement(
        self,
        card_id: int,
        reference_month: str,
        source_filename: str,
        stored_path: str,
        bank_detected: str,
        raw_hash: str | None,
    ) -> int:
        processed_at = _utc_now_iso()
        with self._connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO statements (
                    card_id, reference_month, source_filename, stored_path,
                    bank_detected, raw_hash, processed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    card_id,
                    reference_month,
                    source_filename,
                    stored_path,
                    bank_detected,
                    raw_hash,
                    processed_at,
                ),
            )
            conn.commit()
            return int(cur.lastrowid)

    def insert_transactions(
        self,
        statement_id: int,
        card_id: int,
        reference_month: str,
        rows: Sequence[tuple[str, str, float, str]],
    ) -> None:
        """rows: (txn_date, description, amount, category)"""
        now = _utc_now_iso()
        with self._connect() as conn:
            conn.executemany(
                """
                INSERT INTO transactions (
                    statement_id, card_id, reference_month, txn_date,
                    description, amount, category, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        statement_id,
                        card_id,
                        reference_month,
                        txn_date,
                        desc,
                        amount,
                        cat,
                        now,
                    )
                    for txn_date, desc, amount, cat in rows
                ],
            )
            conn.commit()

    def list_reference_months(self) -> list[str]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT DISTINCT reference_month FROM transactions
                ORDER BY reference_month DESC
                """
            ).fetchall()
        return [r[0] for r in rows]

    def monthly_totals(
        self, reference_month: str | None = None
    ) -> list[dict[str, Any]]:
        """If month is None, return totals grouped by month for charts."""
        with self._connect() as conn:
            if reference_month:
                rows = conn.execute(
                    """
                    SELECT
                        reference_month,
                        SUM(amount) AS total,
                        SUM(CASE WHEN category = 'necessario' THEN amount ELSE 0 END) AS necessario,
                        SUM(CASE WHEN category = 'superfluo' THEN amount ELSE 0 END) AS superfluo
                    FROM transactions
                    WHERE reference_month = ?
                    GROUP BY reference_month
                    """,
                    (reference_month,),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT
                        reference_month,
                        SUM(amount) AS total,
                        SUM(CASE WHEN category = 'necessario' THEN amount ELSE 0 END) AS necessario,
                        SUM(CASE WHEN category = 'superfluo' THEN amount ELSE 0 END) AS superfluo
                    FROM transactions
                    GROUP BY reference_month
                    ORDER BY reference_month
                    """
                ).fetchall()
        return [
            {
                "reference_month": r["reference_month"],
                "total": float(r["total"] or 0),
                "necessario": float(r["necessario"] or 0),
                "superfluo": float(r["superfluo"] or 0),
            }
            for r in rows
        ]

    def monthly_totals_by_card(
        self, reference_month: str
    ) -> dict[str, dict[str, float]]:
        """Returns card_code -> {total, necessario, superfluo}."""
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT c.code,
                    SUM(t.amount) AS total,
                    SUM(CASE WHEN t.category = 'necessario' THEN t.amount ELSE 0 END) AS necessario,
                    SUM(CASE WHEN t.category = 'superfluo' THEN t.amount ELSE 0 END) AS superfluo
                FROM transactions t
                JOIN cards c ON c.id = t.card_id
                WHERE t.reference_month = ?
                GROUP BY c.code
                """,
                (reference_month,),
            ).fetchall()
        out: dict[str, dict[str, float]] = {}
        for r in rows:
            out[r["code"]] = {
                "total": float(r["total"] or 0),
                "necessario": float(r["necessario"] or 0),
                "superfluo": float(r["superfluo"] or 0),
            }
        return out

    def transactions_for_month(
        self,
        reference_month: str,
        card_code: str | None = None,
        category: str | None = None,
    ) -> list[dict[str, Any]]:
        q = """
            SELECT t.id, t.txn_date, t.description, t.amount, t.category,
                   c.code AS card_code, c.label AS card_label
            FROM transactions t
            JOIN cards c ON c.id = t.card_id
            WHERE t.reference_month = ?
        """
        params: list[Any] = [reference_month]
        if card_code:
            q += " AND c.code = ?"
            params.append(card_code)
        if category:
            q += " AND t.category = ?"
            params.append(category)
        q += " ORDER BY t.txn_date, t.id"
        with self._connect() as conn:
            rows = conn.execute(q, params).fetchall()
        return [dict(r) for r in rows]

    def history_monthly_summary(self, last_n: int = 12) -> list[dict[str, Any]]:
        """Aggregates for consulting (same shape as analytics needs)."""
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT reference_month,
                    SUM(amount) AS total,
                    SUM(CASE WHEN category = 'necessario' THEN amount ELSE 0 END) AS necessario,
                    SUM(CASE WHEN category = 'superfluo' THEN amount ELSE 0 END) AS superfluo
                FROM transactions
                GROUP BY reference_month
                ORDER BY reference_month DESC
                LIMIT ?
                """,
                (last_n,),
            ).fetchall()
        # return chronological ascending for prompts
        rows_list = list(reversed(rows))
        return [
            {
                "reference_month": r["reference_month"],
                "total": float(r["total"] or 0),
                "necessario": float(r["necessario"] or 0),
                "superfluo": float(r["superfluo"] or 0),
            }
            for r in rows_list
        ]

    def get_consulting_cache(self, reference_month: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT payload_json FROM consulting_cache WHERE reference_month = ?",
                (reference_month,),
            ).fetchone()
        if row is None:
            return None
        return json.loads(row["payload_json"])

    def set_consulting_cache(self, reference_month: str, payload: dict[str, Any]) -> None:
        now = _utc_now_iso()
        payload_json = json.dumps(payload, ensure_ascii=False)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO consulting_cache (reference_month, payload_json, generated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(reference_month) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    generated_at = excluded.generated_at
                """,
                (reference_month, payload_json, now),
            )
            conn.commit()

    def delete_consulting_cache(self, reference_month: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM consulting_cache WHERE reference_month = ?",
                (reference_month,),
            )
            conn.commit()

    def statement_exists_with_hash(self, raw_hash: str) -> bool:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM statements WHERE raw_hash = ? LIMIT 1",
                (raw_hash,),
            ).fetchone()
        return row is not None


_repo: Repository | None = None


def get_repository() -> Repository:
    global _repo
    if _repo is None:
        _repo = Repository()
    return _repo
