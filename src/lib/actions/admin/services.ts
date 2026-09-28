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
