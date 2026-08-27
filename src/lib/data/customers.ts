import { randomUUID } from "node:crypto";
import type { Customer } from "@/types";
import { normalizePhone } from "@/lib/utils/phone";
import { mutateDb, readDb } from "./store";

export async function getCustomers(): Promise<Customer[]> {
  const db = readDb();
  return [...db.customers].sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const db = readDb();
  return db.customers.find((c) => c.id === id) ?? null;
}

export interface FindOrCreateCustomerInput {
  fullName: string;
  phone: string;
  email?: string | null;
}

/** Deduplica por telefone normalizado — não representa login, só evita registros repetidos. */
export async function findOrCreateCustomer(input: FindOrCreateCustomerInput): Promise<Customer> {
  return mutateDb((db) => {
    const normalizedPhone = normalizePhone(input.phone);
    const existing = db.customers.find((c) => c.normalizedPhone === normalizedPhone);
    const now = new Date().toISOString();
    if (existing) {
      existing.fullName = input.fullName;
      if (input.email) existing.email = input.email;
      existing.updatedAt = now;
      return existing;
    }
    const customer: Customer = {
      id: randomUUID(),
      fullName: input.fullName,
      phone: input.phone,
      normalizedPhone,
      email: input.email || null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    };
    db.customers.push(customer);
    return customer;
  });
}

export async function updateCustomerNotes(id: string, notes: string): Promise<Customer | null> {
  return mutateDb((db) => {
    const customer = db.customers.find((c) => c.id === id);
    if (!customer) return null;
    customer.notes = notes;
    customer.updatedAt = new Date().toISOString();
    return customer;
  });
}
