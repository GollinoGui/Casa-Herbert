import { randomUUID } from "node:crypto";
import type { Appointment, PaymentMethod, Sale, SaleItem } from "@/types";
import { mutateDb, readDb } from "./store";

export interface CheckoutProductLineInput {
  productId: string;
  quantity: number;
}

export interface CheckoutInput {
  appointmentId?: string | null;
  customerId?: string | null;
  serviceLine?: { unitPriceCents: number } | null;
  productLines: CheckoutProductLineInput[];
  paymentMethod: PaymentMethod;
  notes?: string | null;
}

export type CheckoutResult = { ok: true; sale: Sale } | { ok: false; error: string };

/**
 * Operação atômica dentro de um único mutateDb(): valida TODAS as linhas de produto
 * (existe, ativo, estoque suficiente) antes de decrementar qualquer uma — evita baixa
 * parcial de estoque se uma linha no meio da lista falhar a validação.
 */
export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  return mutateDb((db) => {
    let appointment: Appointment | null = null;
    if (input.appointmentId) {
      appointment = db.appointments.find((a) => a.id === input.appointmentId) ?? null;
      if (!appointment) return { ok: false, error: "Agendamento não encontrado." };
      if (appointment.status !== "CONFIRMED") {
        return { ok: false, error: "Só é possível finalizar atendimentos confirmados." };
      }
    }

    const items: SaleItem[] = [];

    if (appointment) {
      const service = db.services.find((s) => s.id === appointment!.serviceId);
      if (!service) return { ok: false, error: "Serviço indisponível." };
      const unitPriceCents = input.serviceLine?.unitPriceCents ?? appointment.priceCents;
      if (unitPriceCents == null) {
        return { ok: false, error: "Informe o valor do serviço antes de finalizar." };
      }
      items.push({
        type: "service",
        refId: service.id,
        description: service.name,
        unitPriceCents,
        quantity: 1,
        totalCents: unitPriceCents,
      });
    }

    for (const line of input.productLines) {
      if (line.quantity <= 0) return { ok: false, error: "Quantidade inválida." };
      const product = db.products.find((p) => p.id === line.productId);
      if (!product || !product.isActive) return { ok: false, error: "Produto indisponível." };
      if (product.stockQuantity < line.quantity) {
        return { ok: false, error: `Estoque insuficiente para "${product.name}".` };
      }
    }

    for (const line of input.productLines) {
      const product = db.products.find((p) => p.id === line.productId)!;
      product.stockQuantity -= line.quantity;
      product.updatedAt = new Date().toISOString();
      items.push({
        type: "product",
        refId: product.id,
        description: product.name,
        unitPriceCents: product.priceCents,
        quantity: line.quantity,
        totalCents: product.priceCents * line.quantity,
      });
    }

    if (items.length === 0) {
      return { ok: false, error: "Nenhum item para finalizar a venda." };
    }

    const totalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
    const now = new Date().toISOString();
    const sale: Sale = {
      id: randomUUID(),
      appointmentId: appointment?.id ?? null,
      customerId: appointment?.customerId ?? input.customerId ?? null,
      items,
      totalCents,
      paymentMethod: input.paymentMethod,
      notes: input.notes || null,
      createdAt: now,
    };
    db.sales.push(sale);

    if (appointment) {
      appointment.status = "COMPLETED";
      appointment.priceCents = items[0].unitPriceCents;
      appointment.updatedAt = now;
    }

    return { ok: true, sale };
  });
}

export async function listSales(filters?: { dateFrom?: string; dateTo?: string }): Promise<Sale[]> {
  const db = readDb();
  let items = [...db.sales];
  if (filters?.dateFrom) items = items.filter((s) => s.createdAt.slice(0, 10) >= filters.dateFrom!);
  if (filters?.dateTo) items = items.filter((s) => s.createdAt.slice(0, 10) <= filters.dateTo!);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
