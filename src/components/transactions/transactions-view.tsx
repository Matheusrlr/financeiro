"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionTable, type Transaction } from "./transaction-table"

interface TransactionsViewProps {
  transactions: Transaction[]
}

export function TransactionsView({ transactions }: TransactionsViewProps) {
  const [visible, setVisible] = useState(false)

  if (transactions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhuma transação encontrada. Faça upload de uma fatura primeiro.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
      <TransactionTable transactions={transactions} visible={visible} />
    </div>
  )
}
