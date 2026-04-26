import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { db } from "@/db/index"
import {
  documents,
  transactions,
  investmentReports,
  investmentHoldings,
  investmentReturnsHistory,
  investmentAllocationHistory,
  investmentEvents,
  investmentLiquidity,
} from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { parseDocument, parseInvestmentReportInter } from "@/lib/parsers"
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

  const markError = async (message?: string) => {
    await db
      .update(documents)
      .set({
        status: "error",
        metadata: message ? { ...(doc!.metadata as object | null ?? {}), error: message } : doc!.metadata,
      })
      .where(eq(documents.id, id))
      .catch((e) => console.error("[process] Failed to mark error status:", e))
  }

  const t0 = Date.now()

  // Accept pre-extracted text from upload route to avoid re-downloading from storage
  let body: { pdfText?: string } = {}
  try {
    const ct = request.headers.get("content-type") ?? ""
    if (ct.includes("application/json")) {
      body = await request.json()
    }
  } catch { /* ignore */ }

  let pdfText: string | undefined = body.pdfText

  if (!pdfText) {
    // Fallback: download PDF from Supabase Storage and extract text
    console.log("[process] No pre-extracted text, downloading from storage...")
    const t1 = Date.now()
    const { data: fileData, error: storageError } = await supabaseAdmin.storage
      .from("documents")
      .download(doc.storagePath)
    console.log(`[process] storage download: ${Date.now() - t1}ms`)

    if (storageError || !fileData) {
      console.error("[process] Failed to download PDF:", storageError)
      await markError()
      return NextResponse.json({ error: "storage_error" }, { status: 500 })
    }

    try {
      const t2 = Date.now()
      const buffer = Buffer.from(await fileData.arrayBuffer())
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      pdfText = result.text
      console.log(`[process] pdf-parse (fallback): ${Date.now() - t2}ms`)
    } catch (err) {
      console.error("[process] Failed to parse PDF:", err)
      await markError()
      return NextResponse.json({ error: "pdf_parse_error" }, { status: 500 })
    }
  } else {
    console.log(`[process] used pre-extracted text (${pdfText.length} chars), skipped storage download`)
  }

  console.log(`[process] text ready: ${Date.now() - t0}ms total so far`)

  if (!pdfText || pdfText.trim().length === 0) {
    console.error("[process] PDF yielded empty text")
    await markError()
    return NextResponse.json({ error: "empty_pdf" }, { status: 422 })
  }

  // ── Route by document type ─────────────────────────────

  if (doc.type === "investment_statement") {
    return processInvestmentStatement(id, user.id, doc, pdfText, markError)
  }

  return processCreditCardStatement(id, user.id, doc, pdfText, markError)
}

// ── Credit card statement processing ──────────────────

async function processCreditCardStatement(
  id: string,
  userId: string,
  doc: typeof documents.$inferSelect,
  pdfText: string,
  markError: (msg?: string) => Promise<void>
) {
  const parseResult = parseDocument(pdfText)

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
    userId,
    documentId: id,
    cardId,
    referenceMonth: refMonth,
    txnDate: t.date,
    description: t.description,
    amount: String(t.amount),
    category: t.category,
  }))

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

// ── Investment statement processing ───────────────────

async function processInvestmentStatement(
  id: string,
  userId: string,
  doc: typeof documents.$inferSelect,
  pdfText: string,
  markError: (msg?: string) => Promise<void>
) {
  const tStart = Date.now()
  const meta = doc.metadata as { accountId?: string } | null
  const accountId = meta?.accountId

  if (!accountId) {
    console.error("[process] Investment statement missing accountId in metadata")
    await markError("Conta de investimento não identificada")
    return NextResponse.json({ error: "missing_account_id" }, { status: 422 })
  }

  let parsed
  try {
    const tParse = Date.now()
    parsed = parseInvestmentReportInter(pdfText)
    console.log(`[process] parseInvestmentReportInter: ${Date.now() - tParse}ms — holdings=${parsed.holdings.length} returnsHistory=${parsed.returnsHistory.length} allocationHistory=${parsed.allocationHistory.length}`)
  } catch (err) {
    console.error("[process] Failed to parse investment report:", err)
    await markError()
    return NextResponse.json({ error: "parse_error" }, { status: 500 })
  }

  const refMonth = parsed.referenceMonth || doc.referenceMonth

  // Check for duplicate report (same user + account + month)
  try {
    const existing = await db
      .select({ id: investmentReports.id })
      .from(investmentReports)
      .where(
        and(
          eq(investmentReports.userId, userId),
          eq(investmentReports.accountId, accountId),
          eq(investmentReports.referenceMonth, refMonth)
        )
      )

    if (existing.length > 0) {
      await db
        .update(documents)
        .set({ status: "error", metadata: { ...((doc.metadata as object) ?? {}), error: "Mês já importado" } })
        .where(eq(documents.id, id))
      return NextResponse.json(
        { error: "duplicate_month", message: "Mês já importado. Apague o relatório anterior para reimportar." },
        { status: 409 }
      )
    }
  } catch (err) {
    console.error("[process] Failed to check duplicate investment report:", err)
    await markError()
    return NextResponse.json({ error: "database_error" }, { status: 500 })
  }

  // Insert all investment data in a single transaction
  try {
    const tDb = Date.now()
    await db.transaction(async (tx) => {
      // 1. Insert report snapshot
      const [report] = await tx
        .insert(investmentReports)
        .values({
          userId,
          accountId,
          referenceMonth: refMonth,
          inceptionDate: parsed.inceptionDate || null,
          patrimony: String(parsed.summary.patrimony),
          previousPatrimony: String(parsed.summary.previousPatrimony),
          contributions: String(parsed.summary.contributions),
          withdrawals: String(parsed.summary.withdrawals),
          financialEvents: String(parsed.summary.financialEvents),
          gainsMonth: String(parsed.summary.gainsMonth),
          returnMonthPct: String(parsed.summary.returnMonthPct),
          returnYearPct: String(parsed.summary.returnYearPct),
          returnInceptionPct: String(parsed.summary.returnInceptionPct),
          totalContributed: String(parsed.summary.totalContributed),
        })
        .returning()

      const reportId = report.id

      // 2. Holdings
      if (parsed.holdings.length > 0) {
        await tx.insert(investmentHoldings).values(
          parsed.holdings.map((h) => ({
            reportId,
            userId,
            strategy: h.strategy,
            assetName: h.assetName,
            ticker: h.ticker ?? null,
            previousBalance: String(h.previousBalance),
            contributions: String(h.contributions),
            withdrawals: String(h.withdrawals),
            events: String(h.events),
            balance: String(h.balance),
            returnMonthPct: String(h.returnMonthPct),
            return12mPct: String(h.return12mPct),
            returnInceptionPct: String(h.returnInceptionPct),
            sharePct: String(h.sharePct),
            isTaxExempt: h.isTaxExempt,
          }))
        )
      }

      // 3. Returns history (upsert idempotent for backfill)
      if (parsed.returnsHistory.length > 0) {
        await tx
          .insert(investmentReturnsHistory)
          .values(
            parsed.returnsHistory.map((r) => ({
              userId,
              accountId,
              referenceMonth: r.referenceMonth,
              portfolioPct: String(r.portfolioPct),
              cdiPct: String(r.cdiPct),
            }))
          )
          .onConflictDoNothing()
      }

      // 4. Allocation history (upsert idempotent)
      if (parsed.allocationHistory.length > 0) {
        await tx
          .insert(investmentAllocationHistory)
          .values(
            parsed.allocationHistory.map((a) => ({
              userId,
              accountId,
              referenceMonth: a.referenceMonth,
              strategy: a.strategy,
              pct: String(a.pct),
            }))
          )
          .onConflictDoNothing()
      }

      // 5. Events
      if (parsed.events.length > 0) {
        await tx.insert(investmentEvents).values(
          parsed.events.map((e) => ({
            reportId,
            userId,
            eventDate: e.eventDate || null,
            ticker: e.ticker ?? null,
            eventType: e.eventType,
            amount: String(e.amount),
          }))
        )
      }

      // 6. Liquidity
      if (parsed.liquidity.length > 0) {
        await tx.insert(investmentLiquidity).values(
          parsed.liquidity.map((l) => ({
            reportId,
            userId,
            bucket: l.bucket,
            amount: String(l.amount),
            pct: String(l.pct),
          }))
        )
      }

      // 7. Mark document as completed
      await tx
        .update(documents)
        .set({ status: "completed", referenceMonth: refMonth })
        .where(eq(documents.id, id))
    })
    console.log(`[process] db transaction: ${Date.now() - tDb}ms`)
  } catch (err) {
    console.error("[process] Failed to save investment report:", err)
    await markError()
    return NextResponse.json({ error: "database_error" }, { status: 500 })
  }

  const total = Date.now() - tStart
  console.log(`[process] ✓ investment statement done in ${total}ms`)
  return NextResponse.json({
    documentId: id,
    referenceMonth: refMonth,
    holdingsInserted: parsed.holdings.length,
    returnsInserted: parsed.returnsHistory.length,
    processingMs: total,
  })
}
