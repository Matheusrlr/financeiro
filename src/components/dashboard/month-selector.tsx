"use client"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CalendarIcon } from "lucide-react"

function formatMonth(ym: string) {
  const [year, month] = ym.split("-")
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
}

interface MonthSelectorProps {
  months: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export function MonthSelector({ months, selected, onChange }: MonthSelectorProps) {
  const allSelected = selected.length === months.length

  function toggleAll() {
    onChange(allSelected ? [] : [...months])
  }

  function toggleMonth(month: string) {
    if (selected.includes(month)) {
      onChange(selected.filter((m) => m !== month))
    } else {
      onChange([...selected, month])
    }
  }

  const label =
    selected.length === 0
      ? "Nenhum mês"
      : allSelected
      ? "Todos os meses"
      : `${selected.length} ${selected.length === 1 ? "mês" : "meses"}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 w-48 items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <CalendarIcon className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Filtrar por mês</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={allSelected}
            onCheckedChange={toggleAll}
            closeOnClick={false}
          >
            Todos os meses
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {months.map((month) => (
            <DropdownMenuCheckboxItem
              key={month}
              checked={selected.includes(month)}
              onCheckedChange={() => toggleMonth(month)}
              closeOnClick={false}
            >
              {formatMonth(month)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
