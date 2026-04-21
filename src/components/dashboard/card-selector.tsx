"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { resolveCardColor } from "@/lib/utils"

interface CardSelectorCard {
  id: string
  name: string
  bankCode: string
  color: string
}

interface CardSelectorProps {
  cards: CardSelectorCard[]
  value: string
  onChange: (cardId: string) => void
}

export function CardSelector({ cards, value, onChange }: CardSelectorProps) {
  return (
    <Select value={value} onValueChange={(val) => val && onChange(val)}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Selecionar cartão" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        {cards.map((card) => (
          <SelectItem key={card.id} value={card.id}>
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: resolveCardColor(card) }}
              />
              {card.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
