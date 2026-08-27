"use server";

import { revalidatePath } from "next/cache";
import { createService, updateService, setServiceActive, type ServiceInput } from "@/lib/data/services";

export async function createServiceAction(input: ServiceInput) {
  const service = await createService(input);
  revalidatePath("/admin/servicos");
  return service;
}

export async function updateServiceAction(id: string, input: Partial<ServiceInput>) {
  const service = await updateService(id, input);
  revalidatePath("/admin/servicos");
  return service;
}

export async function setServiceActiveAction(id: string, isActive: boolean) {
  const service = await setServiceActive(id, isActive);
  revalidatePath("/admin/servicos");
  return service;
}
