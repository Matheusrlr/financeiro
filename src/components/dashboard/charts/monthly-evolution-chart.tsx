"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { monthLabel } from "@/lib/analytics"

interface MonthlyEvolutionChartProps {
  data: Array<{ month: string; total: number }>
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

type EnrichedEntry = {
  month: string
  rawMonth: string
  total: number
  prevTotal: number | null
  variationPct: number | null
  variationAbs: number | null
}

interface TooltipPayload {
  payload: EnrichedEntry
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayload[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const entry = payload[0].payload
  const variationColor =
    entry.variationPct === null
      ? "text-muted-foreground"
      : entry.variationPct > 0
        ? "text-rose-600"
        : entry.variationPct < 0
          ? "text-emerald-600"
          : "text-muted-foreground"
  const sign = (n: number) => (n > 0 ? "+" : "")

  return (
    <div className="rounded-md border bg-background p-3 shadow-sm text-sm">
      <p className="font-medium capitalize mb-1">
        {monthLabel(entry.rawMonth, { long: true })}
      </p>
      <p className="text-base font-semibold">
        {currencyFormatter.format(entry.total)}
      </p>
      {entry.variationPct !== null && entry.variationAbs !== null && entry.prevTotal !== null ? (
        <>
          <p className={`mt-1 font-medium ${variationColor}`}>
            {sign(entry.variationPct)}
            {entry.variationPct.toFixed(1)}% vs mês anterior
          </p>
          <p className="text-xs text-muted-foreground">
            {sign(entry.variationAbs)}
            {currencyFormatter.format(entry.variationAbs)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Mês anterior: {currencyFormatter.format(entry.prevTotal)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Sem mês anterior para comparar</p>
      )}
    </div>
  )
}

export function MonthlyEvolutionChart({ data }: MonthlyEvolutionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        Sem dados para exibir
      </div>
    )
  }

  const enriched: EnrichedEntry[] = data.map((d, i) => {
    const prev = i > 0 ? data[i - 1].total : null
    const variationAbs = prev === null ? null : d.total - prev
    const variationPct =
      prev === null || prev === 0 ? null : ((d.total - prev) / prev) * 100
    return {
      month: monthLabel(d.month, { long: true }),
      rawMonth: d.month,
      total: d.total,
      prevTotal: prev,
      variationPct,
      variationAbs,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={enriched} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => String(v).replace(/ de /, "/")}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => currencyFormatter.format(v)}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
        <Bar dataKey="total" name="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
