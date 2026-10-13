import { LinkButton } from "@/components/ui/Button";
import { HandNote } from "@/components/ui/HandNote";
import { FadeIn } from "@/components/motion/FadeIn";
import { Marker } from "@/components/motion/Marker";
import { WordsRise } from "@/components/motion/WordsRise";

const STEPS = [
  {
    title: "Você conta, o Herbert ouve",
    description: "Sua rotina, o histórico do seu cabelo e o que te trouxe até aqui. É a parte mais importante da visita.",
    note: "sem pressa",
  },
  {
    title: "Olhar de perto",
    description: "O couro cabeludo e os fios são observados com atenção — e, com a tricoscopia, bem de perto.",
    note: "veja na lupa, logo abaixo",
  },
  {
    title: "Um protocolo só seu",
    description: "O caminho de cuidado é definido junto com você, a partir do que a avaliação mostrou.",
  },
  {
    title: "Acompanhamento",
    description: "A cada retorno, a evolução é acompanhada e o protocolo, ajustado quando precisa.",
    note: "sempre com o Herbert",
  },
];

/**
 * A primeira visita contada passo a passo, como uma página do caderno de quem acompanha.
 * Fica atrás do papel cortado no fim da seção de cuidados e vem para a frente quando ele
 * cai (data-cut-reveal); por isso não entra como "folha empilhada".
 */
export function FirstVisitSection() {
  return (
    <section data-no-stack data-cut-reveal className="wave-top-alt notebook-paper section-padding relative overflow-hidden">
      <div className="container-herbert relative">
        <div className="max-w-2xl lg:ml-16">
          <FadeIn>
            <p className="eyebrow mb-3">Sua primeira visita</p>
          </FadeIn>
          <WordsRise
            text="Nada de fórmula pronta: tudo começa por você"
            className="text-balance font-serif text-3xl text-brand-forest sm:text-4xl"
          />
          <FadeIn delay={0.1}>
            <p className="mt-4 text-brand-graphite/80">
              Antes de qualquer protocolo, o tempo da visita é dedicado a entender a sua saúde capilar. É essa{" "}
              <Marker>avaliação individual</Marker> que orienta cada decisão de cuidado.
            </p>
          </FadeIn>
        </div>

        <ol className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:ml-16">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <FadeIn delay={0.08 * index} className="flex gap-5">
                <span aria-hidden="true" className="font-serif text-5xl leading-none text-brand-gold">
                  {index + 1}
                </span>
                <div className="pt-1">
                  <h3 className="font-serif text-xl text-brand-forest">{step.title}</h3>
                  <p className="mt-2 max-w-sm text-brand-graphite/80">{step.description}</p>
                  {step.note ? (
                    <HandNote className="mt-2 -rotate-2" arrow={index === 1 ? "down-right" : undefined}>
                      {step.note}
                    </HandNote>
                  ) : null}
                </div>
              </FadeIn>
            </li>
          ))}
        </ol>

        <FadeIn delay={0.3}>
          <div className="mt-12 lg:ml-16">
            <LinkButton href="/agendar" variant="primary">
              Agendar minha avaliação
            </LinkButton>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
