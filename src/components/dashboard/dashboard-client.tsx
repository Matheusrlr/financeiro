"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts"
import {
  Filter, ChevronDown, X, Upload, ArrowUp, ArrowDown,
  TrendingUp, AlertTriangle,
} from "lucide-react"
import { currentReferenceMonth, projectMonthEnd, topMerchants, detectSubscriptions, detectOutliers, monthLabel } from "@/lib/analytics"
import type { Category } from "@/components/transactions/categories"

export interface CardItem {
  id: string
  name: string
  bankCode: string
  color: string
  createdAt: string
}

export interface TransactionItem {
  id: string
  cardId: string | undefined
  amount: number
  category: Category
  referenceMonth: string
  description: string
  txnDate: string
}

interface DashboardClientProps {
  cards: CardItem[]
  transactions: TransactionItem[]
  budgets: Array<{ category: Category; monthlyLimit: number }>
  monthlyIncome: number | null
}

const CAT_COLORS = {
  necessario: "#23d619",
  superfluo:  "#f72743",
  investimento: "#407BB1",
} as const

const CAT_LABELS = {
  necessario: "Necessário",
  superfluo: "Supérfluo",
  investimento: "Investimento",
} as const

const brl = (n: number, compact = false) => {
  if (compact && Math.abs(n) >= 1000) {
    const abs = Math.abs(n)
    const sign = n < 0 ? "-" : ""
    if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(2)}M`
    if (abs >= 10_000) return `${sign}R$ ${(abs / 1000).toFixed(1)}k`
    if (abs >= 1_000) return `${sign}R$ ${(abs / 1000).toFixed(2)}k`
  }
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, delta, accent, onClick, big = false,
}: {
  label: string
  value: string
  sub?: string
  delta?: number | null
  accent?: string
  onClick?: () => void
  big?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-card rounded-lg border p-4 transition-all"
      style={{
        cursor: onClick ? "pointer" : "default",
        borderColor: hovered ? "hsl(var(--border)/80%)" : "var(--border, hsl(var(--border)))",
        boxShadow: hovered ? "0 2px 12px -4px rgba(0,0,0,0.1)" : "none",
      }}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-[11px] font-medium text-muted-foreground tracking-tight">{label}</span>
        {accent && (
          <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: accent }} />
        )}
      </div>
      <div
        className="num font-semibold tracking-tight leading-none mt-1.5"
        style={{
          fontSize: big ? 22 : 18,
          fontFamily: "var(--font-inter-tight, var(--font-geist-sans))",
        }}
      >
        {value}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {delta != null && <DeltaChip value={delta} />}
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  )
}

// ─── Delta Chip ───────────────────────────────────────────────────────────────
function DeltaChip({ value }: { value: number }) {
  const up = value >= 0
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[11px] font-semibold num"
      style={{ color: up ? "var(--cat-necessario, #23d619)" : "var(--cat-superfluo, #f72743)" }}
    >
      {up ? <ArrowUp size={9} strokeWidth={2.5} /> : <ArrowDown size={9} strokeWidth={2.5} />}
      {up ? "+" : ""}{value.toFixed(1)}%
    </span>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function Section({
  title, subtitle, right, children, noPadding = false,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
  noPadding?: boolean
}) {
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="flex items-end justify-between px-4 py-3 border-b">
        <div>
          <p className="text-[13px] font-semibold tracking-tight">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className={noPadding ? "" : "p-4"}>{children}</div>
    </div>
  )
}

// ─── Month Filter ─────────────────────────────────────────────────────────────
function MonthFilter({
  months, value, onChange,
}: {
  months: string[]
  value: string
  onChange: (m: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-md border bg-card text-[12px] font-medium transition-colors hover:bg-muted/60"
      >
        <Filter size={12} strokeWidth={1.8} />
        {monthLabel(value)}
        <ChevronDown size={11} strokeWidth={2} className="opacity-60" />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 z-30 bg-card border rounded-lg shadow-lg p-1 min-w-[140px]">
          {months.map(m => (
            <button
              key={m}
              onClick={() => { onChange(m); setOpen(false) }}
              className="w-full flex items-center justify-between gap-4 px-3 py-1.5 rounded-md text-[12px] font-medium hover:bg-muted/60 transition-colors"
              style={{ background: m === value ? "var(--muted)" : "transparent" }}
            >
              {monthLabel(m)}
              {m === value && <span className="text-foreground">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Card Filter ──────────────────────────────────────────────────────────────
function CardFilter({
  cards, value, onChange,
}: {
  cards: CardItem[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const options = [{ id: "all", name: "Todos os cartões", color: "var(--foreground)" }, ...cards]
  const selected = options.find(o => o.id === value) ?? options[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-3 py-[5px] rounded-md border bg-card text-[12px] font-medium transition-colors hover:bg-muted/60"
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: selected.color }} />
        {selected.name}
        <ChevronDown size={11} strokeWidth={2} className="opacity-60" />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 z-30 bg-card border rounded-lg shadow-lg p-1 min-w-[190px]">
          {options.map(o => (
            <button
              key={o.id}
              onClick={() => { onChange(o.id); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium hover:bg-muted/60 transition-colors text-left"
              style={{ background: o.id === value ? "var(--muted)" : "transparent" }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.color }} />
              <span className="flex-1">{o.name}</span>
              {o.id === value && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Drill-down Sheet ─────────────────────────────────────────────────────────
function DrillSheet({
  open, onClose, title, children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.18)", animation: "fadeIn 120ms ease" }}
      onClick={onClose}
    >
      <div
        className="w-[380px] h-full bg-card border-l shadow-2xl overflow-auto"
        style={{ animation: "slideInRight 200ms ease" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-card z-10">
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Custom tooltip for charts ────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className="bg-card border rounded-lg p-2.5 shadow-lg text-[11px] min-w-[150px]">
      {label && <p className="text-muted-foreground mb-2 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
            <span className="capitalize">{p.name}</span>
          </span>
          <span className="num font-semibold">{brl(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="flex justify-between mt-1.5 pt-1.5 border-t font-semibold">
          <span className="text-muted-foreground">total</span>
          <span className="num">{brl(total)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function DashboardClient({
  cards, transactions, budgets, monthlyIncome,
}: DashboardClientProps) {
  const router = useRouter()

  // Filters
  const availableMonths = useMemo(
    () => Array.from(new Set(transactions.map(t => t.referenceMonth))).sort(),
    [transactions]
  )
  const currentMonth = useMemo(() => currentReferenceMonth(new Date()), [])
  const defaultMonth = availableMonths.includes(currentMonth)
    ? currentMonth
    : availableMonths[availableMonths.length - 1] ?? currentMonth

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [selectedCardId, setSelectedCardId] = useState("all")
  const [drill, setDrill] = useState<string | null>(null)

  // Current month transactions (for KPIs)
  const currentMonthTxs = useMemo(
    () => transactions.filter(t =>
      t.referenceMonth === selectedMonth &&
      (selectedCardId === "all" || t.cardId === selectedCardId)
    ),
    [transactions, selectedMonth, selectedCardId]
  )

  // Previous month
  const prevMonth = useMemo(() => {
    const idx = availableMonths.indexOf(selectedMonth)
    return idx > 0 ? availableMonths[idx - 1] : null
  }, [availableMonths, selectedMonth])

  const prevMonthTxs = useMemo(
    () => prevMonth
      ? transactions.filter(t =>
          t.referenceMonth === prevMonth &&
          (selectedCardId === "all" || t.cardId === selectedCardId)
        )
      : [],
    [transactions, prevMonth, selectedCardId]
  )

  // Aggregates for selected month
  const necessario = currentMonthTxs.filter(t => t.category === "necessario").reduce((s, t) => s + t.amount, 0)
  const superfluo = currentMonthTxs.filter(t => t.category === "superfluo").reduce((s, t) => s + t.amount, 0)
  const investimento = currentMonthTxs.filter(t => t.category === "investimento").reduce((s, t) => s + t.amount, 0)
  const total = necessario + superfluo + investimento
  const txCount = currentMonthTxs.length

  const prevTotal = prevMonthTxs.reduce((s, t) => s + t.amount, 0)
  const prevNec = prevMonthTxs.filter(t => t.category === "necessario").reduce((s, t) => s + t.amount, 0)
  const prevSup = prevMonthTxs.filter(t => t.category === "superfluo").reduce((s, t) => s + t.amount, 0)

  const deltaTotal = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null
  const deltaNec = prevNec > 0 ? ((necessario - prevNec) / prevNec) * 100 : null
  const deltaSup = prevSup > 0 ? ((superfluo - prevSup) / prevSup) * 100 : null

  const incomeUsedPct = monthlyIncome && monthlyIncome > 0 ? (total / monthlyIncome) * 100 : null
  const avgTicket = txCount > 0 ? total / txCount : 0

  // Month end projection
  const today = new Date()
  const isCurrentMonth = selectedMonth === currentReferenceMonth(today)
  const projection = isCurrentMonth ? projectMonthEnd(total, today) : null

  // Monthly evolution data (all months with card filter)
  const evolutionData = useMemo(() => {
    return availableMonths.map(m => {
      const mTxs = transactions.filter(t =>
        t.referenceMonth === m &&
        (selectedCardId === "all" || t.cardId === selectedCardId)
      )
      return {
        month: monthLabel(m),
        necessario: mTxs.filter(t => t.category === "necessario").reduce((s, t) => s + t.amount, 0),
        superfluo: mTxs.filter(t => t.category === "superfluo").reduce((s, t) => s + t.amount, 0),
        investimento: mTxs.filter(t => t.category === "investimento").reduce((s, t) => s + t.amount, 0),
      }
    })
  }, [transactions, availableMonths, selectedCardId])

  // Donut data
  const donutData = [
    { name: "Necessário", value: necessario, color: CAT_COLORS.necessario },
    { name: "Supérfluo", value: superfluo, color: CAT_COLORS.superfluo },
    { name: "Investimento", value: investimento, color: CAT_COLORS.investimento },
  ].filter(d => d.value > 0)

  // Top merchants, subscriptions, outliers
  const merchants = useMemo(() => topMerchants(currentMonthTxs, 6), [currentMonthTxs])
  const subs = useMemo(() => detectSubscriptions(transactions), [transactions])
  const outliers = useMemo(() => detectOutliers(currentMonthTxs, 2), [currentMonthTxs])

  // Budget progress
  const budgetMap = useMemo(() => {
    const m = new Map<Category, number>()
    for (const b of budgets) m.set(b.category, b.monthlyLimit)
    return m
  }, [budgets])

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "var(--font-inter-tight, var(--font-geist-sans))" }}
    >
      {/* ── AppBar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-background sticky top-0 z-20">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {monthLabel(selectedMonth, { long: true })} · visão consolidada
          </p>
        </div>
        <div className="flex items-center gap-2">
          {availableMonths.length > 0 && (
            <MonthFilter
              months={availableMonths}
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
          )}
          <CardFilter cards={cards} value={selectedCardId} onChange={setSelectedCardId} />
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-md bg-foreground text-background text-[12px] font-semibold hover:opacity-90 transition-opacity"
          >
            <Upload size={12} strokeWidth={2.2} />
            Upload
          </Link>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-4 overflow-auto">

        {/* ── KPI Strip (big 4) ────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          <KpiCard
            big
            label="Gasto do mês"
            value={brl(total)}
            sub={incomeUsedPct != null ? `${incomeUsedPct.toFixed(0)}% da renda` : projection ? `Proj. ${brl(projection.projected, true)}` : `${txCount} transações`}
            delta={deltaTotal}
            onClick={() => setDrill("gasto")}
          />
          <KpiCard
            big
            label="Necessário"
            value={brl(necessario, true)}
            sub="essenciais"
            accent={CAT_COLORS.necessario}
            delta={deltaNec}
            onClick={() => setDrill("necessario")}
          />
          <KpiCard
            big
            label="Supérfluo"
            value={brl(superfluo, true)}
            sub="não essenciais"
            accent={CAT_COLORS.superfluo}
            delta={deltaSup}
            onClick={() => setDrill("superfluo")}
          />
          <KpiCard
            big
            label="Investimento"
            value={brl(investimento, true)}
            sub={`${budgetMap.has("investimento") ? ((investimento / (budgetMap.get("investimento")!)) * 100).toFixed(0) + "% da meta" : `${txCount > 0 ? "aportes" : "—"}`}`}
            accent={CAT_COLORS.investimento}
            onClick={() => setDrill("investimento")}
          />
        </div>

        {/* ── Charts Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-[1.65fr_1fr] gap-3">
          <Section
            title="Evolução por categoria"
            subtitle={`últimos ${availableMonths.length} meses`}
            right={
              <div className="flex gap-3 text-[11px]">
                {Object.entries(CAT_LABELS).map(([key, label]) => (
                  <span key={key} className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2 h-2 rounded-[2px]" style={{ background: CAT_COLORS[key as Category] }} />
                    {label}
                  </span>
                ))}
              </div>
            }
          >
            {evolutionData.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={evolutionData} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-jetbrains-mono, monospace)" }} tickFormatter={v => brl(v, true)} width={58} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="necessario" name="Necessário" stackId="a" fill={CAT_COLORS.necessario} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="superfluo" name="Supérfluo" stackId="a" fill={CAT_COLORS.superfluo} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="investimento" name="Investimento" stackId="a" fill={CAT_COLORS.investimento} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Section>

          <Section
            title="Distribuição"
            subtitle={monthLabel(selectedMonth, { long: true })}
          >
            {donutData.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" cx="50%" cy="50%"
                      innerRadius={46} outerRadius={70} strokeWidth={2} stroke="var(--card)">
                      {donutData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => typeof v === "number" ? brl(v) : String(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-2">
                  {[
                    { label: "Necessário", value: necessario, color: CAT_COLORS.necessario },
                    { label: "Supérfluo", value: superfluo, color: CAT_COLORS.superfluo },
                    { label: "Investimento", value: investimento, color: CAT_COLORS.investimento },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="w-2 h-2 rounded-[2px]" style={{ background: color }} />
                        {label}
                      </span>
                      <span className="num font-semibold">{brl(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* ── Secondary KPI row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          <KpiCard
            label="Ticket médio"
            value={avgTicket > 0 ? brl(avgTicket) : "—"}
            sub={txCount > 0 ? `${txCount} transações` : "sem dados"}
          />
          <KpiCard
            label="Média diária"
            value={(() => {
              if (!isCurrentMonth || total === 0) return "—"
              const days = today.getDate()
              return brl(total / Math.max(days, 1))
            })()}
            sub={isCurrentMonth ? `${today.getDate()} dias no mês` : "mês passado"}
          />
          <KpiCard
            label="Projeção fim do mês"
            value={projection ? brl(projection.projected, true) : "—"}
            sub={projection ? `${projection.elapsed}/${projection.total} dias` : "mês encerrado"}
          />
          <KpiCard
            label="% da renda comprometida"
            value={incomeUsedPct != null ? `${incomeUsedPct.toFixed(1)}%` : "—"}
            sub={monthlyIncome ? `de ${brl(monthlyIncome, true)}` : undefined}
          />
        </div>

        {/* ── Trend line: gasto vs investimento ───────────────────────────── */}
        {evolutionData.length > 1 && (
          <Section
            title="Tendência — gasto vs investimento"
            subtitle="por mês disponível"
            right={
              <div className="flex gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-3.5 h-0.5 bg-foreground rounded-full" />Gasto
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-3.5 h-0.5 rounded-full" style={{ background: CAT_COLORS.investimento }} />Investimento
                </span>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={evolutionData.map(d => ({
                ...d,
                gasto: d.necessario + d.superfluo,
              }))}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-jetbrains-mono, monospace)" }} tickFormatter={v => brl(v, true)} width={58} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v, name) => [typeof v === "number" ? brl(v) : String(v), name === "gasto" ? "Gasto" : "Investimento"]}
                  labelClassName="text-muted-foreground text-[11px] mb-1"
                />
                <Line dataKey="gasto" name="Gasto" stroke="var(--foreground)" strokeWidth={1.8} dot={false} activeDot={{ r: 4 }} />
                <Line dataKey="investimento" name="Investimento" stroke={CAT_COLORS.investimento} strokeWidth={1.8} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* ── Top merchants + Outliers ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Section title="Top estabelecimentos" subtitle={`${monthLabel(selectedMonth)} · por valor`}>
            {merchants.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {merchants.map((m, i) => {
                  const maxVal = merchants[0].total
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium truncate">{m.merchant}</span>
                        <span className="num text-muted-foreground shrink-0 ml-2">{brl(m.total)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(m.total / maxVal) * 100}%`, background: "var(--foreground)" }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 w-20 text-right">
                          {m.count} {m.count === 1 ? "compra" : "compras"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          <Section
            title="Gastos atípicos"
            subtitle="transações acima da média da categoria"
            right={outliers.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-amber-500">
                <AlertTriangle size={12} />
                {outliers.length}
              </span>
            )}
          >
            {outliers.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nenhum gasto atípico. 👍</p>
            ) : (
              <div className="space-y-3">
                {outliers.map((o, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 text-[12px]">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{o.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            background: CAT_COLORS[o.category] + "22",
                            color: CAT_COLORS[o.category],
                          }}
                        >
                          {CAT_LABELS[o.category]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{o.ratio.toFixed(1)}× a média</span>
                      </div>
                    </div>
                    <span className="num font-semibold shrink-0">{brl(o.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Subscriptions + Budget ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Section title="Assinaturas detectadas" subtitle="cobranças recorrentes">
            {subs.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nenhuma assinatura detectada ainda.</p>
            ) : (
              <div className="space-y-2">
                {subs.slice(0, 6).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-[12px] py-1 border-b last:border-0">
                    <div>
                      <p className="font-medium">{s.merchant}</p>
                      <p className="text-[10px] text-muted-foreground">{s.monthsCount} {s.monthsCount === 1 ? "mês" : "meses"}</p>
                    </div>
                    <span className="num font-semibold">{brl(s.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Progresso das metas" subtitle="realizado vs limite mensal">
            {budgets.length === 0 ? (
              <div className="space-y-2">
                <p className="text-[13px] text-muted-foreground">Nenhuma meta configurada.</p>
                <Link href="/settings" className="text-[12px] underline underline-offset-2 text-muted-foreground">
                  Configurar metas →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {(["necessario", "superfluo", "investimento"] as Category[]).map(cat => {
                  const limit = budgetMap.get(cat)
                  if (!limit) return null
                  const spent = cat === "necessario" ? necessario : cat === "superfluo" ? superfluo : investimento
                  const pct = Math.min((spent / limit) * 100, 100)
                  const over = spent > limit
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-[12px] mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: CAT_COLORS[cat] }} />
                          {CAT_LABELS[cat]}
                        </span>
                        <span className="num text-muted-foreground">
                          {brl(spent, true)} / {brl(limit, true)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: over ? CAT_COLORS.superfluo : CAT_COLORS[cat],
                          }}
                        />
                      </div>
                      {over && (
                        <p className="text-[10px] mt-1" style={{ color: CAT_COLORS.superfluo }}>
                          +{brl(spent - limit, true)} acima do limite
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* ── Drill-down Sheet ─────────────────────────────────────────────────── */}
      <DrillSheet
        open={!!drill}
        onClose={() => setDrill(null)}
        title={
          drill === "gasto" ? "Gasto do mês" :
          drill === "necessario" ? "Necessário" :
          drill === "superfluo" ? "Supérfluo" :
          drill === "investimento" ? "Investimento" : ""
        }
      >
        {drill === "gasto" && (
          <div className="space-y-5">
            <div>
              <div className="num text-[28px] font-semibold tracking-tight leading-none">{brl(total)}</div>
              <div className="flex items-center gap-2 mt-2 text-[12px] text-muted-foreground">
                {deltaTotal != null && <DeltaChip value={deltaTotal} />}
                <span>vs {prevMonth ? monthLabel(prevMonth) : "mês anterior"}</span>
                {incomeUsedPct != null && <span>· {incomeUsedPct.toFixed(0)}% da renda</span>}
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 text-[12px] font-semibold">Por categoria</div>
              {[
                { label: "Necessário", value: necessario, color: CAT_COLORS.necessario },
                { label: "Supérfluo", value: superfluo, color: CAT_COLORS.superfluo },
                { label: "Investimento", value: investimento, color: CAT_COLORS.investimento },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 text-[12px]">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-[2px]" style={{ background: color }} />
                    {label}
                  </span>
                  <span className="num font-semibold">{brl(value)}</span>
                </div>
              ))}
            </div>
            {projection && (
              <div className="border rounded-lg p-4 bg-muted/20 text-[12px]">
                <div className="flex items-center gap-1.5 font-semibold mb-2">
                  <TrendingUp size={13} />Projeção de fim de mês
                </div>
                <div className="num text-[20px] font-semibold">{brl(projection.projected)}</div>
                <p className="text-muted-foreground mt-1">{projection.elapsed} de {projection.total} dias</p>
              </div>
            )}
          </div>
        )}
        {(drill === "necessario" || drill === "superfluo" || drill === "investimento") && drill !== null && (
          <div className="space-y-5">
            <div>
              <div className="num text-[28px] font-semibold tracking-tight leading-none" style={{ color: CAT_COLORS[drill as Category] }}>
                {brl(drill === "necessario" ? necessario : drill === "superfluo" ? superfluo : investimento)}
              </div>
              <div className="text-[12px] text-muted-foreground mt-2">{CAT_LABELS[drill as Category]}</div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 text-[12px] font-semibold">Transações</div>
              {currentMonthTxs
                .filter(t => t.category === drill)
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 10)
                .map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 text-[12px]">
                    <div>
                      <p className="font-medium truncate max-w-[200px]">{t.description}</p>
                      <p className="text-[10px] text-muted-foreground">{t.txnDate?.slice(5, 10).replace("-", "/")}</p>
                    </div>
                    <span className="num font-semibold">{brl(t.amount)}</span>
                  </div>
                ))}
              {currentMonthTxs.filter(t => t.category === drill).length === 0 && (
                <p className="px-4 py-3 text-[12px] text-muted-foreground">Nenhuma transação.</p>
              )}
            </div>
          </div>
        )}
      </DrillSheet>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-[13px] gap-2">
      <Upload size={20} strokeWidth={1.5} className="opacity-40" />
      <span>Sem dados · <Link href="/upload" className="underline underline-offset-2">fazer upload de fatura</Link></span>
    </div>
  )
}
