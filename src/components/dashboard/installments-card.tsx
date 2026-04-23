"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard } from "lucide-react"
import { detectInstallments, type AnalyticsTx } from "@/lib/analytics"

interface InstallmentsCardProps {
  transactions: AnalyticsTx[]
  visible?: boolean
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function InstallmentsCard({ transactions, visible = true }: InstallmentsCardProps) {
  const installments = detectInstallments(transactions)
  const totalRemaining = installments.reduce((sum, i) => sum + i.remaining, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> Parcelamentos em aberto
        </CardTitle>
        <CardDescription>
          {installments.length === 0
            ? "Nenhum parcelamento detectado."
            : `Comprometido: ${visible ? currencyFormatter.format(totalRemaining) : "R$ •••"} em parcelas futuras`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {installments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Compras parceladas (ex: &quot;PARC 3/12&quot;) aparecem aqui.
          </p>
        ) : (
          <ul className="space-y-3">
            {installments.slice(0, 6).map((it) => {
              const progress = (it.installment.current / it.installment.total) * 100
              return (
                <li key={it.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[60%]">
                      {visible ? it.description : "••••••••"}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {it.installment.current}/{it.installment.total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {visible ? currencyFormatter.format(it.amount) : "R$ •••"} / parcela
                    </span>
                    <span>
                      Restam{" "}
                      {visible ? currencyFormatter.format(it.remaining) : "R$ •••"}
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
