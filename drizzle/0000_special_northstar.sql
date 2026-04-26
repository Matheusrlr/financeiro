CREATE TYPE "public"."asset_type" AS ENUM('acao', 'fii', 'renda_fixa', 'cripto', 'outro');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('necessario', 'superfluo', 'investimento');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('processing', 'completed', 'error');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('credit_card_statement', 'investment_statement');--> statement-breakpoint
CREATE TYPE "public"."insight_type" AS ENUM('monthly', 'investment');--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "category" NOT NULL,
	"monthly_limit" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"bank_code" text NOT NULL,
	"color" text DEFAULT '#6366f1',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"file_name" text NOT NULL,
	"storage_path" text NOT NULL,
	"file_hash" text NOT NULL,
	"reference_month" text NOT NULL,
	"detected_source" text,
	"status" "document_status" DEFAULT 'processing' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insights_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reference_month" text NOT NULL,
	"insight_type" "insight_type" DEFAULT 'monthly' NOT NULL,
	"content" jsonb NOT NULL,
	"model_used" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"bank_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_allocation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"reference_month" text NOT NULL,
	"strategy" text NOT NULL,
	"pct" numeric(8, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event_date" date,
	"ticker" text,
	"event_type" text NOT NULL,
	"amount" numeric(14, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"strategy" text NOT NULL,
	"asset_name" text NOT NULL,
	"ticker" text,
	"previous_balance" numeric(14, 2),
	"contributions" numeric(14, 2),
	"withdrawals" numeric(14, 2),
	"events" numeric(14, 2),
	"balance" numeric(14, 2),
	"return_month_pct" numeric(8, 4),
	"return_12m_pct" numeric(8, 4),
	"return_inception_pct" numeric(8, 4),
	"share_pct" numeric(8, 4),
	"is_tax_exempt" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_liquidity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"bucket" text NOT NULL,
	"amount" numeric(14, 2),
	"pct" numeric(8, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"reference_month" text NOT NULL,
	"inception_date" text,
	"patrimony" numeric(14, 2),
	"previous_patrimony" numeric(14, 2),
	"contributions" numeric(14, 2),
	"withdrawals" numeric(14, 2),
	"financial_events" numeric(14, 2),
	"gains_month" numeric(14, 2),
	"return_month_pct" numeric(8, 4),
	"return_year_pct" numeric(8, 4),
	"return_inception_pct" numeric(8, 4),
	"total_contributed" numeric(14, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_returns_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"reference_month" text NOT NULL,
	"portfolio_pct" numeric(8, 4),
	"cdi_pct" numeric(8, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"card_id" uuid,
	"reference_month" text NOT NULL,
	"txn_date" date NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category" "category" NOT NULL,
	"user_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"monthly_income" numeric(12, 2),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investment_allocation_history" ADD CONSTRAINT "investment_allocation_history_account_id_investment_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."investment_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_events" ADD CONSTRAINT "investment_events_report_id_investment_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."investment_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_holdings" ADD CONSTRAINT "investment_holdings_report_id_investment_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."investment_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_liquidity" ADD CONSTRAINT "investment_liquidity_report_id_investment_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."investment_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_reports" ADD CONSTRAINT "investment_reports_account_id_investment_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."investment_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_returns_history" ADD CONSTRAINT "investment_returns_history_account_id_investment_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."investment_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_user_category_idx" ON "budgets" USING btree ("user_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_file_hash_user_idx" ON "documents" USING btree ("file_hash","user_id");--> statement-breakpoint
CREATE INDEX "documents_month_idx" ON "documents" USING btree ("reference_month");--> statement-breakpoint
CREATE UNIQUE INDEX "insights_cache_user_month_type_idx" ON "insights_cache" USING btree ("user_id","reference_month","insight_type");--> statement-breakpoint
CREATE UNIQUE INDEX "investment_allocation_history_user_account_month_strategy_idx" ON "investment_allocation_history" USING btree ("user_id","account_id","reference_month","strategy");--> statement-breakpoint
CREATE UNIQUE INDEX "investment_reports_user_account_month_idx" ON "investment_reports" USING btree ("user_id","account_id","reference_month");--> statement-breakpoint
CREATE UNIQUE INDEX "investment_returns_history_user_account_month_idx" ON "investment_returns_history" USING btree ("user_id","account_id","reference_month");--> statement-breakpoint
CREATE INDEX "transactions_month_idx" ON "transactions" USING btree ("reference_month");--> statement-breakpoint
CREATE INDEX "transactions_card_month_idx" ON "transactions" USING btree ("card_id","reference_month");--> statement-breakpoint
CREATE INDEX "transactions_user_month_idx" ON "transactions" USING btree ("user_id","reference_month");