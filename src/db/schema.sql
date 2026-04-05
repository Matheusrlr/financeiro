-- SQLite schema: personal finance dashboard

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    bank_hint TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL REFERENCES cards(id),
    reference_month TEXT NOT NULL,
    source_filename TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    bank_detected TEXT NOT NULL,
    raw_hash TEXT,
    processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_statements_month ON statements(reference_month);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    statement_id INTEGER NOT NULL REFERENCES statements(id),
    card_id INTEGER NOT NULL REFERENCES cards(id),
    reference_month TEXT NOT NULL,
    txn_date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('necessario', 'superfluo')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_txn_month ON transactions(reference_month);
CREATE INDEX IF NOT EXISTS idx_txn_card_month ON transactions(card_id, reference_month);

CREATE TABLE IF NOT EXISTS consulting_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_month TEXT NOT NULL UNIQUE,
    payload_json TEXT NOT NULL,
    generated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
