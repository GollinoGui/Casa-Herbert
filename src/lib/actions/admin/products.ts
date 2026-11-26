"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import {
  createProduct,
  updateProduct,
  setProductActive,
  getActiveProducts,
  getAllProducts,
  getProductByBarcode,
  type ProductInput,
} from "@/lib/data/products";

/** Ação recebe o input direto do cliente: o mínimo de estoque é o único campo novo sem validação no data. */
function invalidMinStock(input: Partial<ProductInput>) {
  return input.minStock !== undefined && input.minStock !== null && (!Number.isInteger(input.minStock) || input.minStock < 0);
}

function revalidateProductPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/estoque");
  revalidatePath("/produtos");
  revalidatePath("/");
}

export async function createProductAction(input: ProductInput) {
  await requireAdmin();
  if (invalidMinStock(input)) return { ok: false as const, error: "Estoque mínimo inválido." };
  const result = await createProduct(input);
  revalidateProductPaths();
  return result;
}

export async function updateProductAction(id: string, input: Partial<ProductInput>) {
  await requireAdmin();
  if (invalidMinStock(input)) return { ok: false as const, error: "Estoque mínimo inválido." };
  const result = await updateProduct(id, input);
  revalidateProductPaths();
  return result;
}

export async function setProductActiveAction(id: string, isActive: boolean) {
  await requireAdmin();
  const result = await setProductActive(id, isActive);
  revalidateProductPaths();
  return result;
}

export async function listActiveProductsAction() {
  await requireAdmin();
  return getActiveProducts();
}

export async function listAllProductsAction() {
  await requireAdmin();
  return getAllProducts();
}

export async function findProductByBarcodeAction(barcode: string) {
  await requireAdmin();
  return getProductByBarcode(barcode);
}
