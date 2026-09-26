import { createClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/server";

/**
 * Confere e-mail/senha no Supabase Auth e exige uma linha em admin_profiles —
 * ter conta no Auth não basta para entrar no painel.
 *
 * Usa um cliente descartável: signInWithPassword guarda a sessão do usuário no
 * cliente, e no cliente compartilhado isso trocaria a chave secreta pelo JWT
 * do usuário nas consultas seguintes.
 */
export async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !email || !password) return false;

  const authClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) return false;

  const { data: profile } = await getSupabase()
    .from("admin_profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  return !!profile;
}
