"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, createSessionToken, verifyAdminCredentials } from "@/lib/auth/session";

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

  if (!verifyAdminCredentials(email, password)) {
    return { error: "E-mail ou senha inválidos." };
  }

  const token = await createSessionToken(email);
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  const destination = next && next.startsWith("/admin") ? next : "/admin";
  redirect(destination);
}

export async function adminLogoutAction() {
  cookies().set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  redirect("/admin/login");
}
