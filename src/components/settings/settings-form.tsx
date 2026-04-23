"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface SettingsFormProps {
  initialIncome: number | null
}

export function SettingsForm({ initialIncome }: SettingsFormProps) {
  const router = useRouter()
  const [value, setValue] = useState<string>(initialIncome !== null ? String(initialIncome) : "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const monthlyIncome = value.trim() === "" ? null : Number(value)
      if (monthlyIncome !== null && (!Number.isFinite(monthlyIncome) || monthlyIncome < 0)) {
        toast.error("Valor inválido")
        return
      }
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyIncome }),
      })
      if (!res.ok) throw new Error("Falha ao salvar")
      toast.success("Renda atualizada")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-end gap-3 max-w-sm">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="monthly-income">Valor líquido (R$)</Label>
        <Input
          id="monthly-income"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="Ex: 5000.00"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Salvando…" : "Salvar"}
      </Button>
    </div>
  )
}
