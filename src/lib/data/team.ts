import { getSupabase, unwrap } from "@/lib/supabase/server";
import type { PanelRole } from "@/lib/auth/permissions";
import type { Professional } from "@/types";

export interface PanelUser {
  id: string;
  name: string;
  email: string;
  role: PanelRole;
}

type TeamResult = { ok: true } | { ok: false; error: string };

const toPanelUser = (r: Record<string, any>): PanelUser => ({
  id: r.id,
  name: r.full_name,
  email: r.email ?? "",
  role: r.role === "admin" ? "admin" : "staff",
});

export async function getPanelProfile(id: string): Promise<PanelUser | null> {
  const row = unwrap(
    await getSupabase().from("admin_profiles").select("id, full_name, email, role").eq("id", id).maybeSingle()
  );
  return row ? toPanelUser(row) : null;
}

export async function listPanelUsers(): Promise<PanelUser[]> {
  const rows = unwrap(await getSupabase().from("admin_profiles").select("id, full_name, email, role").order("created_at"));
  return rows.map(toPanelUser);
}

async function countAdmins(): Promise<number> {
  const rows = unwrap(await getSupabase().from("admin_profiles").select("id").eq("role", "admin"));
  return rows.length;
}

function authErrorMessage(message: string): string {
  if (/already|registered|exists/i.test(message)) return "Já existe uma conta com esse e-mail.";
  if (/password/i.test(message)) return "Senha fraca: use pelo menos 8 caracteres.";
  return "Não foi possível salvar o acesso. Tente de novo.";
}

/** Cria a conta no Supabase Auth e a ficha em admin_profiles; se a ficha falhar, desfaz a conta. */
export async function createPanelUser(input: { name: string; email: string; password: string; role: PanelRole }): Promise<TeamResult> {
  const supabase = getSupabase();
  const email = input.email.trim().toLowerCase();
  const { data, error } = await supabase.auth.admin.createUser({ email, password: input.password, email_confirm: true });
  if (error || !data.user) return { ok: false, error: authErrorMessage(error?.message ?? "") };

  const { error: profileError } = await supabase
    .from("admin_profiles")
    .insert({ id: data.user.id, full_name: input.name.trim(), email, role: input.role });
  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    return { ok: false, error: "Não foi possível salvar o acesso. Tente de novo." };
  }
  return { ok: true };
}

export async function updatePanelUser(id: string, patch: { name: string; role: PanelRole }): Promise<TeamResult> {
  const current = await getPanelProfile(id);
  if (!current) return { ok: false, error: "Acesso não encontrado." };
  if (current.role === "admin" && patch.role !== "admin" && (await countAdmins()) <= 1) {
    return { ok: false, error: "É preciso ter pelo menos um administrador." };
  }
  const { error } = await getSupabase().from("admin_profiles").update({ full_name: patch.name.trim(), role: patch.role }).eq("id", id);
  if (error) return { ok: false, error: error.message.includes("LAST_ADMIN") ? "É preciso ter pelo menos um administrador." : error.message };
  return { ok: true };
}

export async function setPanelUserPassword(id: string, password: string): Promise<TeamResult> {
  const { error } = await getSupabase().auth.admin.updateUserById(id, { password });
  return error ? { ok: false, error: authErrorMessage(error.message) } : { ok: true };
}

/** Apaga a conta do Auth; a ficha sai junto pelo cascade, e a sessão aberta cai na próxima requisição. */
export async function deletePanelUser(id: string): Promise<TeamResult> {
  const current = await getPanelProfile(id);
  if (!current) return { ok: false, error: "Acesso não encontrado." };
  if (current.role === "admin" && (await countAdmins()) <= 1) {
    return { ok: false, error: "É preciso ter pelo menos um administrador." };
  }
  const { error } = await getSupabase().auth.admin.deleteUser(id);
  if (error) return { ok: false, error: /LAST_ADMIN/.test(error.message) ? "É preciso ter pelo menos um administrador." : "Não foi possível remover o acesso." };
  return { ok: true };
}

export async function listAllProfessionals(): Promise<Professional[]> {
  const rows = unwrap(await getSupabase().from("professionals").select("*").order("created_at"));
  return rows.map((r) => ({ id: r.id, name: r.name, isActive: r.is_active }));
}

export async function saveProfessional(id: string | null, input: { name: string; isActive: boolean }): Promise<TeamResult> {
  const supabase = getSupabase();
  const row = { name: input.name.trim(), is_active: input.isActive };
  if (!id) {
    unwrap(await supabase.from("professionals").insert(row));
    return { ok: true };
  }
  if (!input.isActive) {
    // O agendamento sem profissional cai no primeiro ativo: desativar o último deixaria a agenda sem ninguém.
    const active = unwrap(await supabase.from("professionals").select("id").eq("is_active", true));
    if (active.every((p) => p.id === id)) return { ok: false, error: "Deixe pelo menos um profissional ativo." };
  }
  unwrap(await supabase.from("professionals").update(row).eq("id", id));
  return { ok: true };
}
