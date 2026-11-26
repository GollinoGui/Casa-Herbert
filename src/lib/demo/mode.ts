/**
 * Modo demonstração: o painel roda com dados de exemplo em memória, sem Supabase.
 * Liga com DEMO_MODE=true no .env, só em desenvolvimento. Para voltar ao banco
 * de verdade: tirar a variável (e, quando quiser, apagar src/lib/demo).
 *
 * Falha fechada: em build de produção ou na Vercel o modo demo derruba a
 * aplicação em vez de servir dados falsos atrás do login de verdade.
 */
export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE !== "true") return false;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("DEMO_MODE=true não é permitido em produção. Remova a variável do ambiente.");
  }
  return true;
}

export const DEMO_LOGIN = { email: "demo@casaherbert.com.br", password: "demo1234" };
