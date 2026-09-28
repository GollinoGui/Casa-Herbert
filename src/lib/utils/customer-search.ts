import type { Customer } from "@/types";
import { canonicalPhone } from "@/lib/utils/phone";

/** Busca por nome, e-mail ou telefone (qualquer formato, com ou sem 55). */
export function matchesCustomerSearch(customer: Customer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return (
    customer.fullName.toLowerCase().includes(q) ||
    (digits.length >= 3 && customer.normalizedPhone.includes(canonicalPhone(digits))) ||
    (customer.email?.toLowerCase().includes(q) ?? false)
  );
}
