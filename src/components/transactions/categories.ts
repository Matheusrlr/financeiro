export type Category = "necessario" | "superfluo" | "investimento"

export const CATEGORIES: Category[] = ["necessario", "superfluo", "investimento"]

export const categoryLabels: Record<Category, string> = {
  necessario: "Necessário",
  superfluo: "Supérfluo",
  investimento: "Investimento",
}

export const categoryColors: Record<Category, string> = {
  necessario: "bg-emerald-100 text-emerald-800 border-emerald-200",
  superfluo: "bg-amber-100 text-amber-800 border-amber-200",
  investimento: "bg-blue-100 text-blue-800 border-blue-200",
}

export const categorySolidColors: Record<Category, string> = {
  necessario: "#10b981",
  superfluo: "#f59e0b",
  investimento: "#3b82f6",
}
