import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { db } from "@/db/index"
import { documents, transactions } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { parseDocument } from "@/lib/parsers"
import { currentMonth } from "@/lib/utils"
import { PDFParse } from "pdf-parse"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // Fetch the document, verify ownership
  let doc: typeof documents.$inferSelect | undefined
  try {
    const rows = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, user.id)))
    doc = rows[0]
  } catch (err) {
    console.error("[process] Failed to fetch document:", err)
    return NextResponse.json({ error: "database_error" }, { status: 500 })
  }

  if (!doc) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const markError = async () => {
    await db
      .update(documents)
      .set({ status: "error" })
      .where(eq(documents.id, id))
      .catch((e) => console.error("[process] Failed to mark error status:", e))
  }

  // Download PDF from Supabase Storage
  const { data: fileData, error: storageError } = await supabaseAdmin.storage
    .from("documents")
    .download(doc.storagePath)

  if (storageError || !fileData) {
    console.error("[process] Failed to download PDF:", storageError)
    await markError()
    return NextResponse.json({ error: "storage_error" }, { status: 500 })
  }

  // Extract text from PDF
  let pdfText: string
  try {
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    pdfText = result.text
  } catch (err) {
    console.error("[process] Failed to parse PDF:", err)
    await markError()
    return NextResponse.json({ error: "pdf_parse_error" }, { status: 500 })
  }

  if (!pdfText || pdfText.trim().length === 0) {
    console.error("[process] PDF yielded empty text")
    await markError()
    return NextResponse.json({ error: "empty_pdf" }, { status: 422 })
  }

  // Parse transactions via regex
  const parseResult = parseDocument(pdfText)

  // Prefer referenceMonth from document (set at upload) unless it's the generic currentMonth
  const refMonth =
    doc.referenceMonth && doc.referenceMonth !== currentMonth()
      ? doc.referenceMonth
      : parseResult.referenceMonth || doc.referenceMonth

  if (parseResult.transactions.length === 0) {
    console.warn("[process] No transactions extracted from document:", id)
    await db
      .update(documents)
      .set({ status: "completed", referenceMonth: refMonth })
      .where(eq(documents.id, id))
    return NextResponse.json({ documentId: id, transactionsInserted: 0 })
  }

  const cardId = (doc.metadata as { cardId?: string } | null)?.cardId ?? null

  const rows = parseResult.transactions.map((t) => ({
    userId: user.id,
    documentId: id,
    cardId,
    referenceMonth: refMonth,
    txnDate: t.date,
    description: t.description,
    amount: String(t.amount),
    category: t.category,
  }))

  // Insert transactions and mark document as completed
  try {
    await db.transaction(async (tx) => {
      if (rows.length > 0) {
        await tx.insert(transactions).values(rows)
      }
      await tx
        .update(documents)
        .set({ status: "completed", referenceMonth: refMonth })
        .where(eq(documents.id, id))
    })
  } catch (err) {
    console.error("[process] Failed to save transactions:", err)
    await markError()
    return NextResponse.json({ error: "database_error" }, { status: 500 })
  }

  return NextResponse.json({
    documentId: id,
    referenceMonth: refMonth,
    transactionsInserted: rows.length,
  })
}
