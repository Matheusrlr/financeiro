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

export interface Transaction {
  id: string
  description: string
  amount: number
  txnDate: string
  category: "necessario" | "superfluo" | "investimento"
  cardId?: string
}

interface TransactionTableProps {
  transactions: Transaction[]
  visible: boolean
}

const categoryColors: Record<Transaction["category"], string> = {
  necessario: "bg-emerald-100 text-emerald-800 border-emerald-200",
  superfluo: "bg-amber-100 text-amber-800 border-amber-200",
  investimento: "bg-blue-100 text-blue-800 border-blue-200",
}

const categoryLabels: Record<Transaction["category"], string> = {
  necessario: "Necessário",
  superfluo: "Supérfluo",
  investimento: "Investimento",
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
