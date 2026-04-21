import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/db/index"
import { transactions, cards } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { TransactionsView } from "@/components/transactions/transactions-view"

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, user.id))
    .orderBy(desc(transactions.txnDate))
    .limit(100)

  const txList = rows.map((row) => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    txnDate: row.txnDate,
    category: row.category as "necessario" | "superfluo" | "investimento",
    cardId: row.cardId ?? undefined,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Transações</h2>
        <p className="text-muted-foreground">
          Todas as transações extraídas das suas faturas e extratos.
        </p>
      </div>

      <TransactionsView transactions={txList} />
    </div>
  )
}
