import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getInvestmentAccounts,
  getLatestReferenceMonth,
  getKpisForMonth,
  getReturnsHistory,
  getPatrimonyHistory,
  getCurrentAllocation,
  getAllocationHistory,
  getHoldings,
  getLiquidity,
  getEventsTimeline,
} from "@/lib/queries/investments"
import { PatrimonyEvolutionChart } from "@/components/investments/patrimony-evolution-chart"
import { ReturnsVsBenchmarksChart } from "@/components/investments/returns-vs-benchmarks-chart"
import { AllocationDonut } from "@/components/investments/allocation-donut"
import { AllocationEvolutionChart } from "@/components/investments/allocation-evolution-chart"
import { HoldingsTable } from "@/components/investments/holdings-table"
import { LiquidityLadderChart } from "@/components/investments/liquidity-ladder-chart"
import { MonthlyReturnsHeatmap } from "@/components/investments/monthly-returns-heatmap"
import { EventsTimelineChart } from "@/components/investments/events-timeline-chart"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 })
const pctFmt = (v: number) => `${v.toFixed(2)}%`

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-")
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

export default async function InvestimentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const userId = user.id

  const accounts = await getInvestmentAccounts(userId)
  const latestMonth = await getLatestReferenceMonth(userId)

  if (accounts.length === 0 || !latestMonth) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Investimentos</h2>
          <p className="text-muted-foreground">Acompanhe a evolução do seu patrimônio.</p>
        </div>
        <Card>
          <CardContent className="flex h-64 items-center justify-center text-center text-muted-foreground text-sm">
            Faça upload de extratos de investimento para ver seus dados.
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch all data in parallel for the latest month (consolidated)
  const [
    kpis,
    returnsHistory,
    patrimonyHistory,
    allocationCurrent,
    allocationHistory,
    holdings,
    liquidity,
    eventsTimeline,
  ] = await Promise.all([
    getKpisForMonth(userId, latestMonth),
    getReturnsHistory(userId),
    getPatrimonyHistory(userId),
    getCurrentAllocation(userId, latestMonth),
    getAllocationHistory(userId),
    getHoldings(userId, latestMonth),
    getLiquidity(userId, latestMonth),
    getEventsTimeline(userId),
  ])

  // CDI totals derived from returns history
  const latestReturns = returnsHistory.find((r) => r.referenceMonth === latestMonth)
  const cdiMonthPct = latestReturns?.cdiPct ?? 0
  const cdiYearPct = returnsHistory
    .filter((r) => r.referenceMonth.startsWith(latestMonth.slice(0, 4)))
    .reduce((acc, r) => acc * (1 + r.cdiPct / 100), 1) - 1
  const cdiInceptionPct = returnsHistory
    .reduce((acc, r) => acc * (1 + r.cdiPct / 100), 1) - 1

  const gainDelta = kpis ? kpis.patrimony - kpis.previousPatrimony : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Investimentos</h2>
        <p className="text-muted-foreground">
          {latestMonth ? `Referência: ${fmtMonth(latestMonth)}` : "Acompanhe a evolução do seu patrimônio."}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Patrimônio</CardDescription>
            <CardTitle className="text-2xl">{kpis ? brl.format(kpis.patrimony) : "—"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xs font-medium ${gainDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {gainDelta >= 0 ? "+" : ""}{brl.format(gainDelta)} vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ganhos no mês</CardDescription>
            <CardTitle className="text-2xl">{kpis ? brl.format(kpis.gainsMonth) : "—"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Rendimentos financeiros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rent. mês</CardDescription>
            <CardTitle className="text-2xl">{kpis ? pctFmt(kpis.returnMonthPct) : "—"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">CDI {pctFmt(cdiMonthPct)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rent. ano</CardDescription>
            <CardTitle className="text-2xl">{kpis ? pctFmt(kpis.returnYearPct) : "—"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">CDI {pctFmt(cdiYearPct * 100)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total aportado</CardDescription>
            <CardTitle className="text-2xl">{kpis ? brl.format(kpis.totalContributed) : "—"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Desde o início</p>
          </CardContent>
        </Card>
      </div>

      {/* Wealth charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do patrimônio</CardTitle>
            <CardDescription>Patrimônio vs total aportado</CardDescription>
          </CardHeader>
          <CardContent>
            <PatrimonyEvolutionChart data={patrimonyHistory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rentabilidade vs CDI</CardTitle>
            <CardDescription>Carteira comparada ao CDI por período</CardDescription>
          </CardHeader>
          <CardContent>
            <ReturnsVsBenchmarksChart
              returnMonthPct={kpis?.returnMonthPct ?? 0}
              returnYearPct={kpis?.returnYearPct ?? 0}
              returnInceptionPct={kpis?.returnInceptionPct ?? 0}
              cdiMonthPct={cdiMonthPct}
              cdiYearPct={cdiYearPct * 100}
              cdiInceptionPct={cdiInceptionPct * 100}
            />
          </CardContent>
        </Card>
      </div>

      {/* Allocation visuals */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alocação por estratégia</CardTitle>
            <CardDescription>Distribuição atual do patrimônio</CardDescription>
          </CardHeader>
          <CardContent>
            <AllocationDonut data={allocationCurrent} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução da alocação</CardTitle>
            <CardDescription>Últimos 6 meses por estratégia</CardDescription>
          </CardHeader>
          <CardContent>
            <AllocationEvolutionChart data={allocationHistory} />
          </CardContent>
        </Card>
      </div>

      {/* Holdings table */}
      <Card>
        <CardHeader>
          <CardTitle>Carteira detalhada</CardTitle>
          <CardDescription>Todos os ativos agrupados por estratégia</CardDescription>
        </CardHeader>
        <CardContent>
          <HoldingsTable holdings={holdings} />
        </CardContent>
      </Card>

      {/* Risk & liquidity */}
      <Card>
        <CardHeader>
          <CardTitle>Risco e liquidez</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="liquidity">
            <TabsList>
              <TabsTrigger value="liquidity">Liquidez</TabsTrigger>
              <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
              <TabsTrigger value="events">Eventos</TabsTrigger>
            </TabsList>
            <TabsContent value="liquidity" className="mt-4">
              <LiquidityLadderChart data={liquidity} />
            </TabsContent>
            <TabsContent value="heatmap" className="mt-4">
              <MonthlyReturnsHeatmap data={returnsHistory} />
            </TabsContent>
            <TabsContent value="events" className="mt-4">
              <EventsTimelineChart data={eventsTimeline} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
