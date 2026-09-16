"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct,
  updateProduct,
  setProductActive,
  getActiveProducts,
  type ProductInput,
} from "@/lib/data/products";

export async function createProductAction(input: ProductInput) {
  const product = await createProduct(input);
  revalidatePath("/admin/estoque");
  return product;
}

export async function updateProductAction(id: string, input: Partial<ProductInput>) {
  const product = await updateProduct(id, input);
  revalidatePath("/admin/estoque");
  return product;
}

export async function setProductActiveAction(id: string, isActive: boolean) {
  const product = await setProductActive(id, isActive);
  revalidatePath("/admin/estoque");
  return product;
}

export async function listActiveProductsAction() {
  return getActiveProducts();
}
