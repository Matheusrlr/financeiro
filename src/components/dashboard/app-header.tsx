"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AppHeader({ userEmail }: { userEmail: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Financeiro</h1>
          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/investimentos"
              className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Investimentos
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Upload
            </Link>
            <Link
              href="/transactions"
              className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Transacoes
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Configurações
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{userEmail}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
