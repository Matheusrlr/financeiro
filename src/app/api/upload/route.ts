import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { db } from "@/db/index"
import { documents, investmentAccounts } from "@/db/schema"
import { sha256Hash, currentMonth, detectDocumentType } from "@/lib/utils"
import { and, eq } from "drizzle-orm"
import { PDFParse } from "pdf-parse"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  const cardId = formData.get("cardId")
  const accountId = formData.get("accountId")
  const referenceMonthInput = formData.get("referenceMonth")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 })
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 })
  }

  const refMonthValue = typeof referenceMonthInput === "string" && /^\d{4}-\d{2}$/.test(referenceMonthInput)
    ? referenceMonthInput
    : currentMonth()

  const cardIdValue = typeof cardId === "string" && cardId.length > 0 ? cardId : null
  const accountIdValue = typeof accountId === "string" && accountId.length > 0 ? accountId : null

  const docType = detectDocumentType(file.name)

  // For investment statements: ensure we have an accountId (pre-seed Inter Prime if none exists)
  let resolvedAccountId: string | null = accountIdValue
  if (docType === "investment_statement") {
    if (!resolvedAccountId) {
      // Try to find or create Inter Prime account
      const existing = await db
        .select()
        .from(investmentAccounts)
        .where(eq(investmentAccounts.userId, user.id))
      if (existing.length > 0) {
        resolvedAccountId = existing[0].id
      } else {
        const [created] = await db
          .insert(investmentAccounts)
          .values({ userId: user.id, name: "Inter Prime", bankCode: "inter" })
          .returning()
        resolvedAccountId = created.id
      }
    }
  }

  const hash = await sha256Hash(file)

  let existing: typeof documents.$inferSelect[]
  try {
    existing = await db
      .select()
      .from(documents)
      .where(and(eq(documents.fileHash, hash), eq(documents.userId, user.id)))
  } catch (err) {
    console.error("Failed to query documents for duplicate check:", err)
    return NextResponse.json({ error: "database_error", detail: "failed to check for duplicate document" }, { status: 500 })
  }

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "duplicate", documentId: existing[0].id },
      { status: 409 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Extract text now while buffer is in memory — avoids re-downloading from storage in the process route
  let pdfText = ""
  try {
    const t0 = Date.now()
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    pdfText = result.text
    console.log(`[upload] pdf-parse: ${Date.now() - t0}ms, chars=${pdfText.length}`)
  } catch (err) {
    console.warn("[upload] pdf-parse failed, process route will re-extract:", err)
  }

  const storagePath = `${user.id}/${hash}.pdf`

  const { error: storageError } = await supabaseAdmin.storage
    .from("documents")
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true })

  if (storageError) {
    console.error("Storage upload failed:", JSON.stringify(storageError))
    return NextResponse.json({ error: "storage_error", detail: storageError.message }, { status: 500 })
  }

  // Build metadata: cardId for credit cards, accountId for investments
  let metadata: Record<string, string> | null = null
  if (docType === "investment_statement" && resolvedAccountId) {
    metadata = { accountId: resolvedAccountId }
  } else if (docType === "credit_card_statement" && cardIdValue) {
    metadata = { cardId: cardIdValue }
  }

  let inserted: typeof documents.$inferSelect[]
  try {
    inserted = await db
      .insert(documents)
      .values({
        userId: user.id,
        type: docType,
        fileName: file.name,
        storagePath,
        fileHash: hash,
        referenceMonth: refMonthValue,
        status: "processing",
        metadata,
      })
      .returning()
  } catch (err) {
    console.error("Failed to insert document record:", err)
    return NextResponse.json({ error: "database_error", detail: "failed to save document record" }, { status: 500 })
  }

  const documentId = inserted[0].id
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  fetch(`${appUrl}/api/process/${documentId}`, {
    method: "POST",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      "content-type": "application/json",
    },
    body: JSON.stringify({ pdfText: pdfText || undefined }),
  }).catch((err) => console.error("Failed to trigger processing:", err))

  return NextResponse.json(
    { documentId, status: "processing" },
    { status: 201 }
  )
}
