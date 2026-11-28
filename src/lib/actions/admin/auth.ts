"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { REMEMBER_TTL_SECONDS, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, createSessionToken } from "@/lib/auth/session";
import { verifyAdminCredentials } from "@/lib/auth/credentials";

export interface AdminLoginState {
  error?: string;
}

export async function adminLoginAction(
  prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const remember = formData.get("remember") === "on";

  const session = await verifyAdminCredentials(email, password);
  if (!session) {
    return { error: "E-mail ou senha inválidos." };
  }

  // Sem "lembrar", o cookie é de sessão (some ao fechar o navegador) e o token vale 8h.
  const token = await createSessionToken(session, remember ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS);
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_TTL_SECONDS } : {}),
  });

  const destination = next && next.startsWith("/admin") ? next : "/admin";
  redirect(destination);
}

export async function adminLogoutAction() {
  cookies().set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  redirect("/admin/login");
}
