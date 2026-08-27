import type { Metadata } from "next";
import { getBlockedSlots } from "@/lib/data/blocked-slots";
import { BlockedSlotsManager } from "@/components/admin/BlockedSlotsManager";

export const metadata: Metadata = { title: "Bloqueios" };

export default async function BloqueiosPage() {
  const blockedSlots = await getBlockedSlots();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Bloqueios</p>
        <h1 className="font-serif text-3xl text-brand-forest">Bloqueios de horário</h1>
      </div>
      <BlockedSlotsManager blockedSlots={blockedSlots} />
    </div>
  );
}
