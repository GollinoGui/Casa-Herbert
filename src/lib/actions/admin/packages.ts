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
  getCustomerPackage,
  schedulePackageSessions,
  cancelPackageSession,
  reopenPackageSession,
  recordPastPackageSession,
  extendPackageValidity,
  type CustomerPackageFilters,
  type SellPackageInput,
} from "@/lib/data/packages";
import { checkPackageSessionSlots } from "@/lib/data/availability";
import { isPaymentMethodEnabled } from "@/lib/data/finance-options";
import { todayDateStr } from "@/lib/utils/date-format";

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

const sessionsSchema = z
  .array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
    })
  )
  .min(1, "Escolha ao menos uma data.")
  .max(100, "Datas demais de uma vez.");

export async function getCustomerPackageAction(id: string) {
  await requireAdmin();
  return getCustomerPackage(id);
}

/** Confere cada data da série antes de gravar: null = livre. */
export async function checkPackageSessionSlotsAction(customerPackageId: string, sessions: { date: string; startTime: string }[]) {
  await requireAdmin();
  const parsed = sessionsSchema.safeParse(sessions);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datas inválidas." };
  const pkg = await getCustomerPackage(customerPackageId);
  if (!pkg) return { ok: false as const, error: "Pacote não encontrado." };
  return { ok: true as const, problems: await checkPackageSessionSlots(pkg.serviceId, parsed.data) };
}

export async function schedulePackageSessionsAction(customerPackageId: string, sessions: { date: string; startTime: string }[]) {
  await requireAdmin();
  const parsed = sessionsSchema.safeParse(sessions);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datas inválidas." };
  const pkg = await getCustomerPackage(customerPackageId);
  if (!pkg) return { ok: false as const, error: "Pacote não encontrado." };
  const problems = await checkPackageSessionSlots(pkg.serviceId, parsed.data);
  if (problems.some(Boolean)) return { ok: false as const, error: "SLOT_NO_LONGER_AVAILABLE" };
  const result = await schedulePackageSessions(customerPackageId, parsed.data);
  if (result.ok) revalidatePackagePaths();
  return result;
}

const pastSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
  professionalId: z.string().min(1).max(64, "Profissional inválido.").nullable().optional(),
  consumeStock: z.boolean(),
  notes: z.string().trim().max(500, "Observação muito longa.").optional(),
});

export async function recordPastPackageSessionAction(customerPackageId: string, input: z.infer<typeof pastSessionSchema>) {
  await requireAdmin();
  const parsed = pastSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (parsed.data.date > todayDateStr()) {
    return { ok: false as const, error: 'Essa data ainda não chegou. Para sessão futura, use "Agendar sessões".' };
  }
  const result = await recordPastPackageSession(customerPackageId, parsed.data);
  if (result.ok) revalidatePackagePaths();
  return result;
}

const outcomeSchema =z.enum(["counted", "returned"], { message: "Escolha se a sessão conta ou volta para o pacote." });

export async function cancelPackageSessionAction(appointmentId: string, outcome: "counted" | "returned", noShow: boolean, reason?: string) {
  await requireAdmin();
  const parsed = outcomeSchema.safeParse(outcome);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Escolha inválida." };
  const result = await cancelPackageSession(appointmentId, parsed.data, noShow === true, reason?.trim().slice(0, 500) || undefined);
  if (result.ok) revalidatePackagePaths();
  return result;
}

export async function reopenPackageSessionAction(appointmentId: string) {
  await requireAdmin();
  const result = await reopenPackageSession(appointmentId);
  if (result.ok) revalidatePackagePaths();
  return result;
}

export async function extendPackageValidityAction(customerPackageId: string, expiresOn: string) {
  await requireAdmin();
  const parsed = z
    .object({ id: z.string().min(1, "Pacote inválido.").max(64), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.") })
    .safeParse({ id: customerPackageId, date: expiresOn });
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const result = await extendPackageValidity(parsed.data.id, parsed.data.date, todayDateStr());
  if (result.ok) revalidatePackagePaths();
  return result;
}
