"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getCustomers } from "@/lib/data/customers";
import { getAllProducts } from "@/lib/data/products";
import { getAllServices } from "@/lib/data/services";
import { matchesCustomerSearch } from "@/lib/utils/customer-search";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { matchesText } from "@/lib/utils/list-filters";

export interface SearchHit {
  kind: "cliente" | "produto" | "servico";
  id: string;
  title: string;
  detail: string;
  href: string;
}

const PER_KIND = 6;

/** Busca do Ctrl+K: clientes (nome, telefone, e-mail), produtos (nome, código) e serviços. */
export async function searchPanelAction(query: string): Promise<SearchHit[]> {
  await requireAdmin();
  const q = String(query ?? "").trim().slice(0, 80);
  if (q.length < 2) return [];
  const [customers, products, services] = await Promise.all([getCustomers(), getAllProducts(), getAllServices()]);
  return [
    ...customers
      .filter((c) => matchesCustomerSearch(c, q))
      .slice(0, PER_KIND)
      .map((c): SearchHit => ({
        kind: "cliente",
        id: c.id,
        title: c.fullName,
        detail: formatPhoneDisplay(c.phone),
        href: `/admin/clientes?cliente=${c.id}`,
      })),
    ...products
      .filter((p) => matchesText(q, p.name, p.barcode))
      .slice(0, PER_KIND)
      .map((p): SearchHit => ({
        kind: "produto",
        id: p.id,
        title: p.name,
        detail: `${p.stockQuantity} em estoque${p.isActive ? "" : " · desativado"}`,
        href: `/admin/estoque?cliente=${encodeURIComponent(p.name)}`,
      })),
    ...services
      .filter((s) => matchesText(q, s.name))
      .slice(0, PER_KIND)
      .map((s): SearchHit => ({
        kind: "servico",
        id: s.id,
        title: s.name,
        detail: `${s.durationMinutes} min${s.isActive ? "" : " · desativado"}`,
        href: "/admin/servicos",
      })),
  ];
}
