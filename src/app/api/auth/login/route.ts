import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_EMAILS = ["matheus.reislr@gmail.com"];

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
    return NextResponse.json(
      { error: "Acesso não autorizado para este email." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Erro ao enviar link de login. Tente novamente." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
