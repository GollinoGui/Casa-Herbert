"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import {
  createProduct,
  updateProduct,
  setProductActive,
  getActiveProducts,
  type ProductInput,
} from "@/lib/data/products";

export async function createProductAction(input: ProductInput) {
  await requireAdmin();
  const product = await createProduct(input);
  revalidatePath("/admin/estoque");
  return product;
}

export async function updateProductAction(id: string, input: Partial<ProductInput>) {
  await requireAdmin();
  const product = await updateProduct(id, input);
  revalidatePath("/admin/estoque");
  return product;
}

export async function setProductActiveAction(id: string, isActive: boolean) {
  await requireAdmin();
  const product = await setProductActive(id, isActive);
  revalidatePath("/admin/estoque");
  return product;
}

export async function listActiveProductsAction() {
  await requireAdmin();
  return getActiveProducts();
}
