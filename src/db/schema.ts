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
