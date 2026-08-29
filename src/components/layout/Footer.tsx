import Image from "next/image";
import Link from "next/link";
import { Brush, Droplet, Instagram, MapPin, MessageCircle, Phone, Scissors, Sparkles, SprayCan } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { FloatingIcon } from "@/components/motion/FloatingIcon";
import { MarginThread } from "@/components/motion/MarginThread";
import { ScissorCombIcon } from "@/components/icons/ScissorCombIcon";

const HOURS = [
  { label: "Terça a sábado", value: "09:00–11:00 e 14:00–19:00" },
  { label: "Domingo e segunda-feira", value: "Fechado" },
];

const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/sobre", label: "Sobre" },
  { href: "/servicos", label: "Serviços" },
  { href: "/produtos", label: "Produtos" },
  { href: "/contato", label: "Contato" },
];

export function Footer({ whatsappNumber, address }: { whatsappNumber: string; address: string }) {
  return (
    <footer className="relative overflow-hidden bg-brand-forest text-brand-cream">
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-brand-forestDark/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-brand-gold/10 blur-3xl" />

      <FloatingIcon icon={Scissors} size={76} rotate={-18} speed="slow" className="absolute left-[5%] top-8 hidden text-brand-cream/10 sm:block" />
      <FloatingIcon icon={SprayCan} size={54} rotate={14} className="absolute right-[10%] top-4 hidden text-brand-gold/15 md:block" />
      <FloatingIcon icon={Droplet} size={34} rotate={-8} speed="slow" className="absolute left-[24%] bottom-20 hidden text-brand-cream/10 lg:block" />
      <FloatingIcon icon={Brush} size={42} rotate={22} className="absolute right-[24%] bottom-14 hidden text-brand-gold/10 lg:block" />
      <FloatingIcon icon={Sparkles} size={24} speed="slow" className="absolute right-[40%] top-14 hidden text-brand-cream/15 xl:block" />
      <MarginThread side="left" tone="cream" className="top-0 bottom-24" />
      <MarginThread side="right" tone="cream" className="top-0 bottom-24" />

      <div className="container-herbert relative grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr]">
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
            Cuidar do seu couro cabeludo é cuidar de você. Avaliação individual e protocolos
            personalizados, com atendimento somente sob hora marcada.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram da Casa Herbert"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-brand-cream/80 transition hover:border-brand-gold hover:text-brand-gold"
            >
              <Instagram size={16} />
            </a>
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp da Casa Herbert"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-brand-cream/80 transition hover:border-brand-gold hover:text-brand-gold"
            >
              <MessageCircle size={16} />
            </a>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-brand-sage">Navegação</p>
          <ul className="space-y-2 text-sm text-brand-cream/80">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
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
          </ul>
          <Link href="/agendar" className="btn-gold mt-5 !px-5 !py-2.5 text-sm">
            Agendar avaliação
          </Link>
        </div>
      </div>

      <div className="relative border-t border-white/10 py-6">
        <div className="container-herbert flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-brand-cream/30">
            <span className="h-px w-14 bg-gradient-to-r from-transparent to-current sm:w-24" />
            <ScissorCombIcon className="h-4 w-4 rotate-90 shrink-0 text-brand-gold/70" aria-hidden="true" />
            <span className="h-px w-14 bg-gradient-to-l from-transparent to-current sm:w-24" />
          </div>
          <p className="text-center text-xs text-brand-cream/50">
            © {new Date().getFullYear()} Casa Herbert Embelezamento e Saúde Capilar — Orlândia/SP. Protótipo em desenvolvimento.
          </p>
        </div>
      </div>
    </footer>
  );
}
