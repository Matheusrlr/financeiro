"use client"

import { useEffect, useState } from "react"
import { Pencil, Target } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  CATEGORIES,
  categoryLabels,
  categorySolidColors,
  type Category,
} from "@/components/transactions/categories"

interface BudgetProgressCardProps {
  initial: Array<{ category: Category; monthlyLimit: number }>
  realized: Record<Category, number>
  visible?: boolean
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function BudgetProgressCard({ initial, realized, visible = true }: BudgetProgressCardProps) {
  const [budgets, setBudgets] = useState<Record<Category, number>>(() => {
    const map = { necessario: 0, superfluo: 0, investimento: 0 } as Record<Category, number>
    for (const b of initial) map[b.category] = b.monthlyLimit
    return map
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState<Record<Category, string>>({
    necessario: String(budgets.necessario || ""),
    superfluo: String(budgets.superfluo || ""),
    investimento: String(budgets.investimento || ""),
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (dialogOpen) {
      setDraft({
        necessario: String(budgets.necessario || ""),
        superfluo: String(budgets.superfluo || ""),
        investimento: String(budgets.investimento || ""),
      })
    }
  }, [dialogOpen, budgets])

  async function handleSave() {
    setSaving(true)
    try {
      for (const cat of CATEGORIES) {
        const value = Number(draft[cat])
        if (!Number.isFinite(value) || value < 0) continue
        if (value === budgets[cat]) continue
        const res = await fetch("/api/budgets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: cat, monthlyLimit: value }),
        })
        if (!res.ok) throw new Error(`Falha ao salvar ${cat}`)
      }
      const next: Record<Category, number> = {
        necessario: Number(draft.necessario) || 0,
        superfluo: Number(draft.superfluo) || 0,
        investimento: Number(draft.investimento) || 0,
      }
      setBudgets(next)
      toast.success("Orçamento atualizado")
      setDialogOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const hasAnyBudget = CATEGORIES.some((c) => budgets[c] > 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" /> Orçamento mensal
          </CardTitle>
          <CardDescription>Realizado vs limite planejado</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setDialogOpen(true)}>
          <Pencil className="h-4 w-4 mr-1" /> Editar
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Definir orçamento mensal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {CATEGORIES.map((cat) => (
                <div key={cat} className="space-y-1">
                  <Label htmlFor={`budget-${cat}`}>{categoryLabels[cat]}</Label>
                  <Input
                    id={`budget-${cat}`}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={draft[cat]}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [cat]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!hasAnyBudget ? (
          <p className="text-sm text-muted-foreground">
            Nenhum orçamento definido. Clique em Editar para começar.
          </p>
        ) : (
          <ul className="space-y-3">
            {CATEGORIES.map((cat) => {
              const limit = budgets[cat]
              const used = realized[cat] ?? 0
              if (limit === 0 && used === 0) return null
              const pct = limit === 0 ? 0 : (used / limit) * 100
              const bar =
                pct > 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
              const label =
                limit === 0
                  ? "Sem limite"
                  : `${Math.round(pct)}%`
              return (
                <li key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: categorySolidColors[cat] }}
                      />
                      {categoryLabels[cat]}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {visible ? currencyFormatter.format(used) : "R$ •••"}
                      {" / "}
                      {limit > 0
                        ? visible
                          ? currencyFormatter.format(limit)
                          : "R$ •••"
                        : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${bar} transition-all`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-right">{label}</div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
