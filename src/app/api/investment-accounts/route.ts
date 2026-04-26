import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/db/index"
import { investmentAccounts } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const accounts = await db
    .select()
    .from(investmentAccounts)
    .where(eq(investmentAccounts.userId, user.id))

  return NextResponse.json(accounts)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name, bankCode } = body

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 })
  }
  if (!bankCode || typeof bankCode !== "string" || bankCode.trim().length === 0) {
    return NextResponse.json({ error: "invalid_bank_code" }, { status: 400 })
  }

  const [created] = await db
    .insert(investmentAccounts)
    .values({ userId: user.id, name: name.trim(), bankCode: bankCode.trim().toLowerCase() })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
