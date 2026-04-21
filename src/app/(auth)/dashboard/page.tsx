import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/db/index"
import { cards, transactions } from "@/db/schema"
import { eq, and, gte } from "drizzle-orm"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 7)

  const [cardRows, txRows] = await Promise.all([
    db.select().from(cards).where(eq(cards.userId, user.id)),
    db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.referenceMonth, sixMonthsAgo)
        )
      ),
  ])

  const cardList = cardRows.map((c) => ({
    id: c.id,
    name: c.name,
    bankCode: c.bankCode,
    color: c.color ?? "#6366f1",
    createdAt: c.createdAt.toISOString(),
  }))

  const txList = txRows.map((t) => ({
    id: t.id,
    cardId: t.cardId ?? undefined,
    amount: Number(t.amount),
    category: t.category as "necessario" | "superfluo" | "investimento",
    referenceMonth: t.referenceMonth,
  }))

  return <DashboardClient cards={cardList} transactions={txList} />
}
