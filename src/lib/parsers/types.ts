export type Category = "necessario" | "superfluo" | "investimento"

export interface ParsedTransaction {
  date: string        // "YYYY-MM-DD"
  description: string
  amount: number      // positivo = despesa
  category: Category
  cardSuffix?: string // ultimos 4 digitos
}

export interface ParseResult {
  bank: "inter" | "nubank"
  referenceMonth: string // "YYYY-MM"
  transactions: ParsedTransaction[]
}
