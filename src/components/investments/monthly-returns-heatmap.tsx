"use client"

interface MonthlyReturnsHeatmapProps {
  data: Array<{ referenceMonth: string; portfolioPct: number; cdiPct: number }>
}

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

function heatColor(diff: number): string {
  // diff = portfolioPct - cdiPct
  if (diff > 1.0) return "bg-emerald-500 text-white"
  if (diff > 0.5) return "bg-emerald-400 text-white"
  if (diff > 0.1) return "bg-emerald-200 text-emerald-900"
  if (diff > -0.1) return "bg-muted text-muted-foreground"
  if (diff > -0.5) return "bg-rose-200 text-rose-900"
  if (diff > -1.0) return "bg-rose-400 text-white"
  return "bg-rose-600 text-white"
}

export function MonthlyReturnsHeatmap({ data }: MonthlyReturnsHeatmapProps) {
  if (data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Sem dados para exibir</div>
  }

  // Build year × month grid
  const map = new Map<string, { portfolioPct: number; cdiPct: number }>()
  for (const d of data) {
    map.set(d.referenceMonth, { portfolioPct: d.portfolioPct, cdiPct: d.cdiPct })
  }

  const years = Array.from(new Set(data.map((d) => d.referenceMonth.slice(0, 4)))).sort()

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left pr-2 pb-1 text-muted-foreground font-medium">Ano</th>
            {MONTHS_SHORT.map((m) => (
              <th key={m} className="pb-1 text-muted-foreground font-medium text-center w-10">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((year) => (
            <tr key={year}>
              <td className="pr-2 py-0.5 font-medium text-muted-foreground">{year}</td>
              {MONTHS_SHORT.map((_, mIdx) => {
                const key = `${year}-${String(mIdx + 1).padStart(2, "0")}`
                const entry = map.get(key)
                if (!entry) {
                  return <td key={mIdx} className="w-10 h-7 rounded text-center" />
                }
                const diff = entry.portfolioPct - entry.cdiPct
                return (
                  <td key={mIdx} className={`w-10 h-7 rounded text-center tabular-nums ${heatColor(diff)}`} title={`Carteira: ${entry.portfolioPct.toFixed(2)}% | CDI: ${entry.cdiPct.toFixed(2)}%`}>
                    {entry.portfolioPct.toFixed(2)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">Cor relativa ao CDI do mês. Verde = acima do CDI, Vermelho = abaixo.</p>
    </div>
  )
}
