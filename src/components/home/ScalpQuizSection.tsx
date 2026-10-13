"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, RotateCcw } from "lucide-react";
import type { Service } from "@/types";
import { LinkButton } from "@/components/ui/Button";
import { HandNote } from "@/components/ui/HandNote";
import { FadeIn } from "@/components/motion/FadeIn";
import { WordsRise } from "@/components/motion/WordsRise";
import { cn } from "@/lib/utils/cn";

type Focus = "queda" | "oleosidade" | "fios" | "prevencao";

interface Option {
  value: string;
  label: string;
  /** Linha que vai para a observação do pedido — o Herbert lê antes da conversa. */
  summary: string;
  /** O que vale a pessoa levar pensado para a avaliação. */
  tip?: string;
}

interface Question {
  id: string;
  title: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    id: "focus",
    title: "O que mais tem chamado a sua atenção?",
    options: [
      { value: "queda", label: "Fios caindo mais do que o normal", summary: "percebe mais fios caindo" },
      { value: "oleosidade", label: "Couro cabeludo oleoso, sensível ou com coceira", summary: "couro cabeludo oleoso/sensível" },
      { value: "fios", label: "Fios fracos, opacos ou ressecados", summary: "fios fracos ou ressecados" },
      { value: "prevencao", label: "Nada específico — quero cuidar e prevenir", summary: "quer cuidar e prevenir" },
    ],
  },
  {
    id: "since",
    title: "Há quanto tempo você percebe isso?",
    options: [
      { value: "recente", label: "Começou há pouco", summary: "há pouco tempo" },
      { value: "meses", label: "Há alguns meses", summary: "há alguns meses" },
      {
        value: "anos",
        label: "Há mais de um ano",
        summary: "há mais de um ano",
        tip: "Como já vem de algum tempo, vale lembrar o que você já usou ou tentou até aqui.",
      },
      { value: "nada", label: "Não se aplica", summary: "" },
    ],
  },
  {
    id: "chemistry",
    title: "Seu cabelo passou por química no último ano?",
    options: [
      {
        value: "coloracao",
        label: "Sim, coloração ou descoloração",
        summary: "fez coloração/descoloração",
        tip: "Se lembrar, anote o nome dos produtos de química — ajuda a pensar o protocolo junto com a sua rotina.",
      },
      {
        value: "alisamento",
        label: "Sim, alisamento ou progressiva",
        summary: "fez alisamento/progressiva",
        tip: "Se lembrar, anote quando foi a última progressiva e com qual produto.",
      },
      { value: "nao", label: "Não", summary: "sem química recente" },
    ],
  },
  {
    id: "wash",
    title: "Com que frequência você lava o cabelo?",
    options: [
      { value: "diario", label: "Todo dia", summary: "lava todo dia" },
      { value: "alternado", label: "A cada 2 ou 3 dias", summary: "lava a cada 2-3 dias" },
      {
        value: "semanal",
        label: "Uma vez por semana ou menos",
        summary: "lava 1x por semana ou menos",
        tip: "Conte como é o seu dia a dia com o cabelo — o protocolo é montado em cima da sua rotina, não o contrário.",
      },
    ],
  },
];

const RESULTS: Record<Focus, { title: string; text: string; serviceSlugs: string[] }> = {
  queda: {
    title: "Vamos olhar a queda de perto",
    text: "Na avaliação, o Herbert ouve a sua história e, com a tricoscopia, observa o couro cabeludo e os fios bem de perto. É a partir daí que se pensa o seu protocolo de cuidado.",
    serviceSlugs: ["tricoscopia", "terapia-capilar", "fotobiomodulacao"],
  },
  oleosidade: {
    title: "O couro cabeludo pede atenção",
    text: "Oleosidade e sensibilidade costumam ter a ver com a rotina e com o equilíbrio do couro cabeludo. A avaliação começa por aí — pela sua rotina — e segue com a observação de perto.",
    serviceSlugs: ["tricoscopia", "terapia-capilar"],
  },
  fios: {
    title: "Cuidar dos fios começa pela raiz",
    text: "Fios fracos ou ressecados contam muito sobre a rotina e os procedimentos pelos quais o cabelo passou. Na avaliação, o Herbert entende esse histórico para pensar o cuidado certo para os seus fios.",
    serviceSlugs: ["terapia-capilar", "velaterapia"],
  },
  prevencao: {
    title: "Prevenir é a melhor forma de cuidar",
    text: "Mesmo sem nada que incomode, uma avaliação mostra como está a saúde do seu couro cabeludo hoje — e vira o ponto de partida para acompanhar ao longo do tempo.",
    serviceSlugs: ["tricoscopia", "terapia-capilar"],
  },
};

function bookingNotes(answers: Record<string, string>): string {
  const parts = QUESTIONS.map((q) => q.options.find((o) => o.value === answers[q.id])?.summary).filter(Boolean);
  return `Pelo questionário do site: ${parts.join("; ")}.`;
}

interface ScalpQuizSectionProps {
  services: Service[];
  evaluationServiceId: string | null;
}

/**
 * Quatro perguntas que viram um ponto de partida para a avaliação — nunca uma resposta
 * pronta. As respostas seguem como observação no pedido de agendamento, para o Herbert
 * já chegar à conversa sabendo o que trouxe a pessoa.
 */
export function ScalpQuizSection({ services, evaluationServiceId }: ScalpQuizSectionProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);

  const done = index >= QUESTIONS.length;
  const question = QUESTIONS[Math.min(index, QUESTIONS.length - 1)];

  function choose(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setIndex((i) => i + 1);
  }

  function restart() {
    setAnswers({});
    setIndex(0);
  }

  const result = done ? RESULTS[answers.focus as Focus] : null;
  const tips = done
    ? QUESTIONS.map((q) => q.options.find((o) => o.value === answers[q.id])?.tip).filter((t): t is string => !!t)
    : [];
  const suggested = result
    ? result.serviceSlugs
        .map((slug) => services.find((s) => s.slug === slug))
        .filter((s): s is Service => !!s)
    : [];
  const bookingHref = evaluationServiceId
    ? `/agendar?service=${evaluationServiceId}&notas=${encodeURIComponent(bookingNotes(answers))}`
    : "/agendar";

  return (
    <section className="wave-top section-padding relative overflow-hidden bg-brand-beige/70">
      <div className="container-herbert relative grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <FadeIn>
            <p className="eyebrow mb-3">Antes de vir</p>
          </FadeIn>
          <WordsRise
            text="Como está o seu couro cabeludo?"
            className="text-balance font-serif text-3xl text-brand-forest sm:text-4xl"
          />
          <FadeIn delay={0.1}>
            <p className="mt-4 max-w-md text-brand-graphite/80">
              Quatro perguntas rápidas para você chegar à avaliação já sabendo por onde começar a conversa. Suas
              respostas seguem junto com o pedido de agendamento.
            </p>
            <HandNote arrow="down-right" className="mt-6 -rotate-2">
              leva menos de um minuto
            </HandNote>
          </FadeIn>
        </div>

        <FadeIn delay={0.1}>
          <div className="relative min-h-[26rem] rounded-3xl bg-white p-6 shadow-soft ring-1 ring-brand-beige sm:p-8">
            {!done ? (
              <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex gap-1.5" aria-hidden="true">
                  {QUESTIONS.map((q, i) => (
                    <span
                      key={q.id}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        i <= index ? "w-8 bg-brand-forest" : "w-4 bg-brand-beige"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-brand-graphite/60">
                  {index + 1} de {QUESTIONS.length}
                </span>
              </div>
            ) : null}

            <AnimatePresence mode="wait">
              {!done ? (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h3 className="font-serif text-2xl text-brand-forest">{question.title}</h3>
                  <ul className="mt-5 space-y-2.5">
                    {question.options.map((option) => {
                      const selected = answers[question.id] === option.value;
                      return (
                        <li key={option.value}>
                          <button
                            type="button"
                            onClick={() => choose(option.value)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition",
                              selected
                                ? "border-brand-forest bg-brand-forest/5"
                                : "border-brand-beige hover:border-brand-moss/50 hover:bg-brand-cream/60"
                            )}
                          >
                            <span className="text-brand-graphite">{option.label}</span>
                            {selected ? <Check size={18} className="shrink-0 text-brand-forest" aria-hidden="true" /> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {index > 0 ? (
                    <button
                      type="button"
                      onClick={() => setIndex((i) => i - 1)}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm text-brand-moss transition hover:text-brand-forest"
                    >
                      <ChevronLeft size={16} aria-hidden="true" /> Voltar
                    </button>
                  ) : null}
                </motion.div>
              ) : result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  aria-live="polite"
                >
                  <p className="eyebrow mb-2">Seu ponto de partida</p>
                  <h3 className="font-serif text-2xl text-brand-forest sm:text-3xl">{result.title}</h3>
                  <p className="mt-3 text-brand-graphite/80">{result.text}</p>

                  {suggested.length > 0 ? (
                    <div className="mt-5">
                      <p className="text-sm font-medium text-brand-graphite">Cuidados que podem entrar na conversa:</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {suggested.map((service) => (
                          <li key={service.id}>
                            <Link
                              href="/servicos"
                              className="inline-flex rounded-full bg-brand-sage/25 px-3 py-1 text-sm text-brand-graphite transition hover:bg-brand-sage/40"
                            >
                              {service.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {tips.length > 0 ? (
                    <div className="mt-5 rounded-2xl bg-brand-cream/70 p-4">
                      <p className="font-hand text-xl text-brand-moss">para levar anotado:</p>
                      <ul className="mt-1 space-y-1.5 text-sm text-brand-graphite/80">
                        {tips.map((tip) => (
                          <li key={tip} className="flex gap-2">
                            <span aria-hidden="true" className="text-brand-gold">
                              —
                            </span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <LinkButton href={bookingHref} variant="primary">
                      Agendar minha avaliação
                      <ArrowRight size={16} aria-hidden="true" className="ml-1" />
                    </LinkButton>
                    <button
                      type="button"
                      onClick={restart}
                      className="inline-flex items-center gap-1.5 self-start px-2 py-2 text-sm text-brand-moss transition hover:text-brand-forest sm:self-auto"
                    >
                      <RotateCcw size={14} aria-hidden="true" /> Refazer
                    </button>
                  </div>
                  <p className="mt-5 text-xs text-brand-graphite/60">
                    Este questionário não substitui a avaliação individual — é só o começo da conversa.
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
