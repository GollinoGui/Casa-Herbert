import { BotanicalBranch } from "@/components/admin/BotanicalBranch";

export default function AdminLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" role="status">
      <BotanicalBranch loop className="h-24 w-20 text-brand-moss" strokeWidth={1.6} />
      <p className="text-sm text-brand-graphite/60">Carregando…</p>
    </div>
  );
}
