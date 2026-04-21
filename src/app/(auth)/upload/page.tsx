import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/db/index"
import { documents } from "@/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { UploadSection } from "@/components/upload/upload-section"

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const mapDoc = (doc: { id: string; fileName: string; referenceMonth: string; status: string; createdAt: Date }) => ({
    id: doc.id,
    fileName: doc.fileName,
    referenceMonth: doc.referenceMonth,
    status: doc.status as "processing" | "completed" | "error",
    createdAt: doc.createdAt.toISOString(),
  })

  const faturasDocs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.userId, user.id), eq(documents.type, "credit_card_statement")))
    .orderBy(desc(documents.createdAt))

  const investimentosDocs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.userId, user.id), eq(documents.type, "investment_statement")))
    .orderBy(desc(documents.createdAt))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upload</h2>
        <p className="text-muted-foreground">
          Envie faturas de cartão ou extratos de investimento em PDF
        </p>
      </div>

      <UploadSection
        title="Faturas de Cartão"
        documentType="credit_card_statement"
        documents={faturasDocs.map(mapDoc)}
      />

      <UploadSection
        title="Extratos de Investimento"
        documentType="investment_statement"
        documents={investimentosDocs.map(mapDoc)}
      />
    </div>
  )
}
