import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "@/lib/auth/session";
import { canAccessPath, type PanelRole } from "@/lib/auth/permissions";
import { isSiteEnabled, SITE_ONLY_ADMIN_PATHS } from "@/lib/site";
import { isDemoMode } from "@/lib/demo/mode";

/**
 * Papel atual da pessoa, direto do banco (REST do Supabase, sem o supabase-js no
 * bundle do middleware). null = sem ficha em admin_profiles: acesso removido.
 * No modo demonstração o banco em memória não existe aqui (o middleware roda
 * num sandbox à parte), então vale o papel gravado no cookie.
 */
async function currentRole(session: SessionPayload): Promise<PanelRole | null> {
  if (isDemoMode()) return session.role;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/admin_profiles?select=role&id=eq.${encodeURIComponent(session.uid)}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`admin_profiles: ${res.status}`);
  const rows = (await res.json()) as { role: string }[];
  if (!rows.length) return null;
  return rows[0].role === "admin" ? "admin" : "staff";
}

/**
 * Também propaga o pathname atual como header (`x-pathname`) para que o root
 * layout (Server Component) saiba quando NÃO renderizar o Header/Footer/
 * WhatsApp públicos — ele não tem acesso direto à URL da requisição.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Por enquanto o cliente usa só o painel. Com SITE_ENABLED diferente de "true", as
  // páginas públicas levam para o painel (arquivos com extensão, como fotos, seguem servidos).
  if (!isSiteEnabled()) {
    const isPublicPage = !pathname.startsWith("/admin") && !/\.[a-z0-9]+$/i.test(pathname);
    const isSiteOnlyAdmin = SITE_ONLY_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (isPublicPage || isSiteOnlyAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return response;
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  const role = session ? await currentRole(session) : null;

  if (!session || !role) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    if (session) redirect.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return redirect;
  }

  // Secretária fora das páginas dela volta para a agenda (inclui as requisições RSC, que pulam o layout).
  if (!canAccessPath(role, pathname)) {
    return NextResponse.redirect(new URL("/admin/agenda", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
