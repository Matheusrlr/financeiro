"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { topMerchants } from "@/lib/analytics"

interface TopMerchantsCardProps {
  transactions: Array<{ description: string; amount: number }>
  visible?: boolean
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function TopMerchantsCard({ transactions, visible = true }: TopMerchantsCardProps) {
  const top = topMerchants(transactions, 5)
  const grandTotal = transactions.reduce((sum, t) => sum + t.amount, 0)
  const max = top[0]?.total ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 estabelecimentos</CardTitle>
        <CardDescription>Onde você mais gasta no período filtrado</CardDescription>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
        ) : (
          <ul className="space-y-3">
            {top.map((m) => {
              const pct = grandTotal === 0 ? 0 : (m.total / grandTotal) * 100
              const widthPct = max === 0 ? 0 : (m.total / max) * 100
              return (
                <li key={m.merchant} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{m.merchant}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {visible ? currencyFormatter.format(m.total) : "R$ •••"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">
                      {m.count} {m.count === 1 ? "compra" : "compras"} · {pct.toFixed(1)}%
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
