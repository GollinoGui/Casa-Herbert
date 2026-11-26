import type { CashClosing, CashDrawerPreview } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";

type Row = Record<string, any>;

function toCashClosing(r: Row): CashClosing {
  return {
    id: r.id,
    closingDate: r.closing_date,
    openingCents: r.opening_cents,
    cashInCents: r.cash_in_cents,
    cashOutCents: r.cash_out_cents,
    expectedCents: r.expected_cents,
    countedCents: r.counted_cents,
    withdrawnCents: r.withdrawn_cents,
    differenceCents: r.difference_cents,
    posted: r.adjustment_entry_id != null,
    notes: r.notes ?? null,
    createdAt: r.created_at,
  };
}

/** O que a gaveta deveria ter agora (cash_drawer_preview, 0017). */
export async function getCashDrawerPreview(openingCents = 0): Promise<CashDrawerPreview> {
  return unwrap(await getSupabase().rpc("cash_drawer_preview", { p_opening_cents: openingCents })) as CashDrawerPreview;
}

export async function listCashClosings(limit = 30): Promise<CashClosing[]> {
  const rows = unwrap(
    await getSupabase().from("cash_closings").select("*").order("created_at", { ascending: false }).limit(limit)
  );
  return rows.map(toCashClosing);
}

export interface CloseCashDrawerInput {
  countedCents: number;
  withdrawnCents: number;
  openingCents?: number;
  postDifference: boolean;
  notes?: string;
}

export async function closeCashDrawer(
  input: CloseCashDrawerInput
): Promise<{ ok: true; differenceCents: number } | { ok: false; error: string }> {
  const result = unwrap(await getSupabase().rpc("close_cash_drawer", { p: input })) as {
    ok: boolean;
    error?: string;
    differenceCents?: number;
  };
  return result.ok
    ? { ok: true, differenceCents: result.differenceCents ?? 0 }
    : { ok: false, error: result.error ?? "Não foi possível fechar o caixa." };
}
