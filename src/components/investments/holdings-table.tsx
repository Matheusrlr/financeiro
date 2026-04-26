"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight } from "lucide-react"

interface Holding {
  id: string
  strategy: string
  assetName: string
  ticker: string | null
  balance: string | null
  returnMonthPct: string | null
  return12mPct: string | null
  returnInceptionPct: string | null
  sharePct: string | null
  isTaxExempt: boolean
}

interface HoldingsTableProps {
  holdings: Holding[]
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 })
const pct = (v: string | null) => v ? `${parseFloat(v).toFixed(2)}%` : "—"
const money = (v: string | null) => v ? brl.format(parseFloat(v)) : "—"

function pctColor(v: string | null) {
  if (!v) return ""
  const n = parseFloat(v)
  if (n > 0) return "text-emerald-600"
  if (n < 0) return "text-rose-600"
  return ""
}

type SortKey = "balance" | "returnMonthPct" | "return12mPct" | "returnInceptionPct" | "sharePct"

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>("balance")
  const [sortAsc, setSortAsc] = useState(false)

  function toggleStrategy(s: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  // Group by strategy
  const strategies = Array.from(new Set(holdings.map((h) => h.strategy)))
  const grouped = Object.fromEntries(
    strategies.map((s) => [
      s,
      [...holdings.filter((h) => h.strategy === s)].sort((a, b) => {
        const av = parseFloat(a[sortKey] ?? "0")
        const bv = parseFloat(b[sortKey] ?? "0")
        return sortAsc ? av - bv : bv - av
      }),
    ])
  )

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k
    return (
      <th
        className={`px-3 py-2 text-right text-xs font-medium cursor-pointer select-none whitespace-nowrap ${active ? "text-foreground" : "text-muted-foreground"}`}
        onClick={() => handleSort(k)}
      >
        {label} {active ? (sortAsc ? "↑" : "↓") : ""}
      </th>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Ativo</th>
            <SortHeader label="Saldo" k="balance" />
            <SortHeader label="Mês %" k="returnMonthPct" />
            <SortHeader label="12m %" k="return12mPct" />
            <SortHeader label="Início %" k="returnInceptionPct" />
            <SortHeader label="Part. %" k="sharePct" />
          </tr>
        </thead>
        <tbody>
          {strategies.map((strategy) => {
            const rows = grouped[strategy]
            const stratTotal = rows.reduce((s, h) => s + parseFloat(h.balance ?? "0"), 0)
            const isCollapsed = collapsed.has(strategy)
            return (
              <>
                <tr
                  key={`strategy-${strategy}`}
                  className="border-b bg-muted/30 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleStrategy(strategy)}
                >
                  <td className="px-3 py-2 font-semibold text-xs flex items-center gap-1">
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {strategy}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-medium">{brl.format(stratTotal)}</td>
                  <td colSpan={4} />
                </tr>
                {!isCollapsed && rows.map((h) => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{h.ticker ?? h.assetName}</span>
                        {h.ticker && h.assetName !== h.ticker && (
                          <span className="text-xs text-muted-foreground truncate max-w-40">{h.assetName}</span>
                        )}
                        {h.isTaxExempt && <Badge variant="secondary" className="text-xs px-1 py-0">Isento</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(h.balance)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${pctColor(h.returnMonthPct)}`}>{pct(h.returnMonthPct)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${pctColor(h.return12mPct)}`}>{pct(h.return12mPct)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${pctColor(h.returnInceptionPct)}`}>{pct(h.returnInceptionPct)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct(h.sharePct)}</td>
                  </tr>
                ))}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
