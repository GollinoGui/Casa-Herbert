import { createClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mode";
import { demoSignIn } from "@/lib/demo/client";
import type { SessionPayload } from "./session";

/**
 * Confere e-mail/senha no Supabase Auth e exige uma linha em admin_profiles —
 * ter conta no Auth não basta para entrar no painel.
 *
 * Usa um cliente descartável: signInWithPassword guarda a sessão do usuário no
 * cliente, e no cliente compartilhado isso trocaria a chave secreta pelo JWT
 * do usuário nas consultas seguintes.
 */
export async function verifyAdminCredentials(email: string, password: string): Promise<SessionPayload | null> {
  if (!email || !password) return null;

  let userId: string;
  if (isDemoMode()) {
    // Sem Supabase Auth no modo demonstração: contas em memória, e a sessão segue o fluxo normal (cookie HMAC).
    const id = demoSignIn(email, password);
    if (!id) return null;
    userId = id;
  } else {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;

    const authClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await authClient.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) return null;
    userId = data.user.id;
  }

  const { data: profile } = await getSupabase()
    .from("admin_profiles")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;
  return { uid: profile.id, email: profile.email ?? email.trim().toLowerCase(), role: profile.role === "admin" ? "admin" : "staff" };
}
