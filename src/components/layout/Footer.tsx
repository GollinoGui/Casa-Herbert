import Image from "next/image";
import Link from "next/link";
import { Instagram, MapPin, Phone } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/utils/phone";

const HOURS = [
  { label: "Terça a sábado", value: "09:00–11:00 e 14:00–19:00" },
  { label: "Domingo e segunda-feira", value: "Fechado" },
];

export function Footer({ whatsappNumber, address }: { whatsappNumber: string; address: string }) {
  return (
    <footer className="bg-brand-forest text-brand-cream">
      <div className="container-herbert grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-white/20">
              <Image src="/logo.jpg" alt="Casa Herbert" fill sizes="48px" className="object-cover" />
            </span>
            <div>
              <p className="font-serif text-xl">Casa Herbert</p>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-sage">
                Embelezamento &amp; Saúde Capilar
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm text-brand-cream/75">
            Cuidar do seu couro cabeludo é cuidar de você. Atendimento somente com hora marcada.
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-brand-sage">Navegação</p>
          <ul className="space-y-2 text-sm text-brand-cream/80">
            <li><Link href="/sobre" className="hover:text-white">Sobre</Link></li>
            <li><Link href="/servicos" className="hover:text-white">Serviços</Link></li>
            <li><Link href="/produtos" className="hover:text-white">Produtos</Link></li>
            <li><Link href="/contato" className="hover:text-white">Contato</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-brand-sage">Horário de atendimento</p>
          <ul className="space-y-2 text-sm text-brand-cream/80">
            {HOURS.map((h) => (
              <li key={h.label}>
                <span className="block text-brand-cream/60">{h.label}</span>
                {h.value}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-brand-sage">Contato</p>
          <ul className="space-y-3 text-sm text-brand-cream/80">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-brand-sage" />
              <span>{address}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="shrink-0 text-brand-sage" />
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                {formatPhoneDisplay(whatsappNumber)}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Instagram size={16} className="shrink-0 text-brand-sage" />
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                @casaherbert
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5">
        <p className="container-herbert text-center text-xs text-brand-cream/50">
          © {new Date().getFullYear()} Casa Herbert Embelezamento e Saúde Capilar — Orlândia/SP. Protótipo em desenvolvimento.
        </p>
      </div>
    </footer>
  );
}
