import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildSeedData, type MockDatabase } from "./seed-data";

/**
 * Camada de persistência do protótipo: JSON em disco (.mockdata/db.json,
 * gitignored). Roda apenas em runtime Node (Server Components/Actions),
 * nunca no Edge. Quando o Supabase for conectado, os módulos de
 * src/lib/data/*.ts trocam a implementação interna mantendo as mesmas
 * assinaturas — ver documentação.md > Roadmap.
 */

const DB_DIR = path.join(process.cwd(), ".mockdata");
const DB_FILE = path.join(DB_DIR, "db.json");

function ensureDb(): MockDatabase {
  if (!existsSync(DB_FILE)) {
    mkdirSync(DB_DIR, { recursive: true });
    const seed = buildSeedData();
    writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), "utf-8");
    return seed;
  }
  const raw = readFileSync(DB_FILE, "utf-8");
  return JSON.parse(raw) as MockDatabase;
}

export function readDb(): MockDatabase {
  return ensureDb();
}

export function writeDb(db: MockDatabase): void {
  mkdirSync(DB_DIR, { recursive: true });
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

/** Lê, aplica `mutate` e persiste — usar para toda escrita, evita esquecer o writeDb. */
export function mutateDb<T>(mutate: (db: MockDatabase) => T): T {
  const db = readDb();
  const result = mutate(db);
  writeDb(db);
  return result;
}

export function resetDb(): MockDatabase {
  const seed = buildSeedData();
  writeDb(seed);
  return seed;
}
