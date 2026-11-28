"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  createPanelUser,
  deletePanelUser,
  saveProfessional,
  setPanelUserPassword,
  updatePanelUser,
} from "@/lib/data/team";

type Result = { ok: true } | { ok: false; error: string };

const nameSchema = z.string().trim().min(2, "Informe o nome.").max(80, "Nome muito longo.");
const passwordSchema = z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(72, "Senha muito longa.");
const roleSchema = z.enum(["admin", "staff"]);

const newUserSchema = z.object({
  name: nameSchema,
  email: z.string().trim().email("E-mail inválido."),
  password: passwordSchema,
  role: roleSchema,
});

const firstError = (error: z.ZodError) => error.issues[0]?.message ?? "Dados inválidos.";

function revalidateTeam() {
  revalidatePath("/admin/configuracoes");
}

export async function createPanelUserAction(input: z.infer<typeof newUserSchema>): Promise<Result> {
  await requireAdmin();
  const parsed = newUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const result = await createPanelUser(parsed.data);
  revalidateTeam();
  return result;
}

export async function updatePanelUserAction(id: string, input: { name: string; role: "admin" | "staff" }): Promise<Result> {
  const me = await requireAdmin();
  const parsed = z.object({ name: nameSchema, role: roleSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  // Rebaixar a si mesmo trancaria a pessoa fora desta tela no meio do uso.
  if (id === me.id && parsed.data.role !== "admin") return { ok: false, error: "Você não pode tirar o seu próprio acesso de administrador." };
  const result = await updatePanelUser(id, parsed.data);
  revalidateTeam();
  return result;
}

export async function setPanelUserPasswordAction(id: string, password: string): Promise<Result> {
  await requireAdmin();
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  return setPanelUserPassword(id, parsed.data);
}

export async function deletePanelUserAction(id: string): Promise<Result> {
  const me = await requireAdmin();
  if (id === me.id) return { ok: false, error: "Você não pode remover o seu próprio acesso." };
  const result = await deletePanelUser(id);
  revalidateTeam();
  return result;
}

export async function saveProfessionalAction(id: string | null, input: { name: string; isActive: boolean }): Promise<Result> {
  await requireAdmin();
  const parsed = z.object({ name: nameSchema, isActive: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const result = await saveProfessional(id, parsed.data);
  revalidateTeam();
  revalidatePath("/admin/comissoes");
  return result;
}
