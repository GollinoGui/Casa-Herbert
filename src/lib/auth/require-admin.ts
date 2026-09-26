import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";

/**
 * Toda Server Action administrativa chama isto primeiro. O middleware protege
 * as páginas /admin, mas uma Server Action pode ser chamada por POST direto,
 * sem passar pela página — e as ações usam a chave secreta do Supabase.
 */
export async function requireAdmin(): Promise<{ email: string }> {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
  if (!session) throw new Error("Não autorizado.");
  return session;
}
