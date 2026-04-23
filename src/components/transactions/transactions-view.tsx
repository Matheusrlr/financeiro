"use client"

import { useMemo, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionTable, type Transaction } from "./transaction-table"
import {
  CATEGORIES,
  categoryLabels,
  categorySolidColors,
  type Category,
} from "./categories"
import { cn } from "@/lib/utils"

interface TransactionsViewProps {
  transactions: Transaction[]
}

export function TransactionsView({ transactions }: TransactionsViewProps) {
  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState<Set<Category>>(() => new Set(CATEGORIES))

  const toggle = (cat: Category) => {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const filtered = useMemo(() => {
    if (active.size === 0) return transactions
    return transactions.filter((t) => active.has(t.category))
  }, [transactions, active])

  if (transactions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhuma transação encontrada. Faça upload de uma fatura primeiro.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold">Transações</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Ocultar valores" : "Mostrar valores"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="ml-2 text-sm">
            {visible ? "Ocultar valores" : "Mostrar valores"}
          </span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Filtrar:</span>
        {CATEGORIES.map((cat) => {
          const isActive = active.has(cat)
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              aria-pressed={isActive}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "border-transparent text-white shadow-sm"
                  : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              style={isActive ? { backgroundColor: categorySolidColors[cat] } : undefined}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isActive ? "bg-white" : ""
                )}
                style={
                  !isActive ? { backgroundColor: categorySolidColors[cat] } : undefined
                }
              />
              {categoryLabels[cat]}
            </button>
          )
        })}
        {active.size > 0 && active.size < CATEGORIES.length ? (
          <button
            type="button"
            onClick={() => setActive(new Set(CATEGORIES))}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline ml-1"
          >
            Limpar filtros
          </button>
        ) : null}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} de {transactions.length} transações
        </span>
      </div>

      <TransactionTable transactions={filtered} visible={visible} />
    </div>
  )
}
