"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MonthSelector } from "@/components/dashboard/month-selector"

function lastSixMonths(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toISOString().slice(0, 7))
  }
  return months
}

const AVAILABLE_MONTHS = lastSixMonths()

export default function InvestimentosPage() {
  const [selectedMonths, setSelectedMonths] = useState<string[]>(AVAILABLE_MONTHS)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Investimentos</h2>
          <p className="text-muted-foreground">
            Acompanhe a evolução do seu patrimônio.
          </p>
        </div>
        <MonthSelector
          months={AVAILABLE_MONTHS}
          selected={selectedMonths}
          onChange={setSelectedMonths}
        />
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taxa Selic</CardDescription>
            <CardTitle className="text-2xl">—</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Taxa básica de juros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ganhos / Perdas</CardDescription>
            <CardTitle className="text-2xl">R$ 0,00</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Resultado do período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Crescimento patrimonial</CardDescription>
            <CardTitle className="text-2xl">0,00 / 0%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Evolução acumulada</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart placeholders */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do patrimônio</CardTitle>
            <CardDescription>Patrimônio total ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-center text-muted-foreground text-sm">
            Faça upload de extratos de investimento para ver seus dados
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alocação de ativos</CardTitle>
            <CardDescription>Distribuição por tipo de ativo</CardDescription>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-center text-muted-foreground text-sm">
            Faça upload de extratos de investimento para ver seus dados
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
