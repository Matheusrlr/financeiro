import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  date,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

export const categoryEnum = pgEnum("category", [
  "necessario",
  "superfluo",
  "investimento",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "credit_card_statement",
  "investment_statement",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "processing",
  "completed",
  "error",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "acao",
  "fii",
  "renda_fixa",
  "cripto",
  "outro",
]);

export const insightTypeEnum = pgEnum("insight_type", [
  "monthly",
  "investment",
]);

// ── Cards ──────────────────────────────────────────────
export const cards = pgTable("cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  bankCode: text("bank_code").notNull(),
  color: text("color").default("#6366f1"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── Documents (uploaded PDFs) ──────────────────────────
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    type: documentTypeEnum("type").notNull(),
    fileName: text("file_name").notNull(),
    storagePath: text("storage_path").notNull(),
    fileHash: text("file_hash").notNull(),
    referenceMonth: text("reference_month").notNull(),
    detectedSource: text("detected_source"),
    status: documentStatusEnum("status").default("processing").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("documents_file_hash_user_idx").on(
      table.fileHash,
      table.userId
    ),
    index("documents_month_idx").on(table.referenceMonth),
  ]
);

// ── Transactions ───────────────────────────────────────
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    cardId: uuid("card_id").references(() => cards.id, {
      onDelete: "set null",
    }),
    referenceMonth: text("reference_month").notNull(),
    txnDate: date("txn_date").notNull(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    category: categoryEnum("category").notNull(),
    userOverride: boolean("user_override").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("transactions_month_idx").on(table.referenceMonth),
    index("transactions_card_month_idx").on(
      table.cardId,
      table.referenceMonth
    ),
    index("transactions_user_month_idx").on(
      table.userId,
      table.referenceMonth
    ),
  ]
);

// ── Budgets ────────────────────────────────────────────
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    category: categoryEnum("category").notNull(),
    monthlyLimit: numeric("monthly_limit", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("budgets_user_category_idx").on(table.userId, table.category)]
);

// ── User Settings ──────────────────────────────────────
export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id").primaryKey(),
  monthlyIncome: numeric("monthly_income", { precision: 12, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── Investment Accounts ────────────────────────────────
export const investmentAccounts = pgTable("investment_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  bankCode: text("bank_code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Investment Reports (monthly snapshots) ─────────────
export const investmentReports = pgTable(
  "investment_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => investmentAccounts.id, { onDelete: "cascade" }),
    referenceMonth: text("reference_month").notNull(), // "YYYY-MM"
    inceptionDate: text("inception_date"),             // "YYYY-MM-DD"
    patrimony: numeric("patrimony", { precision: 14, scale: 2 }),
    previousPatrimony: numeric("previous_patrimony", { precision: 14, scale: 2 }),
    contributions: numeric("contributions", { precision: 14, scale: 2 }),
    withdrawals: numeric("withdrawals", { precision: 14, scale: 2 }),
    financialEvents: numeric("financial_events", { precision: 14, scale: 2 }),
    gainsMonth: numeric("gains_month", { precision: 14, scale: 2 }),
    returnMonthPct: numeric("return_month_pct", { precision: 8, scale: 4 }),
    returnYearPct: numeric("return_year_pct", { precision: 8, scale: 4 }),
    returnInceptionPct: numeric("return_inception_pct", { precision: 8, scale: 4 }),
    totalContributed: numeric("total_contributed", { precision: 14, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("investment_reports_user_account_month_idx").on(
      table.userId,
      table.accountId,
      table.referenceMonth
    ),
  ]
);

// ── Investment Holdings (assets per snapshot) ──────────
export const investmentHoldings = pgTable("investment_holdings", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => investmentReports.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  strategy: text("strategy").notNull(),
  assetName: text("asset_name").notNull(),
  ticker: text("ticker"),
  previousBalance: numeric("previous_balance", { precision: 14, scale: 2 }),
  contributions: numeric("contributions", { precision: 14, scale: 2 }),
  withdrawals: numeric("withdrawals", { precision: 14, scale: 2 }),
  events: numeric("events", { precision: 14, scale: 2 }),
  balance: numeric("balance", { precision: 14, scale: 2 }),
  returnMonthPct: numeric("return_month_pct", { precision: 8, scale: 4 }),
  return12mPct: numeric("return_12m_pct", { precision: 8, scale: 4 }),
  returnInceptionPct: numeric("return_inception_pct", { precision: 8, scale: 4 }),
  sharePct: numeric("share_pct", { precision: 8, scale: 4 }),
  isTaxExempt: boolean("is_tax_exempt").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Investment Returns History ─────────────────────────
export const investmentReturnsHistory = pgTable(
  "investment_returns_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => investmentAccounts.id, { onDelete: "cascade" }),
    referenceMonth: text("reference_month").notNull(), // "YYYY-MM"
    portfolioPct: numeric("portfolio_pct", { precision: 8, scale: 4 }),
    cdiPct: numeric("cdi_pct", { precision: 8, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("investment_returns_history_user_account_month_idx").on(
      table.userId,
      table.accountId,
      table.referenceMonth
    ),
  ]
);

// ── Investment Allocation History ──────────────────────
export const investmentAllocationHistory = pgTable(
  "investment_allocation_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => investmentAccounts.id, { onDelete: "cascade" }),
    referenceMonth: text("reference_month").notNull(), // "YYYY-MM"
    strategy: text("strategy").notNull(),
    pct: numeric("pct", { precision: 8, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("investment_allocation_history_user_account_month_strategy_idx").on(
      table.userId,
      table.accountId,
      table.referenceMonth,
      table.strategy
    ),
  ]
);

// ── Investment Events (dividends, redeems, etc.) ───────
export const investmentEvents = pgTable("investment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => investmentReports.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  eventDate: date("event_date"),
  ticker: text("ticker"),
  eventType: text("event_type").notNull(), // "dividendo","jcp","rendimento","fracao","vencimento","resgate","aplicacao"
  amount: numeric("amount", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Investment Liquidity Buckets ───────────────────────
export const investmentLiquidity = pgTable("investment_liquidity", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => investmentReports.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  bucket: text("bucket").notNull(), // "0_1","2_5","6_15","16_30","31_90","91_180","more_180"
  amount: numeric("amount", { precision: 14, scale: 2 }),
  pct: numeric("pct", { precision: 8, scale: 4 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Insights Cache ─────────────────────────────────────
export const insightsCache = pgTable(
  "insights_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    referenceMonth: text("reference_month").notNull(),
    insightType: insightTypeEnum("insight_type").default("monthly").notNull(),
    content: jsonb("content").notNull(),
    modelUsed: text("model_used"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("insights_cache_user_month_type_idx").on(
      table.userId,
      table.referenceMonth,
      table.insightType
    ),
  ]
);
