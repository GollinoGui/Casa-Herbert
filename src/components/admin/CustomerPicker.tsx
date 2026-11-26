"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { matchesCustomerSearch } from "@/lib/utils/customer-search";
import type { Customer } from "@/types";

interface CustomerPickerProps {
  customers: Customer[];
  value: string; // "" = nenhum
  onChange: (customerId: string) => void;
  emptyLabel?: string;
}

export function CustomerPicker({ customers, value, onChange, emptyLabel = "Sem cliente identificado" }: CustomerPickerProps) {
  const [query, setQuery] = useState("");
  const selected = customers.find((c) => c.id === value) ?? null;
  const matches = useMemo(
    () => customers.filter((c) => matchesCustomerSearch(c, query)).slice(0, 6),
    [customers, query]
  );

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-moss/40 bg-brand-cream/50 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-brand-graphite">{selected.fullName}</p>
          <p className="text-xs text-brand-graphite/60">{formatPhoneDisplay(selected.phone)}</p>
        </div>
        <button type="button" onClick={() => onChange("")} className="shrink-0 text-xs font-medium text-brand-moss hover:underline">
          Trocar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-graphite/40" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente por nome ou telefone"
          aria-label="Buscar cliente"
          className="pl-9"
        />
      </div>
      {query ? (
        <ul className="mt-2 max-h-44 overflow-y-auto overscroll-contain rounded-xl border border-brand-beige">
          {matches.length === 0 ? (
            <li className="px-4 py-3 text-sm text-brand-graphite/50">Nenhum cliente encontrado.</li>
          ) : (
            matches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-brand-cream"
                >
                  <span className="truncate font-medium text-brand-graphite">{c.fullName}</span>
                  <span className="shrink-0 text-xs text-brand-graphite/60">{formatPhoneDisplay(c.phone)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs text-brand-graphite/50">{emptyLabel} se não escolher ninguém.</p>
      )}
    </div>
  );
}
