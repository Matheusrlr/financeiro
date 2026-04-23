"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { spendByWeekday } from "@/lib/analytics"

interface WeekdayChartProps {
  transactions: Array<{ amount: number; txnDate: string }>
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function WeekdayChart({ transactions }: WeekdayChartProps) {
  const data = spendByWeekday(transactions)
  const hasData = data.some((d) => d.total > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por dia da semana</CardTitle>
        <CardDescription>Qual dia pesa mais no bolso</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => currencyFormatter.format(v)}
                width={80}
              />
              <Tooltip
                formatter={(v) =>
                  typeof v === "number" ? currencyFormatter.format(v) : String(v)
                }
                cursor={{ fill: "rgba(99,102,241,0.08)" }}
              />
              <Bar dataKey="total" name="Total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
