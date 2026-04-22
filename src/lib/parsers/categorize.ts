import type { Category } from "./types"

const SUPERFLUO_KEYWORDS = [
  "IFOOD", "IFD", "UBER", "RAPPI", "YOUTUBE", "APPLE", "DISCORD",
  "SPOTIFY", "NETFLIX", "AMAZON", "AIRBNB", "RESTAURANTE", "HAMBURGUERIA",
  "CHURRASC", "BURGUER", "PADOCA", "DECATHLON", "LOTERIA", "LINKEDIN",
  "GYMPASS", "WELLHUB", "PAYPAL", "NUVIAGENS",
]

const NECESSARIO_KEYWORDS = [
  "SUPERMERCADO", "COMERCIAL", "FARMACIA", "ARAUJO", "POSTO", "SEGURO",
  "MAPFRE", "PRUDENTIAL", "FIBER", "VIVOEASY", "VIACAOPASSARO", "EXPRESSO",
  "DISTRIBUIDOR",
]

export function categorize(description: string): Category {
  const upper = description.toUpperCase()

  for (const kw of SUPERFLUO_KEYWORDS) {
    if (upper.includes(kw)) return "superfluo"
  }

  for (const kw of NECESSARIO_KEYWORDS) {
    if (upper.includes(kw)) return "necessario"
  }

  return "necessario"
}
