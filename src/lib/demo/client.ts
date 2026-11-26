import { canonicalPhone } from "@/lib/utils/phone";
import { todayDateStr } from "@/lib/utils/date-format";
import { buildSeed, type Row, type Tables } from "@/lib/demo/seed";
import { runRpc } from "@/lib/demo/rpc";

/**
 * Imitação em memória do subconjunto do supabase-js que src/lib/data usa.
 * Não é um Postgres: cobre só os padrões do app e lança erro claro para o resto
 * ("modo demonstração não suporta ..."), em vez de devolver algo meio certo.
 *
 * Os dados vivem em globalThis para sobreviver ao hot reload do `next dev`;
 * reiniciar o servidor volta aos dados de exemplo.
 */

export interface PgError {
  message: string;
  code?: string;
}

interface Result {
  data: any;
  error: PgError | null;
  count: number | null;
  status: number;
  statusText: string;
}

const g = globalThis as unknown as { __demoDb?: Tables };
let backfilled = false;
export function db(): Tables {
  if (!g.__demoDb) {
    g.__demoDb = buildSeed();
    backfilled = true;
  } else if (!backfilled) {
    // Hot reload com tabela nova no seed: os dados em memória são de antes dela.
    for (const [table, rows] of Object.entries(buildSeed())) g.__demoDb[table] ??= rows;
    backfilled = true;
  }
  return g.__demoDb;
}

export class DemoUnsupported extends Error {
  constructor(what: string) {
    super(`Modo demonstração não suporta ${what}.`);
  }
}

const clone = <T,>(v: T): T => (v === undefined ? v : structuredClone(v));
const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Regras de tabela (o que o Postgres faria por default, generated, constraint)
// ---------------------------------------------------------------------------

const PRIMARY_KEY: Record<string, string> = {
  settings: "id",
  payable_categories: "slug",
  site_image_slots: "slot_key",
};
const pk = (table: string) => PRIMARY_KEY[table] ?? "id";

const DEFAULTS: Record<string, () => Row> = {
  appointments: () => ({ status: "PENDING", discount_cents: 0, reminder_sent_at: null, customer_package_id: null, customer_notes: null, admin_notes: null, confirmed_at: null, cancelled_at: null, professional_id: null }),
  customers: () => ({ email: null, notes: null, birth_date: null, photo_consent_at: null }),
  services: () => ({ description: null, price_cents: null, is_active: true, display_order: 0, image_id: null, image_position: null, show_on_home: true, barcode: null, return_days: null }),
  products: () => ({ stock_quantity: 0, open_usage: 0, min_stock: null, is_active: true, barcode: null, cost_cents: null, description: null, image_id: null, image_position: null, show_on_site: false }),
  blocked_slots: () => ({ is_full_day: true, start_time: null, end_time: null, notes: null, created_by: null }),
  testimonials: () => ({ rating: null, is_published: false, display_order: 0 }),
  gallery: () => ({ image_url: null, storage_path: null, caption: null, category: null, is_published: true, display_order: 0, media_id: null }),
  media: () => ({ storage_path: null, alt: null, width: null, height: null }),
  special_hours: () => ({ is_closed: false, reason: null }),
  payables: () => ({ category: "outros", supplier: null, status: "open", paid_on: null, payment_method: null, recurring_bill_id: null, competence: null, purchase_id: null, notes: null }),
  recurring_bills: () => ({ category: "outros", supplier: null, is_active: true, starts_on: todayDateStr() }),
  payable_categories: () => ({ active: true, sort_order: 0 }),
  cash_entries: () => ({ payment_method: null, sale_id: null, payable_id: null, customer_id: null, receipt_txid: null, reversal_of: null }),
  business_hours: () => ({ is_active: true }),
  site_image_slots: () => ({ object_position: null }),
  sales: () => ({ appointment_id: null, customer_id: null, payment_method: null, notes: null, status: "paid", discount_cents: 0, paid_cents: 0, sale_date: todayDateStr(), due_date: null, paid_at: null, cancelled_at: null }),
  purchase_items: () => ({ product_id: null }),
  purchases: () => ({ supplier: null, notes: null }),
  service_packages: () => ({ valid_days: null, is_active: true }),
  customer_packages: () => ({ package_id: null, status: "active", expires_on: null }),
  cash_closings: () => ({ withdrawn_cents: 0, adjustment_entry_id: null, notes: null }),
  waitlist: () => ({ service_id: null, period: "any", notes: null, status: "waiting" }),
  customer_records: () => ({ appointment_id: null, notes: null }),
};

const NO_TIMESTAMPS = new Set(["business_hours", "special_hours_ranges", "sale_items", "purchase_items", "appointment_products", "service_products"]);
const HAS_UPDATED_AT = new Set(["waitlist", "services", "customers", "blocked_slots", "appointments", "settings", "products", "recurring_bills", "payables", "site_image_slots"]);

const UNIQUE: Record<string, string[][]> = {
  services: [["slug"]],
  products: [["barcode"]],
  special_hours: [["special_date"]],
  cash_entries: [["reversal_of"]],
  payables: [["recurring_bill_id", "competence"]],
  appointment_products: [["appointment_id", "product_id"]],
  service_products: [["service_id", "product_id"]],
  customer_packages: [["sale_id"]],
  customer_record_photos: [["storage_path"]],
};

/** Filhos apagados junto (on delete cascade) e referências zeradas (on delete set null). */
const ON_DELETE: Record<string, { cascade?: [string, string][]; setNull?: [string, string][] }> = {
  special_hours: { cascade: [["special_hours_ranges", "special_hours_id"]] },
  sales: { cascade: [["sale_items", "sale_id"]] },
  purchases: { cascade: [["purchase_items", "purchase_id"]] },
  appointments: { cascade: [["appointment_products", "appointment_id"]] },
  services: { cascade: [["service_products", "service_id"]] },
  products: { cascade: [["service_products", "product_id"]] },
  media: {
    cascade: [["site_image_slots", "media_id"]],
    setNull: [["services", "image_id"], ["products", "image_id"], ["gallery", "media_id"]],
  },
  recurring_bills: { setNull: [["payables", "recurring_bill_id"]] },
  customers: { cascade: [["waitlist", "customer_id"], ["customer_records", "customer_id"]] },
  customer_records: { cascade: [["customer_record_photos", "record_id"]] },
  service_packages: { setNull: [["customer_packages", "package_id"]] },
};

/** Lado "um" das relações embutidas um-para-muitos: nome da FK no filho. */
const CHILD_FK: Record<string, string> = {
  sales: "sale_id",
  purchases: "purchase_id",
  special_hours: "special_hours_id",
  appointments: "appointment_id",
  customer_records: "record_id",
};

const TIME_RE = /^\d{2}:\d{2}$/;

function normalizeRow(table: string, row: Row): Row {
  for (const [k, v] of Object.entries(row)) {
    // Postgres devolve `time` como HH:mm:ss.
    if (k.endsWith("_time") && typeof v === "string" && TIME_RE.test(v)) row[k] = `${v}:00`;
  }
  if (table === "customers" && typeof row.phone === "string") row.normalized_phone = canonicalPhone(row.phone);
  return row;
}

function constraintError(table: string, row: Row, ignoreKey?: unknown): PgError | null {
  const rows = db()[table];
  const key = pk(table);
  for (const cols of UNIQUE[table] ?? []) {
    if (cols.some((c) => row[c] == null)) continue;
    const clash = rows.find((r) => r[key] !== ignoreKey && cols.every((c) => String(r[c]) === String(row[c])));
    if (clash) return { code: "23505", message: `duplicate key value violates unique constraint (${table}.${cols.join(",")})` };
  }
  if (table === "cash_entries" && ignoreKey !== undefined) {
    return { code: "P0001", message: "cash_entries é só de inserção: corrija com um estorno." };
  }
  if (table === "appointments" && (row.status === "PENDING" || row.status === "CONFIRMED")) {
    const overlap = rows.some(
      (r) =>
        r.id !== row.id &&
        (r.status === "PENDING" || r.status === "CONFIRMED") &&
        r.appointment_date === row.appointment_date &&
        r.start_time < row.end_time &&
        row.start_time < r.end_time
    );
    if (overlap) return { code: "23P01", message: "conflicting key value violates exclusion constraint" };
    const blocked = db().blocked_slots.some((b) =>
      b.is_full_day
        ? b.start_date <= row.appointment_date && row.appointment_date <= b.end_date
        : b.start_date === row.appointment_date && b.start_time < row.end_time && row.start_time < b.end_time
    );
    if (blocked) return { code: "P0001", message: "SLOT_BLOCKED" };
  }
  return null;
}

/** Insere com defaults, generated e constraints, como o Postgres faria. */
export function insertRow(table: string, input: Row): { row?: Row; error?: PgError } {
  const rows = db()[table];
  if (!rows) throw new DemoUnsupported(`a tabela "${table}"`);
  const row: Row = { ...(DEFAULTS[table]?.() ?? {}), ...clone(input) };
  if (pk(table) === "id" && row.id == null && table !== "settings") row.id = crypto.randomUUID();
  if (!NO_TIMESTAMPS.has(table) && row.created_at == null) row.created_at = nowIso();
  if (HAS_UPDATED_AT.has(table) && row.updated_at == null) row.updated_at = nowIso();
  normalizeRow(table, row);
  const error = constraintError(table, row);
  if (error) return { error };
  rows.push(row);
  return { row };
}

export function updateRow(table: string, row: Row, patch: Row): PgError | null {
  const next = normalizeRow(table, { ...row, ...clone(patch) });
  if (HAS_UPDATED_AT.has(table) && !("updated_at" in patch)) next.updated_at = nowIso();
  // Espelho de trg_appointments_reset_reminder (0016): remarcar zera o lembrete.
  if (table === "appointments" && (next.appointment_date !== row.appointment_date || next.start_time !== row.start_time)) {
    next.reminder_sent_at = null;
  }
  const error = constraintError(table, next, row[pk(table)]);
  if (error) return error;
  const completed = table === "appointments" && row.status !== "COMPLETED" && next.status === "COMPLETED";
  Object.assign(row, next);
  if (completed) consumeServiceProducts(row.service_id);
  return null;
}

/** Espelho de fn_consume_service_products (0016): baixa a receita, acumulando a fração da unidade aberta. */
function consumeServiceProducts(serviceId: unknown) {
  for (const line of db().service_products.filter((l) => l.service_id === serviceId)) {
    const product = db().products.find((p) => p.id === line.product_id);
    if (!product) continue;
    const total = Math.round((Number(product.open_usage ?? 0) + Number(line.quantity)) * 1000) / 1000;
    const units = Math.floor(total);
    product.stock_quantity = Math.max(0, product.stock_quantity - units);
    product.open_usage = Math.round((total - units) * 1000) / 1000;
  }
}

function deleteRows(table: string, victims: Row[]): PgError | null {
  if (table === "cash_entries") return { code: "P0001", message: "cash_entries é só de inserção: corrija com um estorno." };
  const tables = db();
  const ids = new Set(victims.map((r) => r[pk(table)]));
  tables[table] = tables[table].filter((r) => !ids.has(r[pk(table)]));
  const rules = ON_DELETE[table];
  for (const [child, fk] of rules?.cascade ?? []) tables[child] = tables[child].filter((r) => !ids.has(r[fk]));
  for (const [child, fk] of rules?.setNull ?? []) for (const r of tables[child]) if (ids.has(r[fk])) r[fk] = null;
  return null;
}

// ---------------------------------------------------------------------------
// Comparação de valores e filtros
// ---------------------------------------------------------------------------

function norm(v: unknown): unknown {
  if (typeof v === "string" && TIME_RE.test(v)) return `${v}:00`;
  return v;
}

function compare(a: unknown, b: unknown): number {
  const x = norm(a);
  const y = norm(b);
  if (typeof x === "number" && typeof y === "number") return x - y;
  if (typeof x === "number" && typeof y === "string" && y.trim() !== "" && !Number.isNaN(Number(y))) return x - Number(y);
  if (typeof x === "boolean" || typeof y === "boolean") return String(x) === String(y) ? 0 : String(x) < String(y) ? -1 : 1;
  const sx = String(x);
  const sy = String(y);
  return sx === sy ? 0 : sx < sy ? -1 : 1;
}

type Pred = (row: Row) => boolean;

function op(col: string, operator: string, value: unknown): Pred {
  switch (operator) {
    case "eq":
      return (r) => r[col] != null && value != null && compare(r[col], value) === 0;
    case "neq":
      return (r) => r[col] != null && compare(r[col], value) !== 0;
    case "gt":
      return (r) => r[col] != null && compare(r[col], value) > 0;
    case "gte":
      return (r) => r[col] != null && compare(r[col], value) >= 0;
    case "lt":
      return (r) => r[col] != null && compare(r[col], value) < 0;
    case "lte":
      return (r) => r[col] != null && compare(r[col], value) <= 0;
    case "is":
      return (r) => (value === null ? r[col] == null : r[col] === value);
    case "in": {
      const list = Array.isArray(value) ? value : parseList(String(value));
      return (r) => r[col] != null && list.some((v) => compare(r[col], v) === 0);
    }
    default:
      throw new DemoUnsupported(`o filtro "${operator}"`);
  }
}

function literal(raw: string): unknown {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

function parseList(raw: string): unknown[] {
  const inner = raw.trim().replace(/^\(/, "").replace(/\)$/, "");
  return inner === "" ? [] : inner.split(",").map((s) => literal(s.trim().replace(/^"|"$/g, "")));
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Sintaxe do `.or()` do PostgREST: "a.eq.1,and(b.gte.x,b.lte.y)". */
function parseLogic(expr: string, mode: "or" | "and"): Pred {
  const preds = splitTopLevel(expr).map((term): Pred => {
    const nested = term.match(/^(and|or)\(([\s\S]*)\)$/);
    if (nested) return parseLogic(nested[2], nested[1] as "and" | "or");
    const [col, operator, ...rest] = term.split(".");
    const raw = rest.join(".");
    return op(col, operator, operator === "in" ? parseList(raw) : literal(raw));
  });
  return mode === "or" ? (r) => preds.some((p) => p(r)) : (r) => preds.every((p) => p(r));
}

// ---------------------------------------------------------------------------
// Seleção de colunas e relações embutidas
// ---------------------------------------------------------------------------

type Node = { kind: "all" } | { kind: "col"; name: string } | { kind: "embed"; alias: string; table: string; inner: Node[] };

function parseSelect(text: string): Node[] {
  return splitTopLevel(text).map((token): Node => {
    if (token === "*") return { kind: "all" };
    const embed = token.match(/^(?:(\w+):)?(\w+)\(([\s\S]*)\)$/);
    if (embed) return { kind: "embed", alias: embed[1] ?? embed[2], table: embed[2], inner: parseSelect(embed[3] || "*") };
    if (!/^\w+$/.test(token)) throw new DemoUnsupported(`a seleção "${token}"`);
    return { kind: "col", name: token };
  });
}

function project(table: string, row: Row, nodes: Node[]): Row {
  const out: Row = {};
  for (const node of nodes) {
    if (node.kind === "all") Object.assign(out, clone(row));
    else if (node.kind === "col") out[node.name] = clone(row[node.name] ?? null);
    else out[node.alias] = embed(table, row, node);
  }
  return out;
}

function embed(parentTable: string, parent: Row, node: Extract<Node, { kind: "embed" }>): unknown {
  const target = db()[node.table];
  if (!target) throw new DemoUnsupported(`a relação "${node.table}"`);
  const fk = `${node.alias}_id`;
  if (fk in parent) {
    const found = target.find((r) => r[pk(node.table)] === parent[fk]);
    return found ? project(node.table, found, node.inner) : null;
  }
  const childFk = CHILD_FK[parentTable];
  if (childFk) {
    return target.filter((r) => r[childFk] === parent[pk(parentTable)]).map((r) => project(node.table, r, node.inner));
  }
  throw new DemoUnsupported(`a relação "${parentTable}" → "${node.table}"`);
}

// ---------------------------------------------------------------------------
// Construtor de consultas
// ---------------------------------------------------------------------------

type Op = "select" | "insert" | "update" | "upsert" | "delete";

class DemoQuery implements PromiseLike<Result> {
  private op: Op = "select";
  private columns: string | null = "*";
  private returning: string | null = null;
  private head = false;
  private countExact = false;
  private preds: Pred[] = [];
  private orders: { col: string; asc: boolean; nullsFirst?: boolean }[] = [];
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private limitN: number | null = null;
  private singleMode: "single" | "maybe" | null = null;
  private payload: Row | Row[] = {};
  private conflictKey: string | null = null;

  constructor(private table: string) {
    if (!db()[table]) throw new DemoUnsupported(`a tabela "${table}"`);
  }

  select(columns = "*", options?: { count?: string; head?: boolean }) {
    if (this.op === "select") {
      this.columns = columns;
      this.head = !!options?.head;
      this.countExact = options?.count === "exact";
    } else this.returning = columns;
    return this;
  }
  insert(values: Row | Row[]) {
    this.op = "insert";
    this.payload = values;
    return this;
  }
  upsert(values: Row | Row[], options?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = values;
    this.conflictKey = options?.onConflict ?? null;
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.payload = values;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, v: unknown) {
    this.preds.push(op(col, "eq", v));
    return this;
  }
  neq(col: string, v: unknown) {
    this.preds.push(op(col, "neq", v));
    return this;
  }
  gt(col: string, v: unknown) {
    this.preds.push(op(col, "gt", v));
    return this;
  }
  gte(col: string, v: unknown) {
    this.preds.push(op(col, "gte", v));
    return this;
  }
  lt(col: string, v: unknown) {
    this.preds.push(op(col, "lt", v));
    return this;
  }
  lte(col: string, v: unknown) {
    this.preds.push(op(col, "lte", v));
    return this;
  }
  in(col: string, values: unknown[]) {
    this.preds.push(op(col, "in", values));
    return this;
  }
  is(col: string, v: unknown) {
    this.preds.push(op(col, "is", v));
    return this;
  }
  not(col: string, operator: string, v: unknown) {
    const inner = op(col, operator, operator === "in" && typeof v === "string" ? parseList(v) : v);
    this.preds.push((r) => !inner(r));
    return this;
  }
  or(expr: string) {
    this.preds.push(parseLogic(expr, "or"));
    return this;
  }
  order(col: string, options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string; referencedTable?: string }) {
    if (options?.foreignTable || options?.referencedTable) throw new DemoUnsupported("ordenar por tabela relacionada");
    this.orders.push({ col, asc: options?.ascending ?? true, nullsFirst: options?.nullsFirst });
    return this;
  }
  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }
  single() {
    this.singleMode = "single";
    return this;
  }

  then<A = Result, B = never>(onOk?: ((r: Result) => A | PromiseLike<A>) | null, onErr?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onOk, onErr);
  }

  private matching(): Row[] {
    return db()[this.table].filter((r) => this.preds.every((p) => p(r)));
  }

  private sorted(rows: Row[]): Row[] {
    if (!this.orders.length) return rows;
    return [...rows].sort((a, b) => {
      for (const o of this.orders) {
        const av = a[o.col];
        const bv = b[o.col];
        if (av == null || bv == null) {
          if (av == null && bv == null) continue;
          // Postgres: nulls por último no ASC e primeiro no DESC, salvo nullsFirst.
          const nullsFirst = o.nullsFirst ?? !o.asc;
          return av == null ? (nullsFirst ? -1 : 1) : nullsFirst ? 1 : -1;
        }
        const c = compare(av, bv);
        if (c !== 0) return o.asc ? c : -c;
      }
      return 0;
    });
  }

  private finish(rows: Row[], columns: string | null, count: number | null = null): Result {
    const data = columns === null ? null : rows.map((r) => project(this.table, r, parseSelect(columns)));
    if (this.singleMode && data) {
      if (data.length > 1 || (this.singleMode === "single" && data.length === 0)) {
        return { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }, count, status: 406, statusText: "Not Acceptable" };
      }
      return { data: data[0] ?? null, error: null, count, status: 200, statusText: "OK" };
    }
    return { data, error: null, count, status: 200, statusText: "OK" };
  }

  private fail(error: PgError): Result {
    return { data: null, error, count: null, status: 400, statusText: "Bad Request" };
  }

  private execute(): Result {
    if (this.op === "select") {
      let rows = this.sorted(this.matching());
      const count = this.countExact ? rows.length : null;
      if (this.rangeFrom !== null) rows = rows.slice(this.rangeFrom, (this.rangeTo ?? rows.length - 1) + 1);
      if (this.limitN !== null) rows = rows.slice(0, this.limitN);
      return this.finish(rows, this.head ? null : this.columns, count);
    }

    if (this.op === "insert" || this.op === "upsert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const written: Row[] = [];
      const key = this.conflictKey ?? pk(this.table);
      for (const item of items) {
        const existing = this.op === "upsert" ? db()[this.table].find((r) => item[key] != null && String(r[key]) === String(item[key])) : null;
        if (existing) {
          const error = updateRow(this.table, existing, item);
          if (error) return this.fail(error);
          written.push(existing);
        } else {
          const { row, error } = insertRow(this.table, item);
          if (error) return this.fail(error);
          written.push(row!);
        }
      }
      return this.finish(written, this.returning);
    }

    if (this.op === "update") {
      const rows = this.matching();
      for (const row of rows) {
        const error = updateRow(this.table, row, this.payload as Row);
        if (error) return this.fail(error);
      }
      return this.finish(rows, this.returning);
    }

    const victims = this.matching();
    const snapshot = victims.map((r) => clone(r));
    const error = deleteRows(this.table, victims);
    if (error) return this.fail(error);
    return this.finish(snapshot, this.returning);
  }
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

const UPLOAD_OFF: PgError = { message: "Envio de fotos indisponível no modo demonstração." };

export function createDemoClient() {
  return {
    from: (table: string) => new DemoQuery(table),
    rpc: async (name: string, args: Record<string, any> = {}): Promise<Result> => {
      try {
        const data = runRpc(name, args);
        return { data, error: null, count: null, status: 200, statusText: "OK" };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e), code: "P0001" }, count: null, status: 400, statusText: "Bad Request" };
      }
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: UPLOAD_OFF }),
        remove: async () => ({ data: [], error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `/${path}` } }),
        createSignedUrls: async (paths: string[]) => ({ data: paths.map((path) => ({ path, signedUrl: null, error: null })), error: null }),
      }),
    },
  };
}
