// Entrada do worker: o handler gerado pelo OpenNext + um cron diário que consulta o banco.
// O Supabase grátis pausa o projeto após 7 dias sem requisições externas (pg_cron e
// triggers internos não contam), então o ping precisa vir de fora.

// @ts-expect-error: gerado pelo `opennextjs-cloudflare build`, resolvido pelo wrangler
import handler from "./.open-next/worker.js";

// @ts-expect-error: gerado pelo `opennextjs-cloudflare build`, resolvido pelo wrangler
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

type Env = { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string };
type Ctx = { waitUntil(promise: Promise<unknown>): void };

async function pingSupabase(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("keep-alive: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes");
    return;
  }
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/settings?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    throw new Error(`keep-alive: Supabase respondeu ${res.status} ${await res.text()}`);
  }
  console.log("keep-alive: ok");
}

const worker = {
  fetch: handler.fetch,
  async scheduled(_event: unknown, env: Env, ctx: Ctx) {
    ctx.waitUntil(pingSupabase(env));
  },
};

export default worker;
