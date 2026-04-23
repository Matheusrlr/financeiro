import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/db/index"
import { userSettings } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .limit(1)

  return NextResponse.json({
    monthlyIncome: row?.monthlyIncome ? Number(row.monthlyIncome) : null,
  })
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
  const { monthlyIncome } = body
  const income =
    monthlyIncome === null || monthlyIncome === "" ? null : Number(monthlyIncome)

  if (income !== null && (!Number.isFinite(income) || income < 0)) {
    return NextResponse.json({ error: "invalid monthlyIncome" }, { status: 400 })
  }

  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(userSettings)
      .set({
        monthlyIncome: income === null ? null : income.toString(),
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, user.id))
  } else {
    await db.insert(userSettings).values({
      userId: user.id,
      monthlyIncome: income === null ? null : income.toString(),
    })
  }

  return NextResponse.json({ monthlyIncome: income })
}
