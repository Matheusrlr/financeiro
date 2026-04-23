import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/db/index"
import { userSettings } from "@/db/schema"
import { eq } from "drizzle-orm"
import { SettingsForm } from "@/components/settings/settings-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .limit(1)

  const monthlyIncome = row?.monthlyIncome ? Number(row.monthlyIncome) : null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Preferências e dados pessoais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Renda mensal</CardTitle>
          <CardDescription>
            Usada para calcular o % da renda comprometida no Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm initialIncome={monthlyIncome} />
        </CardContent>
      </Card>
    </div>
  )
}
