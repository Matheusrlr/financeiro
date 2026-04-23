"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import { detectOutliers, type AnalyticsTx } from "@/lib/analytics"
import { categoryColors, categoryLabels } from "@/components/transactions/categories"

interface OutliersCardProps {
  transactions: AnalyticsTx[]
  visible?: boolean
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-")
  return `${d}/${m}/${y.slice(2)}`
}

export function OutliersCard({ transactions, visible = true }: OutliersCardProps) {
  const outliers = detectOutliers(transactions, 2)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Gastos atípicos
        </CardTitle>
        <CardDescription>
          Transações significativamente acima da média da categoria
        </CardDescription>
      </CardHeader>
      <CardContent>
        {outliers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum gasto atípico no período. 👍
          </p>
        ) : (
          <ul className="space-y-3">
            {outliers.map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {visible ? o.description : "••••••••"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={categoryColors[o.category]}>
                      {categoryLabels[o.category]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(o.txnDate)} · {o.ratio.toFixed(1)}× a média
                    </span>
                  </div>
                </div>
                <span className="font-semibold tabular-nums whitespace-nowrap">
                  {visible ? currencyFormatter.format(o.amount) : "R$ •••"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
