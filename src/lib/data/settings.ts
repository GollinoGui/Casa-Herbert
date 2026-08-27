import type { Settings } from "@/types";
import { mutateDb, readDb } from "./store";

export async function getSettings(): Promise<Settings> {
  const db = readDb();
  return db.settings;
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  return mutateDb((db) => {
    db.settings = { ...db.settings, ...partial };
    return db.settings;
  });
}
