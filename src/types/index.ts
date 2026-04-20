export type Category = "necessario" | "superfluo" | "investimento";

export type DocumentType = "credit_card_statement" | "investment_statement";

export type DocumentStatus = "processing" | "completed" | "error";

export type AssetType = "acao" | "fii" | "renda_fixa" | "cripto" | "outro";

export type InsightType = "monthly" | "investment";

export interface MonthlyTotals {
  total: number;
  necessario: number;
  superfluo: number;
  investimento: number;
}

export interface MonthOverMonth {
  metric: string;
  direction: "up" | "down" | "flat";
  comment: string;
}

export interface ConsultingInsight {
  summary: string;
  month_over_month: MonthOverMonth[];
  leaks: string[];
  tips: string[];
}

export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
}

export interface CategorizedTransaction extends ExtractedTransaction {
  category: Category;
}
