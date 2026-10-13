import { SiteImage } from "@/components/ui/SiteImage";
import { LinkButton } from "@/components/ui/Button";
import { HandNote } from "@/components/ui/HandNote";
import { FadeIn } from "@/components/motion/FadeIn";
import { CurtainReveal } from "@/components/motion/CurtainReveal";
import { Marker } from "@/components/motion/Marker";
import { WordsRise } from "@/components/motion/WordsRise";

export function HerbertSection() {
  return (
    <section className="wave-top-alt section-padding relative overflow-hidden bg-white">
      <div className="container-herbert relative grid items-center gap-12 md:grid-cols-[0.85fr_1fr] lg:gap-20">
        <div className="relative mx-auto w-full max-w-sm md:max-w-none">
          <CurtainReveal>
            <SiteImage
              slot="home.herbert"
              alt="Herbert, da Casa Herbert"
              placeholderLabel="Foto do Herbert"
              placeholderTone="gold"
              sizes="(min-width: 768px) 40vw, 90vw"
              className="organic-photo aspect-[4/5] w-full shadow-soft"
            />
          </CurtainReveal>
          <FadeIn delay={0.5}>
            <HandNote arrow="up-left" className="mt-3 pl-8">
              quem vai te receber
            </HandNote>
          </FadeIn>
        </div>

        <div>
          <FadeIn>
            <p className="eyebrow mb-3">Quem cuida de você</p>
          </FadeIn>
          <WordsRise text="Prazer, Herbert." className="font-serif text-4xl text-brand-forest sm:text-5xl" />
          <FadeIn delay={0.15}>
            <div className="mt-6 max-w-xl space-y-4 text-pretty text-brand-graphite/80 sm:text-lg">
              <p>
                É o Herbert quem recebe você, conversa sobre a sua rotina e a história do seu cabelo, faz a
                avaliação e conduz cada procedimento.
              </p>
              <p>
                Você não passa de mão em mão: <Marker>a mesma pessoa que ouve a sua história</Marker> acompanha
                cada etapa do seu cuidado e a sua evolução a cada retorno.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p className="mt-6 font-hand text-4xl text-brand-forest">
              — Herbert
            </p>
            <div className="mt-8">
              <LinkButton href="/sobre" variant="secondary">
                Conhecer a Casa Herbert
              </LinkButton>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
