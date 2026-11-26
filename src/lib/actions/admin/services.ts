"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import {
  createService,
  updateService,
  setServiceActive,
  getActiveServices,
  moveService,
  type ServiceInput,
} from "@/lib/data/services";
import { getServiceRecipes, replaceServiceRecipe } from "@/lib/data/service-products";

export async function createServiceAction(input: ServiceInput) {
  await requireAdmin();
  const service = await createService(input);
  revalidatePath("/admin/servicos");
  return service;
}

export async function updateServiceAction(id: string, input: Partial<ServiceInput>) {
  await requireAdmin();
  const service = await updateService(id, input);
  revalidatePath("/admin/servicos");
  return service;
}

export async function setServiceActiveAction(id: string, isActive: boolean) {
  await requireAdmin();
  const service = await setServiceActive(id, isActive);
  revalidatePath("/admin/servicos");
  return service;
}

export async function moveServiceAction(id: string, direction: "up" | "down") {
  await requireAdmin();
  await moveService(id, direction);
  revalidatePath("/admin/servicos");
  revalidatePath("/");
}

export async function listActiveServicesAction() {
  await requireAdmin();
  return getActiveServices();
}

export async function getServiceRecipesAction() {
  await requireAdmin();
  return getServiceRecipes();
}

export async function saveServiceRecipeAction(
  serviceId: string,
  lines: { productId: string; quantity: number }[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const clean = lines.map((l) => ({ productId: l.productId, quantity: Math.round(l.quantity * 1000) / 1000 }));
  if (clean.some((l) => !Number.isFinite(l.quantity) || l.quantity <= 0 || l.quantity > 1000)) {
    return { ok: false, error: "Quantidade inválida: use um número maior que zero (ex.: 0,5 para meia unidade)." };
  }
  if (new Set(clean.map((l) => l.productId)).size !== clean.length) {
    return { ok: false, error: "O mesmo produto aparece duas vezes." };
  }
  await replaceServiceRecipe(serviceId, clean);
  revalidatePath("/admin/servicos");
  return { ok: true };
}
