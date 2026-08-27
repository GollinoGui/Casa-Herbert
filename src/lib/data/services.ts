import { randomUUID } from "node:crypto";
import type { Service } from "@/types";
import { mutateDb, readDb } from "./store";

export async function getActiveServices(): Promise<Service[]> {
  const db = readDb();
  return db.services.filter((s) => s.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function getAllServices(): Promise<Service[]> {
  const db = readDb();
  return [...db.services].sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function getServiceById(id: string): Promise<Service | null> {
  const db = readDb();
  return db.services.find((s) => s.id === id) ?? null;
}

export interface ServiceInput {
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number | null;
  isActive: boolean;
}

const DIACRITICS_REGEX = /[̀-ͯ]/g;

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createService(input: ServiceInput): Promise<Service> {
  return mutateDb((db) => {
    const now = new Date().toISOString();
    const service: Service = {
      id: randomUUID(),
      name: input.name,
      slug: slugify(input.name),
      description: input.description,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents ?? null,
      isActive: input.isActive,
      displayOrder: db.services.length + 1,
      createdAt: now,
      updatedAt: now,
    };
    db.services.push(service);
    return service;
  });
}

export async function updateService(id: string, input: Partial<ServiceInput>): Promise<Service | null> {
  return mutateDb((db) => {
    const service = db.services.find((s) => s.id === id);
    if (!service) return null;
    Object.assign(service, input, {
      slug: input.name ? slugify(input.name) : service.slug,
      updatedAt: new Date().toISOString(),
    });
    return service;
  });
}

export async function setServiceActive(id: string, isActive: boolean): Promise<Service | null> {
  return updateService(id, { isActive });
}
