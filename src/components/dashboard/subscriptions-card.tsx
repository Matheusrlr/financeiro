"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { detectSubscriptions } from "@/lib/analytics"
import { Repeat } from "lucide-react"

interface SubscriptionsCardProps {
  transactions: Array<{ description: string; amount: number; referenceMonth: string }>
  visible?: boolean
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function SubscriptionsCard({ transactions, visible = true }: SubscriptionsCardProps) {
  const subs = detectSubscriptions(transactions)
  const monthlyTotal = subs.reduce((sum, s) => sum + s.amount, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-4 w-4" /> Assinaturas recorrentes
        </CardTitle>
        <CardDescription>
          {subs.length === 0
            ? "Nenhuma cobrança recorrente detectada ainda."
            : `Total estimado: ${visible ? currencyFormatter.format(monthlyTotal) : "R$ •••"} / mês`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cobranças são detectadas após aparecerem em 2+ meses com o mesmo valor.
          </p>
        ) : (
          <ul className="divide-y">
            {subs.map((s) => (
              <li
                key={`${s.merchant}-${s.amount}`}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate max-w-[12rem]">{s.merchant}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.monthsCount} {s.monthsCount === 1 ? "mês" : "meses"}
                  </span>
                </div>
                <span className="tabular-nums font-medium">
                  {visible ? currencyFormatter.format(s.amount) : "R$ •••"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
