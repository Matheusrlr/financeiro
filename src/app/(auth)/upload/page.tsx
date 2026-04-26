import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/db/index"
import { documents, cards, investmentAccounts } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { UploadSection } from "@/components/upload/upload-section"

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [allDocs, cardRows, accountRows] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(eq(documents.userId, user.id))
      .orderBy(desc(documents.createdAt)),
    db
      .select()
      .from(cards)
      .where(eq(cards.userId, user.id)),
    db
      .select()
      .from(investmentAccounts)
      .where(eq(investmentAccounts.userId, user.id)),
  ])

  const mappedDocs = allDocs.map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    referenceMonth: doc.referenceMonth,
    status: doc.status as "processing" | "completed" | "error",
    type: doc.type as "credit_card_statement" | "investment_statement",
    createdAt: doc.createdAt.toISOString(),
  }))

  const mappedCards = cardRows.map((c) => ({
    id: c.id,
    name: c.name,
    bankCode: c.bankCode,
  }))

  const mappedAccounts = accountRows.map((a) => ({
    id: a.id,
    name: a.name,
    bankCode: a.bankCode,
  }))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upload</h2>
        <p className="text-muted-foreground">
          Envie faturas de cartão ou extratos de investimento em PDF. O tipo é detectado automaticamente.
        </p>
      </div>

      <UploadSection documents={mappedDocs} cards={mappedCards} investmentAccounts={mappedAccounts} />
    </div>
  )
}
