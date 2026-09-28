import type { LucideIcon } from "lucide-react";
import { Leaf, Microscope, Sparkles, Sun } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SiteImage } from "@/components/ui/SiteImage";
import { SectionHeading } from "@/components/ui/Card";
import { AnimatedTabs } from "@/components/ui/AnimatedTabs";
import { FadeIn } from "@/components/motion/FadeIn";
import { FloatingIcon } from "@/components/motion/FloatingIcon";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { MarginThread } from "@/components/motion/MarginThread";

interface Tab {
  key: string;
  tabLabel: string;
  title: string;
  description: string;
  points: { icon: LucideIcon; label: string }[];
  imageSlot: string;
  imageLabel: string;
  imageTone: "sage" | "gold" | "cream";
}

const TABS: Tab[] = [
  {
    key: "terapia",
    tabLabel: "Terapia Capilar",
    title: "Acompanhamento contínuo da saúde capilar",
    description:
      "Unimos observação, tricoscopia e protocolos individualizados para acompanhar a saúde capilar de cada cliente ao longo do tempo — sempre a partir da necessidade real de cada pessoa.",
    points: [
      { icon: Leaf, label: "Avaliação individual do couro cabeludo" },
      { icon: Microscope, label: "Acompanhamento por tricoscopia" },
      { icon: Sun, label: "Protocolos personalizados de cuidado" },
    ],
    imageSlot: "home.terapia",
    imageLabel: "Avaliação capilar individual",
    imageTone: "sage",
  },
  {
    key: "fotobio",
    tabLabel: "Fotobiomodulação",
    title: "Luz de baixa intensidade a favor do seu couro cabeludo",
    description:
      "A fotobiomodulação é uma das etapas do acompanhamento capilar na Casa Herbert, indicada dentro do protocolo individual de cada cliente como parte do cuidado contínuo com a saúde do couro cabeludo.",
    points: [
      { icon: Sun, label: "Sessões de luz de baixa intensidade" },
      { icon: Sparkles, label: "Indicada dentro do protocolo individual" },
      { icon: Leaf, label: "Acompanhamento contínuo da resposta capilar" },
    ],
    imageSlot: "home.fotobio",
    imageLabel: "Sessão de fotobiomodulação",
    imageTone: "gold",
  },
];

export function TherapyPhotobioSection() {
  const tabs = TABS.map((tab) => ({
    id: tab.key,
    label: tab.tabLabel,
    content: (
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <FadeIn direction="right">
          <SiteImage
            slot={tab.imageSlot}
            alt={tab.imageLabel}
            placeholderTone={tab.imageTone}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[4/3] w-full"
          />
        </FadeIn>
        <FadeIn direction="left" delay={0.05}>
          <h3 className="font-serif text-2xl text-brand-forest sm:text-3xl">{tab.title}</h3>
          <p className="mt-5 text-brand-graphite/80">{tab.description}</p>
          <ul className="mt-6 space-y-3 text-sm text-brand-graphite/80">
            {tab.points.map((point) => (
              <li key={point.label} className="flex items-center gap-2.5">
                <point.icon size={17} className="shrink-0 text-brand-moss" />
                {point.label}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <LinkButton href="/terapia-capilar" variant="secondary">
              Conhecer a terapia capilar
            </LinkButton>
          </div>
        </FadeIn>
      </div>
    ),
  }));

  return (
    <section className="section-padding relative overflow-hidden bg-gradient-to-br from-brand-beige/50 via-brand-cream to-brand-sage/15">
      <div className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-brand-moss/10 blur-3xl" />
      <FloatingIcon icon={Sparkles} size={26} speed="slow" className="pointer-events-none absolute right-10 top-14 hidden text-brand-gold/40 lg:block" />
      <ParallaxLeaf className="pointer-events-none absolute left-4 bottom-8 hidden lg:block" size={50} variant="branch" tone="moss" />
      <MarginThread side="left" tone="gold" className="top-10 bottom-10" />
      <MarginThread side="right" tone="gold" className="top-10 bottom-10" />

      <div className="container-herbert relative">
        <FadeIn>
          <SectionHeading
            eyebrow="Terapia Capilar & Fotobiomodulação"
            title="Cuidado contínuo para a saúde do couro cabeludo"
            description="Terapia capilar e fotobiomodulação caminham juntas no protocolo individual de cada cliente — observação, tricoscopia e luz de baixa intensidade a serviço da sua saúde capilar ao longo do tempo."
          />
        </FadeIn>

        <FadeIn delay={0.1}>
          <AnimatedTabs
            tabs={tabs}
            ariaLabel="Terapia Capilar e Fotobiomodulação"
            className="mt-10"
          />
        </FadeIn>
      </div>
    </section>
  );
}
