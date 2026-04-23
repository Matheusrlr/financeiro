import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/db/index"
import { budgets } from "@/db/schema"
import { and, eq } from "drizzle-orm"

type Category = "necessario" | "superfluo" | "investimento"
const ALLOWED: Category[] = ["necessario", "superfluo", "investimento"]

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db.select().from(budgets).where(eq(budgets.userId, user.id))
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      category: r.category,
      monthlyLimit: Number(r.monthlyLimit),
    }))
  )
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { category, monthlyLimit } = body

  if (!ALLOWED.includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 })
  }
  const limit = Number(monthlyLimit)
  if (!Number.isFinite(limit) || limit < 0) {
    return NextResponse.json({ error: "invalid monthlyLimit" }, { status: 400 })
  }

  const existing = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, user.id), eq(budgets.category, category)))
    .limit(1)

  if (existing.length > 0) {
    const [updated] = await db
      .update(budgets)
      .set({ monthlyLimit: limit.toString(), updatedAt: new Date() })
      .where(and(eq(budgets.userId, user.id), eq(budgets.category, category)))
      .returning()
    return NextResponse.json({
      id: updated.id,
      category: updated.category,
      monthlyLimit: Number(updated.monthlyLimit),
    })
  }

  const [created] = await db
    .insert(budgets)
    .values({
      userId: user.id,
      category,
      monthlyLimit: limit.toString(),
    })
    .returning()

  return NextResponse.json(
    {
      id: created.id,
      category: created.category,
      monthlyLimit: Number(created.monthlyLimit),
    },
    { status: 201 }
  )
}
