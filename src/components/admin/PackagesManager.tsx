"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Layers, Pencil, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { CustomerPicker } from "@/components/admin/CustomerPicker";
import { useFinanceOptions } from "@/components/admin/FinanceOptionsProvider";
import {
  getCustomerPackageAction,
  listServicePackagesAction,
  saveServicePackageAction,
  sellPackageAction,
} from "@/lib/actions/admin/packages";
import { PackageSessionsForm, PackageSessionsModal, freeSessions } from "@/components/admin/PackageSessionsScheduler";
import { listCustomersAction } from "@/lib/actions/admin/customers";
import { formatBRL } from "@/lib/utils/money";
import { formatShortDatePtBR, todayDateStr } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";
import type { Customer, CustomerPackage, CustomerPackageStatus, PaymentMethod, Service, ServicePackage } from "@/types";

const STATUS_LABEL: Record<CustomerPackageStatus, string> = {
  active: "Em andamento",
  finished: "Concluído",
  cancelled: "Cancelado",
};

export function PackagesManager({
  catalog,
  customerPackages,
  services,
}: {
  catalog: ServicePackage[];
  customerPackages: CustomerPackage[];
  services: Service[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"clientes" | "catalogo">("clientes");
  const [status, setStatus] = useState<CustomerPackageStatus>("active");
  const [editing, setEditing] = useState<ServicePackage | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [scheduling, setScheduling] = useState<CustomerPackage | null>(null);

  const visible = customerPackages.filter((p) => p.status === status);
  const pendingValue = customerPackages
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + (p.sessionsTotal - p.sessionsUsed) * p.sessionValueCents, 0);
  const pendingSessions = customerPackages
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + p.sessionsTotal - p.sessionsUsed, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-brand-cream/70 p-1" role="tablist" aria-label="Pacotes">
          {(
            [
              ["clientes", "Pacotes das clientes"],
              ["catalogo", "Pacotes oferecidos"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                tab === value ? "bg-white text-brand-forest shadow-softer" : "text-brand-graphite/70 hover:text-brand-graphite"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === "catalogo" ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={16} /> Novo pacote
            </Button>
          ) : null}
          <Button onClick={() => setSellOpen(true)} disabled={!catalog.some((p) => p.isActive)}>
            <Layers size={16} /> Vender pacote
          </Button>
        </div>
      </div>

      {tab === "clientes" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <p className="text-xs font-medium text-brand-graphite/60">Sessões a cumprir</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-brand-forest">{pendingSessions}</p>
              <p className="text-xs text-brand-graphite/50">nos pacotes em andamento</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-brand-graphite/60">Valor já recebido por sessões a fazer</p>
              <p className="valor-sensivel mt-2 text-2xl font-semibold tabular-nums text-brand-graphite">{formatBRL(pendingValue)}</p>
              <p className="text-xs text-brand-graphite/50">pelo valor de cada sessão fixado na venda</p>
            </Card>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STATUS_LABEL) as CustomerPackageStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  status === s ? "border-brand-forest bg-brand-forest text-brand-ink" : "border-brand-beige text-brand-graphite/70 hover:border-brand-sage"
                )}
              >
                {STATUS_LABEL[s]} ({customerPackages.filter((p) => p.status === s).length})
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                compact
                title={status === "active" ? "Nenhum pacote em andamento" : "Nada por aqui"}
                hint={catalog.length ? "Venda um pacote pelo botão acima ou pela ficha da cliente." : "Cadastre antes um pacote em “Pacotes oferecidos”."}
              />
            </Card>
          ) : (
            <ul data-cascata className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((p) => (
                <li key={p.id}>
                  <CustomerPackageCard pkg={p} onSchedule={() => setScheduling(p)} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <Card className="p-5">
          {catalog.length === 0 ? (
            <EmptyState compact title="Nenhum pacote cadastrado" hint="Ex.: 6 sessões de Terapia Capilar com preço fechado." />
          ) : (
            <ul className="divide-y divide-brand-beige">
              {catalog.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className={cn("font-medium text-brand-graphite", !p.isActive && "opacity-60")}>
                      {p.name} {!p.isActive ? <span className="text-xs font-normal">(desativado)</span> : null}
                    </p>
                    <p className="text-xs text-brand-graphite/60">
                      {p.serviceName} · {p.sessions} sessões · {formatBRL(p.priceCents)} ({formatBRL(Math.round(p.priceCents / p.sessions))} por sessão)
                      {p.validDays ? ` · vale ${p.validDays} dias` : ""}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    onClick={() => {
                      setEditing(p);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil size={14} /> Editar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <PackageFormModal
        open={formOpen}
        pkg={editing}
        services={services}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          router.refresh();
        }}
      />
      <PackageSessionsModal
        open={!!scheduling}
        pkg={scheduling}
        onClose={() => setScheduling(null)}
        onDone={() => {
          setScheduling(null);
          router.refresh();
        }}
      />
      <SellPackageModal
        open={sellOpen}
        onClose={() => setSellOpen(false)}
        onCompleted={() => {
          setSellOpen(false);
          setTab("clientes");
          setStatus("active");
          router.refresh();
        }}
      />
    </div>
  );
}

export function CustomerPackageCard({
  pkg,
  compact,
  onSchedule,
}: {
  pkg: CustomerPackage;
  compact?: boolean;
  /** Mostra "Agendar sessões" quando sobra sessão sem data. */
  onSchedule?: () => void;
}) {
  const remaining = pkg.sessionsTotal - pkg.sessionsUsed;
  const free = freeSessions(pkg);
  const today = todayDateStr();
  const expired = pkg.status === "active" && pkg.expiresOn !== null && pkg.expiresOn < today;
  return (
    <div className={cn("rounded-2xl border border-brand-beige bg-white", compact ? "p-3" : "p-4 shadow-softer")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {!compact ? (
            <Link href={`/admin/clientes?cliente=${pkg.customerId}`} className="block truncate font-medium text-brand-graphite hover:underline">
              {pkg.customerName}
            </Link>
          ) : null}
          <p className={cn("truncate", compact ? "text-sm font-medium text-brand-graphite" : "text-xs text-brand-graphite/60")}>{pkg.name}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            pkg.status === "active" ? (expired ? "bg-amber-100 text-amber-900" : "bg-brand-sage/20 text-brand-moss") : "bg-brand-cream text-brand-graphite/60"
          )}
        >
          {expired ? "Vencido" : STATUS_LABEL[pkg.status]}
        </span>
      </div>
      <div className="mt-3 flex gap-1" aria-hidden="true">
        {Array.from({ length: pkg.sessionsTotal }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full",
              i < pkg.sessionsUsed ? "bg-brand-forest" : i < pkg.sessionsUsed + pkg.sessionsScheduled ? "bg-brand-sage" : "bg-brand-beige"
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-brand-graphite/70">
        <strong className="text-brand-graphite">{pkg.sessionsUsed}</strong> de {pkg.sessionsTotal} feitas
        {pkg.status === "active" ? ` · faltam ${remaining}` : ""}
        {pkg.status === "active" && pkg.sessionsScheduled ? ` (${pkg.sessionsScheduled} agendada${pkg.sessionsScheduled > 1 ? "s" : ""})` : ""}
        {pkg.expiresOn ? ` · vale até ${formatShortDatePtBR(pkg.expiresOn)}` : ""}
      </p>
      {onSchedule && pkg.status === "active" && free > 0 && !expired ? (
        <Button variant="secondary" className="mt-3 !px-3 !py-1.5 text-xs" onClick={onSchedule}>
          <CalendarPlus size={14} /> Agendar {free === 1 ? "1 sessão" : `${free} sessões`}
        </Button>
      ) : null}
    </div>
  );
}

function PackageFormModal({
  open,
  pkg,
  services,
  onClose,
  onSaved,
}: {
  open: boolean;
  pkg: ServicePackage | null;
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [sessions, setSessions] = useState("6");
  const [priceCents, setPriceCents] = useState<number | null>(null);
  const [validDays, setValidDays] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(pkg?.name ?? "");
    setServiceId(pkg?.serviceId ?? services[0]?.id ?? "");
    setSessions(String(pkg?.sessions ?? 6));
    setPriceCents(pkg?.priceCents ?? null);
    setValidDays(pkg?.validDays ? String(pkg.validDays) : "");
    setIsActive(pkg?.isActive ?? true);
    setError(null);
  }, [open, pkg, services]);

  const service = services.find((s) => s.id === serviceId);
  const sessionsN = Number(sessions);
  const fullPrice = service?.priceCents != null && sessionsN > 0 ? service.priceCents * sessionsN : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (priceCents == null) return setError("Informe o preço do pacote.");
    setSaving(true);
    setError(null);
    const result = await saveServicePackageAction(pkg?.id ?? null, {
      name,
      serviceId,
      sessions: sessionsN,
      priceCents,
      validDays: validDays ? Number(validDays) : null,
      isActive,
    });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={pkg ? "Editar pacote" : "Novo pacote"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="pk-name">Nome</FieldLabel>
          <Input id="pk-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Protocolo Terapia Capilar" required />
        </div>
        <div>
          <FieldLabel htmlFor="pk-service">Serviço</FieldLabel>
          <Select id="pk-service" value={serviceId} onChange={(e) => setServiceId(e.target.value)} disabled={!!pkg}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          {pkg ? <p className="mt-1 text-xs text-brand-graphite/50">O serviço não muda depois de criado: crie outro pacote.</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="pk-sessions">Sessões</FieldLabel>
            <Input id="pk-sessions" type="number" min={2} max={100} value={sessions} onChange={(e) => setSessions(e.target.value)} required />
          </div>
          <div>
            <FieldLabel htmlFor="pk-price">Preço do pacote</FieldLabel>
            <MoneyInput id="pk-price" value={priceCents} allowEmpty onChange={setPriceCents} />
          </div>
        </div>
        {fullPrice != null && priceCents != null && priceCents < fullPrice ? (
          <p className="text-xs text-brand-moss">
            Avulso sairia {formatBRL(fullPrice)}: a cliente economiza {formatBRL(fullPrice - priceCents)}.
          </p>
        ) : null}
        <div>
          <FieldLabel htmlFor="pk-valid">Validade em dias (opcional)</FieldLabel>
          <Input id="pk-valid" type="number" min={1} max={1095} placeholder="Sem validade" value={validDays} onChange={(e) => setValidDays(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-graphite">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-brand-beige" />
          Disponível para vender
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type PaymentMode = "full" | "partial" | "open";

export function SellPackageModal({
  open,
  onClose,
  onCompleted,
  customerId: fixedCustomerId,
}: {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
  /** Vendendo pela ficha: a cliente já vem escolhida. */
  customerId?: string;
}) {
  const fin = useFinanceOptions();
  const [catalog, setCatalog] = useState<ServicePackage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [discountCents, setDiscountCents] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("full");
  const [method, setMethod] = useState<PaymentMethod>(() => fin.pickMethod());
  const [partialCents, setPartialCents] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState(todayDateStr());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sold, setSold] = useState<CustomerPackage | null>(null);

  useEffect(() => {
    if (!open) return;
    setSold(null);
    setCustomerId(fixedCustomerId ?? "");
    setDiscountCents(0);
    setPaymentMode("full");
    setMethod(fin.pickMethod());
    setPartialCents(null);
    setDueDate(todayDateStr());
    setNotes("");
    setError(null);
    listServicePackagesAction(true).then((list) => {
      setCatalog(list);
      setPackageId((current) => (list.some((p) => p.id === current) ? current : list[0]?.id ?? ""));
    });
    if (!fixedCustomerId) listCustomersAction().then(setCustomers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pkg = catalog.find((p) => p.id === packageId);
  const total = Math.max(0, (pkg?.priceCents ?? 0) - discountCents);
  const paidNow = paymentMode === "full" ? total : paymentMode === "partial" ? partialCents ?? 0 : 0;
  const perSession = useMemo(() => (pkg ? Math.round(total / pkg.sessions) : 0), [pkg, total]);

  async function handleSubmit() {
    setError(null);
    if (!customerId) return setError("Escolha a cliente.");
    if (!pkg) return setError("Escolha o pacote.");
    if (discountCents > pkg.priceCents) return setError("O desconto é maior que o preço do pacote.");
    if (paymentMode === "partial" && (!partialCents || partialCents >= total)) {
      return setError("No pagamento parcial, o valor recebido deve ser menor que o total.");
    }
    setSubmitting(true);
    const result = await sellPackageAction({
      packageId: pkg.id,
      customerId,
      discountCents,
      dueDate: paymentMode === "full" ? undefined : dueDate,
      notes: notes || undefined,
      payment: paidNow > 0 ? { amountCents: paidNow, method } : undefined,
    });
    if (!result.ok) {
      setSubmitting(false);
      return setError(result.error);
    }
    const created = result.customerPackageId ? await getCustomerPackageAction(result.customerPackageId) : null;
    setSubmitting(false);
    if (created) setSold(created);
    else onCompleted();
  }

  if (sold) {
    return (
      <Modal open={open} onClose={onCompleted} title="Agendar as sessões" widthClassName="max-w-lg">
        <p className="mb-4 rounded-xl bg-brand-sage/15 px-4 py-2.5 text-sm text-brand-graphite">Pacote vendido. Agora marque os dias das sessões.</p>
        <PackageSessionsForm pkg={sold} onDone={onCompleted} onSkip={onCompleted} skipLabel="Agendar depois" />
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Vender pacote" widthClassName="max-w-lg">
      <div className="space-y-5">
        {!fixedCustomerId ? (
          <div>
            <FieldLabel>Cliente</FieldLabel>
            <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} emptyLabel="Escolha a cliente" />
          </div>
        ) : null}
        <div>
          <FieldLabel htmlFor="sp-package">Pacote</FieldLabel>
          {catalog.length === 0 ? (
            <p className="text-sm text-brand-graphite/60">
              Nenhum pacote disponível. Cadastre em <Link href="/admin/pacotes" className="font-medium text-brand-moss underline">Pacotes</Link>.
            </p>
          ) : (
            <Select id="sp-package" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
              {catalog.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.sessions} sessões · {formatBRL(p.priceCents)}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="sp-discount">Desconto</FieldLabel>
            <MoneyInput id="sp-discount" value={discountCents} onChange={(v) => setDiscountCents(v ?? 0)} />
          </div>
          <div className="self-end rounded-xl bg-brand-cream/60 px-4 py-2.5 text-sm">
            <p className="flex justify-between">
              <span>Total</span> <strong className="tabular-nums">{formatBRL(total)}</strong>
            </p>
            {pkg ? <p className="text-xs text-brand-graphite/60">{formatBRL(perSession)} por sessão</p> : null}
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-1.5 text-sm font-medium text-brand-graphite">Pagamento</legend>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-brand-cream/60 p-1">
            {(
              [
                ["full", "Pago agora"],
                ["partial", "Pago em parte"],
                ["open", "Fica em aberto"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPaymentMode(value)}
                aria-pressed={paymentMode === value}
                className={cn(
                  "rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm",
                  paymentMode === value ? "bg-white text-brand-forest shadow-softer" : "text-brand-graphite/70"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {paymentMode !== "open" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="sp-method">Forma de pagamento</FieldLabel>
                <Select id="sp-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {fin.methodChoices(method).map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              {paymentMode === "partial" ? (
                <div>
                  <FieldLabel htmlFor="sp-partial">Valor recebido</FieldLabel>
                  <MoneyInput id="sp-partial" value={partialCents} allowEmpty onChange={setPartialCents} />
                </div>
              ) : null}
            </div>
          ) : null}
          {paymentMode !== "full" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="sp-due">Cobrar até</FieldLabel>
                <Input id="sp-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <p className="self-end pb-3 text-sm text-brand-graphite/70">
                Fica a receber: <strong className="tabular-nums">{formatBRL(Math.max(0, total - paidNow))}</strong>
              </p>
            </div>
          ) : null}
        </fieldset>

        <div>
          <FieldLabel htmlFor="sp-notes">Observações (opcional)</FieldLabel>
          <Textarea id="sp-notes" rows={2} className="!min-h-0" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <p className="text-xs text-brand-graphite/60">
          O dinheiro entra no caixa agora (ou fica em Contas a receber). Em seguida você marca os dias das sessões; cada uma é
          descontada quando acontece, sem novo lançamento.
        </p>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || !pkg}>
            {submitting ? "Salvando..." : "Vender pacote"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
