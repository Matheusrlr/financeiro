"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  ArrowLeftRight,
  Upload,
  Settings,
  LogOut,
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",      icon: LayoutDashboard },
  { href: "/investimentos", label: "Investimentos",  icon: TrendingUp },
  { href: "/transactions",  label: "Transações",     icon: ArrowLeftRight },
  { href: "/cartoes",       label: "Cartões",        icon: CreditCard },
  { href: "/upload",        label: "Upload",         icon: Upload },
  { href: "/settings",      label: "Configurações",  icon: Settings },
]

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : "VC"

  return (
    <aside
      className="flex flex-col w-[200px] shrink-0 border-r bg-muted/40 h-screen sticky top-0"
      style={{ fontFamily: "var(--font-fin-sans, var(--font-geist-sans))" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b">
        <div className="w-6 h-6 rounded-[5px] bg-foreground text-background grid place-items-center text-[11px] font-bold tracking-tight shrink-0">
          F
        </div>
        <span className="text-[13px] font-semibold tracking-tight">Finanças</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2.5 py-3 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors"
              style={{
                color: active ? "var(--foreground)" : "var(--muted-foreground)",
                background: active ? "var(--card)" : "transparent",
                boxShadow: active ? "0 0 0 1px var(--border), 0 1px 2px rgba(0,0,0,0.04)" : "none",
              }}
            >
              <Icon size={15} strokeWidth={1.6} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 pt-3 border-t">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-muted grid place-items-center text-[11px] font-semibold text-muted-foreground shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-foreground truncate">{userEmail}</p>
            <p className="text-[10px] text-muted-foreground">conta pessoal</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
            title="Sair"
          >
            <LogOut size={13} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </aside>
  )
}
