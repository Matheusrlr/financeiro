import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { db } from "@/db/index"
import { documents } from "@/db/schema"
import { sha256Hash, currentMonth, detectDocumentType } from "@/lib/utils"
import { and, eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  const cardId = formData.get("cardId")
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

  // Validate referenceMonth if provided
  const refMonthValue = typeof referenceMonthInput === "string" && /^\d{4}-\d{2}$/.test(referenceMonthInput)
    ? referenceMonthInput
    : currentMonth()

  // Validate cardId if provided
  const cardIdValue = typeof cardId === "string" && cardId.length > 0 ? cardId : null

  const docType = detectDocumentType(file.name)
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
  const storagePath = `${user.id}/${hash}.pdf`

  const { error: storageError } = await supabaseAdmin.storage
    .from("documents")
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true })

  if (storageError) {
    console.error("Storage upload failed:", JSON.stringify(storageError))
    return NextResponse.json({ error: "storage_error", detail: storageError.message }, { status: 500 })
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
        metadata: cardIdValue ? { cardId: cardIdValue } : null,
      })
      .returning()
  } catch (err) {
    console.error("Failed to insert document record:", err)
    return NextResponse.json({ error: "database_error", detail: "failed to save document record" }, { status: 500 })
  }

  const documentId = inserted[0].id
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  // Fire-and-forget: trigger processing without blocking the upload response
  fetch(`${appUrl}/api/process/${documentId}`, {
    method: "POST",
    headers: { cookie: request.headers.get("cookie") ?? "" },
  }).catch((err) => console.error("Failed to trigger processing:", err))

  return NextResponse.json(
    { documentId, status: "processing" },
    { status: 201 }
  )
}
