"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  listCustomerPackages,
  listServicePackages,
  saveServicePackage,
  sellPackage,
  consumePackageSession,
  type CustomerPackageFilters,
  type SellPackageInput,
} from "@/lib/data/packages";
import { isPaymentMethodEnabled } from "@/lib/data/finance-options";

const METHOD_OFF = "Esta forma de pagamento está desligada em Configurações. Escolha outra.";

function revalidatePackagePaths() {
  for (const path of [
    "/admin",
    "/admin/pacotes",
    "/admin/agenda",
    "/admin/agendamentos",
    "/admin/clientes",
    "/admin/vendas",
    "/admin/financeiro",
    "/admin/contas-a-receber",
    "/admin/relatorios",
  ]) {
    revalidatePath(path);
  }
}

const packageSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao pacote.").max(80, "Nome muito longo."),
  serviceId: z.string().uuid("Escolha o serviço."),
  sessions: z.number().int().min(2, "Um pacote tem pelo menos 2 sessões.").max(100, "Máximo de 100 sessões."),
  priceCents: z.number().int().min(0, "Valor inválido."),
  validDays: z.number().int().min(1).max(1095).nullable(),
  isActive: z.boolean(),
});

export async function listServicePackagesAction(onlyActive = false) {
  await requireAdmin();
  return listServicePackages(onlyActive);
}

export async function saveServicePackageAction(id: string | null, input: z.infer<typeof packageSchema>) {
  await requireAdmin();
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await saveServicePackage(id, parsed.data);
  revalidatePackagePaths();
  return { ok: true as const };
}

export async function listCustomerPackagesAction(filters?: CustomerPackageFilters) {
  await requireAdmin();
  return listCustomerPackages(filters);
}

export async function sellPackageAction(input: SellPackageInput) {
  await requireAdmin();
  if (input.payment && !(await isPaymentMethodEnabled(input.payment.method))) return { ok: false as const, error: METHOD_OFF };
  const result = await sellPackage(input);
  if (result.ok) revalidatePackagePaths();
  return result;
}

export async function consumePackageSessionAction(appointmentId: string, customerPackageId: string) {
  await requireAdmin();
  const result = await consumePackageSession(appointmentId, customerPackageId);
  if (result.ok) revalidatePackagePaths();
  return result;
}
