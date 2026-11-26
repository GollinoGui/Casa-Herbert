import { addDaysToDateStr } from "@/lib/utils/date-format";

/**
 * Filtros das telas de consulta, guardados na URL (?de=&ate=&cliente=...) para
 * sobreviverem a um refresh e poderem ser compartilhados. O período vai para a
 * consulta no servidor; o resto filtra a lista já carregada.
 */
export interface ListFilters {
  dateFrom: string;
  dateTo: string;
  customer: string; // texto livre: nome ou telefone
  productId: string;
  serviceId: string;
  minCents: number | null;
  maxCents: number | null;
  status: string;
}

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function get(params: Params, key: string): string {
  const value = params instanceof URLSearchParams ? params.get(key) : params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function monthRange(today: string) {
  const first = `${today.slice(0, 7)}-01`;
  const nextMonth = addDaysToDateStr(first, 32).slice(0, 7);
  return { dateFrom: first, dateTo: addDaysToDateStr(`${nextMonth}-01`, -1) };
}

/** `defaults` = período quando a URL não traz nenhum (ex.: mês atual); vazio = sem limite. */
export function parseListFilters(params: Params, defaults: { dateFrom: string; dateTo: string }): ListFilters {
  const de = get(params, "de");
  const ate = get(params, "ate");
  const money = (key: string) => {
    const v = get(params, key).replace(",", ".");
    const n = Number(v);
    return v !== "" && Number.isFinite(n) ? Math.round(n * 100) : null;
  };
  return {
    dateFrom: DATE_RE.test(de) ? de : get(params, "de") === "todos" ? "" : defaults.dateFrom,
    dateTo: DATE_RE.test(ate) ? ate : get(params, "de") === "todos" ? "" : defaults.dateTo,
    customer: get(params, "cliente").trim(),
    productId: get(params, "produto"),
    serviceId: get(params, "servico"),
    minCents: money("min"),
    maxCents: money("max"),
    status: get(params, "status"),
  };
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function matchesText(query: string, ...fields: (string | null | undefined)[]) {
  if (!query) return true;
  const q = normalize(query);
  const digits = query.replace(/\D/g, "");
  return fields.some(
    (f) => f && (normalize(f).includes(q) || (digits.length >= 3 && f.replace(/\D/g, "").includes(digits)))
  );
}

export function matchesValue(cents: number, filters: Pick<ListFilters, "minCents" | "maxCents">) {
  return (filters.minCents == null || cents >= filters.minCents) && (filters.maxCents == null || cents <= filters.maxCents);
}
