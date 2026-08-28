import { Leaf, Microscope, Sun } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { FadeIn } from "@/components/motion/FadeIn";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";

const POINTS = [
  { icon: Leaf, label: "Avaliação individual do couro cabeludo" },
  { icon: Microscope, label: "Acompanhamento por tricoscopia" },
  { icon: Sun, label: "Protocolos personalizados de cuidado" },
];

export function TherapyHighlightSection() {
  return (
    <section className="section-padding relative overflow-hidden bg-gradient-to-br from-brand-beige/50 via-brand-cream to-brand-sage/15">
      <div className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-brand-moss/10 blur-3xl" />
      <ParallaxLeaf className="pointer-events-none absolute left-4 bottom-8 hidden lg:block" size={50} variant="branch" tone="moss" />
      <div className="container-herbert relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <FadeIn direction="right">
          <PlaceholderImage
            label="Avaliação capilar individual"
            tone="sage"
            className="aspect-[4/3] w-full"
          />
        </FadeIn>
        <FadeIn direction="left">
          <p className="eyebrow mb-3 inline-flex items-center gap-1.5">
            <Leaf size={12} className="text-brand-moss" aria-hidden="true" />
            Terapia Capilar
          </p>
          <h2 className="font-serif text-3xl text-brand-forest sm:text-4xl">
            Cuidado contínuo para a saúde do couro cabeludo
          </h2>
          <p className="mt-5 text-brand-graphite/80">
            Unimos observação, tricoscopia e protocolos individualizados para acompanhar a saúde
            capilar de cada cliente ao longo do tempo — sempre a partir da necessidade real de cada
            pessoa.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-brand-graphite/80">
            {POINTS.map((point) => (
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
    </section>
  );
}
