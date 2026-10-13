import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, MapPin, MessageCircle, Phone, Scissors } from "lucide-react";
import type { BusinessHourRule, Settings } from "@/types";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { closedDaysOf, daysLabel, groupByRanges, rangeLabel } from "@/lib/utils/business-hours-format";
import { FloatingIcon } from "@/components/motion/FloatingIcon";
import { ScissorCombIcon } from "@/components/icons/ScissorCombIcon";
import { GrainOverlay } from "@/components/ui/GrainOverlay";

const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/sobre", label: "Sobre" },
  { href: "/servicos", label: "Serviços" },
  { href: "/terapia-capilar", label: "Terapia Capilar" },
  { href: "/produtos", label: "Produtos" },
  { href: "/contato", label: "Contato" },
];

const SOCIAL_BUTTON =
  "flex h-10 w-10 items-center justify-center rounded-full border border-brand-graphite/30 transition hover:border-brand-graphite hover:bg-white/25";

// Texto sempre grafite sobre o laranja: creme/branco ficam em ~2.4:1 e reprovam o
// WCAG. A hierarquia vem de peso e tamanho, não de opacidade (abaixo de 100% o
// grafite também cai para menos de 4.5:1 nesse fundo).
export function Footer({ settings, businessHours }: { settings: Settings; businessHours: BusinessHourRule[] }) {
  const { whatsappNumber, salonAddress, instagramUrl, facebookUrl } = settings;
  const hoursGroups = groupByRanges(businessHours);
  const closedDays = closedDaysOf(hoursGroups);

  return (
    <footer className="relative overflow-hidden bg-brand-forest text-brand-graphite">
      <GrainOverlay />
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-brand-gold/10 blur-3xl" />

      <FloatingIcon icon={Scissors} size={76} rotate={-18} speed="slow" className="absolute left-[5%] top-8 hidden text-brand-cream/10 sm:block" />

      <div className="container-herbert relative grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-brand-graphite/20">
              <Image src="/logo.jpg" alt="Casa Herbert" fill sizes="48px" className="object-cover" />
            </span>
            <div>
              <p className="font-serif text-xl">Casa Herbert</p>
              <p className="text-xs font-medium uppercase tracking-[0.2em]">Embelezamento &amp; Saúde Capilar</p>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm">
            Cuidar do seu couro cabeludo é cuidar de você. Avaliação individual e protocolos
            personalizados, com atendimento somente sob hora marcada.
          </p>
          <div className="mt-5 flex items-center gap-3">
            {instagramUrl ? (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram da Casa Herbert" className={SOCIAL_BUTTON}>
                <Instagram size={16} />
              </a>
            ) : null}
            {facebookUrl ? (
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook da Casa Herbert" className={SOCIAL_BUTTON}>
                <Facebook size={16} />
              </a>
            ) : null}
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp da Casa Herbert"
              className={SOCIAL_BUTTON}
            >
              <MessageCircle size={16} />
            </a>
          </div>
        </div>

        <nav aria-label="Rodapé">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]">Navegação</p>
          <ul className="grid grid-cols-2 gap-x-6 text-sm sm:block sm:space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-block py-2 underline-offset-4 hover:underline sm:py-0">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]">Horário de atendimento</p>
          <ul className="space-y-2 text-sm">
            {hoursGroups.map((g) => (
              <li key={g.days.join()}>
                <span className="block font-medium">{daysLabel(g.days)}</span>
                <span className="tabular-nums">{g.ranges.map(rangeLabel).join(" e ")}</span>
              </li>
            ))}
            {closedDays.length > 0 ? (
              <li>
                <span className="block font-medium">{daysLabel(closedDays)}</span>
                Fechado
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]">Contato</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{salonAddress}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="shrink-0" aria-hidden="true" />
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="-my-2 py-2 underline-offset-4 hover:underline"
              >
                {formatPhoneDisplay(whatsappNumber)}
              </a>
            </li>
          </ul>
          <Link href="/agendar" className="btn-gold mt-5 !px-5 !py-2.5 text-sm">
            Agendar avaliação
          </Link>
        </div>
      </div>

      <div className="relative border-t border-brand-graphite/15 py-6">
        <div className="container-herbert flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-brand-graphite/30">
            <span className="h-px w-14 bg-gradient-to-r from-transparent to-current sm:w-24" />
            <ScissorCombIcon className="h-4 w-4 rotate-90 shrink-0 text-brand-graphite/60" aria-hidden="true" />
            <span className="h-px w-14 bg-gradient-to-l from-transparent to-current sm:w-24" />
          </div>
          <p className="text-center text-xs">
            © {new Date().getFullYear()} Casa Herbert Embelezamento e Saúde Capilar — Orlândia/SP.
            {" · "}
            <Link href="/privacidade" className="inline-block py-1.5 underline underline-offset-2">
              Política de Privacidade
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
