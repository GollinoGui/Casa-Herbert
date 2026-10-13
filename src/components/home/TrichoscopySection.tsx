import { LinkButton } from "@/components/ui/Button";
import { HandNote } from "@/components/ui/HandNote";
import { FadeIn } from "@/components/motion/FadeIn";
import { WordsRise } from "@/components/motion/WordsRise";
import { ZoomLens } from "@/components/motion/ZoomLens";

export function TrichoscopySection() {
  return (
    <section className="wave-top section-padding relative overflow-hidden bg-brand-cream bg-gradient-to-br from-brand-beige/50 via-brand-cream to-brand-sage/15">
      <div className="container-herbert relative grid items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div>
          <FadeIn>
            <ZoomLens
              slot="home.tricoscopia"
              alt="Couro cabeludo e fios vistos de perto, como na tricoscopia"
              className="aspect-[4/3] w-full shadow-soft"
              hint={
                <HandNote arrow="up-left" className="mt-3 pl-6">
                  passe o dedo (ou o mouse) na foto
                </HandNote>
              }
            />
          </FadeIn>
        </div>

        <div>
          <FadeIn>
            <p className="eyebrow mb-3">Tricoscopia</p>
          </FadeIn>
          <WordsRise
            text="Olhar de perto muda a conversa"
            className="text-balance font-serif text-3xl text-brand-forest sm:text-4xl"
          />
          <FadeIn delay={0.1}>
            <div className="mt-5 max-w-lg space-y-4 text-brand-graphite/80">
              <p>
                Na avaliação, a tricoscopia amplia o couro cabeludo e os fios para observar detalhes que não
                aparecem a olho nu.
              </p>
              <p>
                É ela que ajuda a acompanhar, retorno após retorno, como o seu couro cabeludo responde ao
                cuidado — junto com a terapia capilar e a fotobiomodulação, quando fazem parte do seu protocolo.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="mt-8">
              <LinkButton href="/terapia-capilar" variant="secondary">
                Conhecer a terapia capilar
              </LinkButton>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
