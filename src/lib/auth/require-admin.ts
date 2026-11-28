import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";
import { getPanelProfile, type PanelUser } from "@/lib/data/team";

/**
 * Quem está usando o painel, lido de admin_profiles a cada requisição (uma
 * consulta só, pelo cache do React). Conta apagada ou sem ficha = null, mesmo
 * com cookie válido: é assim que remover um acesso vale na hora.
 */
export const getPanelUser = cache(async (): Promise<PanelUser | null> => {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;
  return getPanelProfile(session.uid);
});

/**
 * Para as actions que a secretária também usa (agenda, clientes, lista de espera).
 * O padrão continua sendo requireAdmin(): action nova nasce fechada para ela.
 */
export async function requireStaff(): Promise<PanelUser> {
  const user = await getPanelUser();
  if (!user) throw new Error("Não autorizado.");
  return user;
}

/**
 * Toda Server Action administrativa chama isto primeiro. O middleware protege
 * as páginas /admin, mas uma Server Action pode ser chamada por POST direto,
 * sem passar pela página — e as ações usam a chave secreta do Supabase.
 */
export async function requireAdmin(): Promise<PanelUser> {
  const user = await requireStaff();
  if (user.role !== "admin") throw new Error("Não autorizado.");
  return user;
}
