"use server";

import { requireStaff } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { createBlockedSlot, deleteBlockedSlot, type CreateBlockedSlotInput } from "@/lib/data/blocked-slots";

export async function createBlockedSlotAction(input: CreateBlockedSlotInput) {
  await requireStaff();
  const result = await createBlockedSlot(input);
  revalidatePath("/admin/bloqueios");
  revalidatePath("/admin/agenda");
  return result;
}

export async function deleteBlockedSlotAction(id: string) {
  await requireStaff();
  await deleteBlockedSlot(id);
  revalidatePath("/admin/bloqueios");
  revalidatePath("/admin/agenda");
}
