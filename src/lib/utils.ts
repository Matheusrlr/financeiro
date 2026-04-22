import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function sha256Hash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7) // "YYYY-MM"
}

export function resolveCardColor(card: { bankCode: string; color: string }): string {
  const code = card.bankCode.toLowerCase()
  if (code === "inter") return "#EC811D"
  if (code === "nubank") return "#800ACE"
  return card.color
}

export function detectDocumentType(filename: string): "credit_card_statement" | "investment_statement" {
  const lower = filename.toLowerCase()
  const investmentKeywords = ["extrato", "invest", "portfolio", "xp", "btg", "warren", "genial", "modal", "clear", "rico"]
  return investmentKeywords.some((k) => lower.includes(k))
    ? "investment_statement"
    : "credit_card_statement"
}
