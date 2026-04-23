"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { categoryColors, categoryLabels, type Category } from "./categories"

export interface Transaction {
  id: string
  description: string
  amount: number
  txnDate: string
  category: Category
  cardId?: string
}

interface TransactionTableProps {
  transactions: Transaction[]
  visible: boolean
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-")
  return `${day}/${month}/${year}`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount)
}

export function TransactionTable({ transactions, visible }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        Nenhuma transação corresponde aos filtros selecionados.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead className="text-right">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((txn) => (
          <TableRow key={txn.id}>
            <TableCell className="text-muted-foreground text-sm">
              {formatDate(txn.txnDate)}
            </TableCell>
            <TableCell>
              {visible ? txn.description : "••••••••"}
            </TableCell>
            <TableCell>
              <Badge className={categoryColors[txn.category]}>
                {categoryLabels[txn.category]}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-medium">
              {visible ? formatCurrency(txn.amount) : "R$ •••,••"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
