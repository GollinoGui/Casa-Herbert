/**
 * Sessão do admin — cookie assinado com HMAC via Web Crypto (funciona igual em
 * middleware/Edge e em Server Actions/Node), sem libs extras. A senha em si é
 * conferida no Supabase Auth (ver credentials.ts); este arquivo só cuida do
 * cookie depois que o login deu certo.
 */

export const SESSION_COOKIE_NAME = "ch_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
export const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30;

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padLength = (4 - (str.length % 4)) % 4;
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function getSigningKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export type PanelRole = "admin" | "staff";

/**
 * `role` vai no cookie só para o modo demonstração: lá o middleware roda num
 * sandbox separado e não enxerga o banco em memória. Fora dele, o papel sempre
 * vem de admin_profiles (middleware e requireAdmin/requireStaff).
 */
export interface SessionPayload {
  uid: string;
  email: string;
  role: PanelRole;
}

export async function createSessionToken(session: SessionPayload, ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado no .env");

  const payload = JSON.stringify({ ...session, exp: Date.now() + ttlSeconds * 1000 });
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = base64UrlEncode(new Uint8Array(signature));
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  try {
    const key = await getSigningKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(sigB64) as BufferSource,
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as Partial<SessionPayload> & {
      exp: number;
    };
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    // Cookie de antes dos papéis (só e-mail): recusado de propósito, a pessoa entra de novo.
    if (typeof payload.uid !== "string" || !payload.uid) return null;
    return { uid: payload.uid, email: String(payload.email ?? ""), role: payload.role === "admin" ? "admin" : "staff" };
  } catch {
    return null;
  }
}
