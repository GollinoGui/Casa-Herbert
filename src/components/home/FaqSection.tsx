import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { WordsRise } from "@/components/motion/WordsRise";

const QUESTIONS = [
  {
    question: "A avaliação dói?",
    answer:
      "Não. A avaliação é conversa e observação. Na tricoscopia, uma câmera de aumento é apoiada sobre o couro cabeludo — nada invasivo.",
  },
  {
    question: "Quantas sessões vou precisar?",
    answer:
      "Depende do que a avaliação mostrar. O número de sessões e o intervalo entre elas fazem parte do seu protocolo e são revistos a cada retorno.",
  },
  {
    question: "Posso continuar pintando ou escovando o cabelo?",
    answer:
      "Conte a sua rotina na conversa inicial: o protocolo é pensado em cima dela, e o Herbert orienta o que vale ajustar, se for preciso.",
  },
  {
    question: "Vocês atendem sem hora marcada?",
    answer: "Não — o atendimento é somente com hora marcada, para que cada visita tenha o tempo que precisa.",
    link: { href: "/agendar", label: "Agendar pelo site" },
  },
  {
    question: "Como sei que meu horário foi confirmado?",
    answer:
      "Você escolhe o serviço, o dia e o horário aqui no site, e a confirmação da Casa Herbert chega pelo WhatsApp.",
  },
  {
    question: "Vocês também cortam cabelo?",
    answer: "Sim, fazemos corte feminino e masculino, sempre com atenção à saúde do couro cabeludo.",
    link: { href: "/servicos", label: "Ver todos os serviços" },
  },
];

export function FaqSection() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QUESTIONS.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };

  return (
    <section className="wave-top-alt section-padding relative overflow-hidden bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container-herbert relative grid gap-12 lg:grid-cols-[0.8fr_1.6fr] lg:gap-16">
        <div>
          <FadeIn>
            <p className="eyebrow mb-3">Dúvidas</p>
          </FadeIn>
          <WordsRise
            text="O que mais nos perguntam"
            className="text-balance font-serif text-3xl text-brand-forest sm:text-4xl"
          />
          <FadeIn delay={0.1}>
            <p className="mt-4 max-w-sm text-brand-graphite/80">
              Ficou outra dúvida? Pergunte direto pelo{" "}
              <Link href="/contato" className="font-medium text-brand-forest underline underline-offset-4">
                contato
              </Link>
              .
            </p>
          </FadeIn>
        </div>

        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {QUESTIONS.map((item, index) => (
            // O FadeIn é a própria <div> que agrupa dt/dd — uma div a mais entre ela e o
            // <dl> deixaria o HTML inválido.
            <FadeIn key={item.question} delay={0.05 * (index % 2)} className="border-t border-brand-beige pt-5">
              <dt className="font-serif text-lg text-brand-forest">{item.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-brand-graphite/80">
                {item.answer}
                {item.link ? (
                  <>
                    {" "}
                    <Link href={item.link.href} className="font-medium text-brand-forest underline underline-offset-4">
                      {item.link.label}
                    </Link>
                  </>
                ) : null}
              </dd>
            </FadeIn>
          ))}
        </dl>
      </div>
    </section>
  );
}
