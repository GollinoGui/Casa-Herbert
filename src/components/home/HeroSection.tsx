import Link from "next/link";
import { ArrowRight, CalendarCheck, Leaf } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { HandNote } from "@/components/ui/HandNote";
import { FadeIn } from "@/components/motion/FadeIn";
import { TypewriterText } from "@/components/motion/TypewriterText";
import { WordsRise } from "@/components/motion/WordsRise";
import { HeroPhoto } from "@/components/motion/HeroPhoto";
import { CurtainReveal } from "@/components/motion/CurtainReveal";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { formatChipDatePtBR } from "@/lib/utils/date-format";
import { WelcomeBack } from "@/components/home/WelcomeBack";

export interface NextOpenings {
  serviceId: string;
  serviceName: string;
  openings: { date: string; startTime: string }[];
}

export function HeroSection({ nextOpenings }: { nextOpenings: NextOpenings | null }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-cream via-brand-cream to-brand-sage/30 pb-16 pt-14 sm:pb-24 sm:pt-20">
      <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-brand-sage/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-brand-gold/15 blur-3xl" />
      <ParallaxLeaf className="pointer-events-none absolute -left-6 top-8 hidden sm:block" size={90} variant="leaf" speed="slow" tone="moss" />

      <div className="container-herbert relative grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <FadeIn trigger="load">
            <p className="eyebrow mb-5 inline-flex items-center gap-1.5">
              <Leaf size={12} className="text-brand-moss" aria-hidden="true" />
              <TypewriterText text="Casa Herbert · Orlândia, SP" />
            </p>
          </FadeIn>
          <WordsRise
            as="h1"
            trigger="load"
            text="Seu couro cabeludo tem história. A gente começa ouvindo."
            delay={0.1}
            className="text-balance font-serif text-[2.2rem] leading-[1.08] text-brand-forest min-[360px]:text-[2.5rem] sm:text-5xl lg:text-[3.6rem]"
          />
          <FadeIn trigger="load" delay={0.9}>
            <p className="mt-6 max-w-lg text-pretty text-lg text-brand-graphite/80">
              Na Casa Herbert, quem conversa com você é quem cuida de você: o Herbert ouve a sua
              história, avalia o couro cabeludo e conduz cada procedimento pessoalmente.
            </p>
          </FadeIn>
          <FadeIn trigger="load" delay={1.05}>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <LinkButton href="/agendar" variant="primary">
                Agendar avaliação
              </LinkButton>
              <LinkButton href="/servicos" variant="secondary">
                Conhecer nossos cuidados
              </LinkButton>
            </div>
          </FadeIn>

          <WelcomeBack />

          {nextOpenings ? (
            <FadeIn trigger="load" delay={1.2}>
              <div className="mt-10 max-w-xl rounded-2xl bg-white/80 p-4 shadow-softer ring-1 ring-brand-beige sm:p-5">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-brand-moss">
                  <CalendarCheck size={16} strokeWidth={1.75} aria-hidden="true" />
                  Próximos horários livres · {nextOpenings.serviceName}
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {nextOpenings.openings.map((opening) => (
                    <li key={opening.date}>
                      <Link
                        href={`/agendar?service=${nextOpenings.serviceId}&date=${opening.date}&time=${opening.startTime}`}
                        className="group inline-flex items-baseline gap-1.5 rounded-xl border border-brand-beige bg-brand-cream/60 px-3.5 py-2 text-sm transition hover:-translate-y-0.5 hover:border-brand-moss/50 hover:bg-white hover:shadow-softer"
                      >
                        <span className="font-medium text-brand-graphite">{formatChipDatePtBR(opening.date)}</span>
                        <span className="text-brand-forest">{opening.startTime}</span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href={`/agendar?service=${nextOpenings.serviceId}`}
                      className="group inline-flex items-center gap-1 rounded-xl px-2 py-2 text-sm font-medium text-brand-forest"
                    >
                      Outros dias
                      <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                </ul>
              </div>
            </FadeIn>
          ) : null}
        </div>

        <div className="relative">
          <CurtainReveal mode="load" direction="right" delay={0.2}>
            <HeroPhoto slot="home.hero" alt="Fachada da Casa Herbert em Orlândia" />
          </CurtainReveal>
          <FadeIn trigger="load" delay={1.4}>
            <HandNote arrow="up-left" className="mt-3 w-fit pl-6 sm:ml-auto sm:pl-0 sm:pr-16">
              é aqui: Av. Onze, 668
            </HandNote>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
