import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { isSiteEnabled, SITE_ONLY_ADMIN_PATHS } from "@/lib/site";

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

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
