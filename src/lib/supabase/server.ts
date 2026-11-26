import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDemoMode } from "@/lib/demo/mode";
import { createDemoClient } from "@/lib/demo/client";

/**
 * Cliente com a chave secreta (service role) — ignora RLS, então só pode ser
 * importado por código que roda no servidor (src/lib/data, src/lib/auth,
 * Server Actions). A autorização do painel é feita antes, em requireAdmin().
 * As policies de 0002_rls_policies.sql continuam valendo para a chave pública.
 */

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  // Modo demonstração (src/lib/demo): dados de exemplo em memória, sem banco.
  if (isDemoMode()) return createDemoClient() as unknown as SupabaseClient;
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configurados.");
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // O fetch do Next 14 cacheia por padrão; sem isso as páginas seriam
    // geradas uma vez no build com os dados daquele momento.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  return client;
}

/** Lança o erro do Supabase (se houver) e devolve os dados já sem o wrapper. */
export function unwrap<R extends { data: unknown; error: { message: string } | null }>(
  result: R
): Extract<R, { error: null }>["data"] {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export const PG_EXCLUSION_VIOLATION = "23P01";
export const PG_UNIQUE_VIOLATION = "23505";

/**
 * Busca todas as linhas de uma consulta, página por página. O PostgREST corta a
 * resposta no limite de linhas do projeto (1000 por padrão) sem avisar, então
 * qualquer leitura que pode crescer sem teto (livro-caixa, vendas de um ano)
 * passa por aqui. A consulta precisa ter ordem estável (ex.: `.order("id")`),
 * senão as páginas podem repetir ou pular linhas.
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await page(rows.length, rows.length + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) return rows;
    rows.push(...data);
  }
}
