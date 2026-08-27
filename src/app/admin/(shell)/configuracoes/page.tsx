import type { Metadata } from "next";
import { getSettings } from "@/lib/data/settings";
import { getBusinessHours } from "@/lib/data/business-hours";
import { SettingsManager } from "@/components/admin/SettingsManager";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const [settings, businessHours] = await Promise.all([getSettings(), getBusinessHours()]);
  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Configurações</p>
        <h1 className="font-serif text-3xl text-brand-forest">Configurações do painel</h1>
      </div>
      <SettingsManager settings={settings} businessHours={businessHours} />
    </div>
  );
}
