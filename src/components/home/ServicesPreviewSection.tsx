"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import { ArrowRight, Clock } from "lucide-react";
import type { Service } from "@/types";
import { LinkButton } from "@/components/ui/Button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { TypewriterText } from "@/components/motion/TypewriterText";
import { WordsRise } from "@/components/motion/WordsRise";
import { ServiceDetailModal } from "@/components/services/ServiceDetailModal";
import { formatServiceDuration } from "@/lib/utils/service-format";
import { ScrollTrigger } from "@/lib/utils/smooth-scroll";
import { smoothScrollToY } from "@/lib/utils/scroll";
import { cn } from "@/lib/utils/cn";

// O assistente de agendamento (zod, date-fns, calendário) só é baixado quando alguém
// pede para agendar — antes ele ia inteiro no JS inicial da home.
const BookingModal = dynamic(() => import("@/components/booking/BookingModal").then((m) => m.BookingModal), {
  ssr: false,
});

const placeholderTones = ["sage", "cream", "gold"] as const;

// Quanto do painel a pessoa precisa avançar (fração da largura) para o encaixe ir
// para o próximo em vez de voltar ao atual. Pequeno de propósito: um gesto curto já
// troca de serviço, e a tela nunca fica parada no meio de dois.
const SNAP_THRESHOLD = 0.06;
const SNAP_DURATION_MS = 750;

// Tom de fundo de cada painel, em ciclo: é a borda entre dois tons cruzando a tela
// que faz a página parecer andar de lado (creme sobre creme, só os cards se mexiam).
const panelTones = ["bg-brand-cream", "bg-brand-beige/50", "bg-brand-sage/15"] as const;

// Depois do último painel a cena continua presa e vira um papel cobrindo a seção
// seguinte, que já está lá atrás — recuada, escura, meio apagada. Uma tesoura cruza a
// tela da direita para a esquerda cortando a faixa de baixo, e o papel vai cedendo pelo
// lado já solto (CUT_SCREENS telas de rolagem); terminado o corte ele cai
// (DROP_SCREENS) e a seção de trás vem para a frente (ZOOM_SCREENS).
const CUT_SCREENS = 1.1;
const DROP_SCREENS = 0.5;
const ZOOM_SCREENS = 0.9;
// Como a seção de trás aparece antes de vir para a frente.
const BEHIND_SCALE = 0.8;
const BEHIND_OPACITY = 0.55;
const BEHIND_SHADE = 0.6;
// Altura da linha de corte, em fração da tela.
const CUT_LINE = 0.82;
// A foto é a tesoura de lado, com a lâmina de trás já apagada até o pivô (ela "entra"
// no papel). Na tela ela fica deitada em 3D, quase uma linha, com a borda de cima da
// lâmina da frente sobre a linha de corte.
// Ponto dessa borda (fração da largura/altura da foto) que corre sobre a linha.
const SCISSORS_ANCHOR = { x: 0.458, y: 0.35 };
// Inclinação da borda na foto, desfeita antes de deitar a tesoura.
const SCISSORS_EDGE_DEG = 5.8;
// Quanto ela fica deitada (rotateX) e quanto oscila a cada "nhac".
const SCISSORS_LAY_DEG = 62;
const SCISSORS_SNIP_DEG = 9;
const SNIP_EVERY_PX = 150;
// Parafuso da tesoura na foto: a lâmina de trás abre e fecha em volta dele.
const SCISSORS_PIVOT = { x: 0.505, y: 0.41 };

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function clearBehind(el: HTMLElement) {
  el.style.transform = "";
  el.style.transformOrigin = "";
  el.style.opacity = "";
}

interface ServicesPreviewSectionProps {
  services: Service[];
  whatsappNumber: string;
  minAdvanceDays: number;
}

/**
 * "Nossos cuidados" como uma página que anda para a direita: a seção fica presa na
 * tela e a rolagem vertical desliza painéis do tamanho da tela — abertura, um por
 * serviço, fechamento. Quando a rolagem para, a tela encaixa no painel seguinte (ou
 * volta ao atual) conforme a direção em que a pessoa vinha.
 *
 * `sticky` nativo em vez de pin do ScrollTrigger, como no CircleTakeover: a altura da
 * seção é a da tela mais o quanto a trilha anda, e cada pixel rolado vira um pixel de
 * deslocamento lateral. Com "reduzir movimento" — e no HTML do servidor, antes da
 * hidratação — é um carrossel horizontal comum, com rolagem nativa e snap.
 */
export function ServicesPreviewSection({ services, whatsappNumber, minAdvanceDays }: ServicesPreviewSectionProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingServiceId, setBookingServiceId] = useState<string | null>(null);
  const [bookingRequested, setBookingRequested] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [activePanel, setActivePanel] = useState(0);

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const dashRef = useRef<HTMLDivElement>(null);
  const scissorsRef = useRef<HTMLDivElement>(null);
  const backBladeRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const panelWidthRef = useRef(0);
  const triggerRef = useRef<ScrollTrigger | null>(null);

  // Quais serviços entram e a foto de cada um são escolhidos em /admin/servicos.
  const preview = services.filter((s) => s.showOnHome);
  const panelCount = preview.length + 2;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const update = () => setPinned(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    const sheet = sheetRef.current;
    const nav = navRef.current;
    const dash = dashRef.current;
    const scissors = scissorsRef.current;
    const backBlade = backBladeRef.current;
    const strip = stripRef.current;
    const shade = shadeRef.current;
    if (!pinned || !section || !track || !fill || !sheet || !nav || !dash || !scissors || !backBlade || !strip || !shade)
      return;
    // A seção que fica atrás do papel (PersonalizedEvaluationSection) se marca com
    // data-cut-reveal. Sem ela, o papel só cai e a página segue.
    const next = section.nextElementSibling instanceof HTMLElement && section.nextElementSibling.matches("[data-cut-reveal]")
      ? section.nextElementSibling
      : null;

    let distance = 0;
    let screen = 0;
    let cutLength = 0;
    let dropLength = 0;
    let zoomLength = 0;
    let total = 0;
    // A borda de cima transparente da onda (wave-top) entra na altura da seção, mas o
    // trecho preso só começa depois dela: fica somada à altura e descontada no início.
    let waveBorder = 0;
    let layers: { el: HTMLElement; panel: number; lag: number }[] = [];
    let lastPanel = -1;
    let lastX = 0;
    let direction = 0;

    const measure = () => {
      track.style.transform = "";
      const width = section.clientWidth;
      panelWidthRef.current = width;
      section.style.setProperty("--panel-w", `${width}px`);
      waveBorder = parseFloat(getComputedStyle(section).borderTopWidth) || 0;
      distance = width * (panelCount - 1);
      screen = sheet.parentElement?.clientHeight || window.innerHeight;
      cutLength = screen * CUT_SCREENS;
      dropLength = screen * DROP_SCREENS;
      zoomLength = screen * ZOOM_SCREENS;
      total = distance + cutLength + dropLength + zoomLength;
      section.style.height = `calc(100svh + ${total + waveBorder}px)`;
      // A seção de trás termina a cena exatamente no topo da tela: a última tela de
      // rolagem desta é a primeira dela. Antes disso ela é puxada para cima (ver paint).
      section.style.marginBottom = `${-screen}px`;
      // Medidas (desta e das cenas dentro dela) sem o recuo aplicado.
      if (next) clearBehind(next);
      layers = Array.from(section.querySelectorAll<HTMLElement>("[data-parallax]")).map((el) => ({
        el,
        panel: Number(el.dataset.panel),
        lag: Number(el.dataset.parallax),
      }));
    };

    /**
     * c: corte, d: queda, z: zoom — cada um de 0 a 1, em sequência. `remaining` é quanto
     * falta rolar até o fim da cena: é quanto a seção de trás está abaixo do topo da tela.
     */
    const paintCut = (c: number, d: number, z: number, remaining: number) => {
      const width = panelWidthRef.current;
      const cutY = screen * CUT_LINE;
      const w = scissors.offsetWidth;
      const h = scissors.offsetHeight;
      const startX = width + w * (1 - SCISSORS_ANCHOR.x);
      const endX = -w * (1 - SCISSORS_ANCHOR.x);
      const anchorX = startX + (endX - startX) * clamp((c - 0.08) / 0.92);
      const cutX = clamp(anchorX, 0, width);
      const cutDone = width ? (width - cutX) / width : 0;
      // O "nhac": a tesoura deita e levanta um pouco, e a ponta sobe e desce.
      const snip = 0.5 - 0.5 * Math.cos(((startX - anchorX) / SNIP_EVERY_PX) * 2 * Math.PI);
      const inScene = c > 0 && z < 1;

      nav.style.opacity = String(1 - smooth(0, 0.08, c));
      dash.style.top = `${cutY}px`;
      dash.style.width = `${cutX}px`;
      dash.style.opacity = d > 0 ? "0" : String(smooth(0, 0.08, c));
      scissors.style.visibility = c > 0 && c < 1 ? "visible" : "hidden";
      scissors.style.transform = `translate3d(${anchorX - w * SCISSORS_ANCHOR.x}px, ${cutY - h * SCISSORS_ANCHOR.y}px, 0) perspective(900px) rotateX(${SCISSORS_LAY_DEG - SCISSORS_SNIP_DEG * snip}deg) rotate(${SCISSORS_EDGE_DEG - 1.5 * snip}deg)`;
      // A de trás: menos achatada que a da frente (desfaz parte do rotateX) e abrindo para
      // cima, como se saísse do plano do papel; fecha a cada "nhac".
      backBlade.style.transform = `rotate(${2 + 6 * (1 - snip)}deg) scaleY(1.7)`;

      // O papel (tudo acima da linha) pende pelo canto ainda preso, à esquerda: quanto
      // mais solto à direita, mais ele gira para baixo e abre uma fresta em cima. A
      // tira de baixo é uma cópia lisa do fundo do último painel.
      const cutting = c > 0.08;
      sheet.style.height = cutting ? `${cutY}px` : "";
      sheet.style.visibility = d >= 1 ? "hidden" : "";
      strip.style.visibility = cutting && d < 1 ? "visible" : "hidden";
      shade.style.visibility = inScene ? "visible" : "hidden";
      if (cutting) {
        const fall = d * d;
        const angle = 7 * cutDone * cutDone + 26 * fall;
        sheet.style.transformOrigin = `0px ${cutY}px`;
        sheet.style.transform = `translate3d(${fall * width * 0.08}px, ${fall * screen * 1.15}px, 0) rotate(${angle}deg)`;
        sheet.style.boxShadow = `0 30px 60px -10px rgba(46, 46, 46, ${0.15 + 0.3 * cutDone})`;
        strip.style.transform = `translate3d(0, ${fall * screen * 0.4}px, 0) rotate(${-5 * fall}deg)`;
      } else {
        sheet.style.transform = sheet.style.transformOrigin = sheet.style.boxShadow = "";
        strip.style.transform = "";
      }

      // Lá atrás, a seção seguinte: recuada e escura enquanto o papel cobre, vem para
      // a frente no zoom. Puxada para cima por `remaining` para ficar parada na tela.
      const near = smooth(0, 1, z);
      shade.style.opacity = String(BEHIND_SHADE * (1 - near));
      if (next) {
        if (inScene) {
          next.style.transformOrigin = `50% ${screen / 2}px`;
          next.style.transform = `translate3d(0, ${-remaining}px, 0) scale(${BEHIND_SCALE + (1 - BEHIND_SCALE) * near})`;
          next.style.opacity = String(BEHIND_OPACITY + (1 - BEHIND_OPACITY) * near);
        } else {
          clearBehind(next);
        }
      }
    };

    const paint = (progress: number) => {
      const scrolled = total * progress;
      const x = Math.min(scrolled, distance);
      const past = scrolled - distance;
      paintCut(
        cutLength ? clamp(past / cutLength) : 0,
        dropLength ? clamp((past - cutLength) / dropLength) : 0,
        zoomLength ? clamp((past - cutLength - dropLength) / zoomLength) : 0,
        total - scrolled,
      );
      track.style.transform = `translate3d(${-x}px, 0, 0)`;
      fill.style.transform = `scaleX(${distance ? x / distance : 0})`;
      // O fundo de cada painel anda mais devagar que o conteúdo (fica "mais longe").
      for (const { el, panel, lag } of layers) {
        el.style.transform = `translate3d(${(x - panel * panelWidthRef.current) * lag}px, 0, 0)`;
      }
      if (Math.abs(x - lastX) > 0.5) direction = Math.sign(x - lastX);
      lastX = x;
      const panel = Math.round(x / (panelWidthRef.current || 1));
      if (panel !== lastPanel) {
        lastPanel = panel;
        setActivePanel(panel);
      }
    };

    const snap = () => {
      const trigger = triggerRef.current;
      const width = panelWidthRef.current;
      if (!trigger?.isActive || !width) return;
      const x = total * trigger.progress;
      // Já na cena da tesoura: a rolagem fica livre.
      if (x > distance + 1) return;
      const position = x / width;
      const target =
        direction > 0
          ? Math.ceil(position - SNAP_THRESHOLD)
          : direction < 0
            ? Math.floor(position + SNAP_THRESHOLD)
            : Math.round(position);
      const clamped = Math.min(panelCount - 1, Math.max(0, target));
      if (Math.abs(clamped * width - x) < 1) return;
      smoothScrollToY(trigger.start + clamped * width, SNAP_DURATION_MS);
    };

    measure();
    ScrollTrigger.addEventListener("refreshInit", measure);
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: () => `top+=${waveBorder} top`,
      end: "bottom bottom",
      onUpdate: (self) => paint(self.progress),
      onRefresh: (self) => paint(self.progress),
      // Enquanto a seção está presa, o header sobe e sai: parado no topo, ele era mais
      // uma referência fixa contra a qual o movimento lateral parecia menor.
      onToggle: (self) => document.documentElement.toggleAttribute("data-hide-header", self.isActive),
    });
    triggerRef.current = trigger;
    ScrollTrigger.addEventListener("scrollEnd", snap);
    // A seção acabou de ganhar altura: as cenas abaixo dela precisam medir de novo.
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(frame);
      ScrollTrigger.removeEventListener("refreshInit", measure);
      ScrollTrigger.removeEventListener("scrollEnd", snap);
      trigger.kill();
      document.documentElement.removeAttribute("data-hide-header");
      layers.forEach(({ el }) => (el.style.transform = ""));
      triggerRef.current = null;
      section.style.height = "";
      section.style.marginBottom = "";
      section.style.removeProperty("--panel-w");
      track.style.transform = "";
      fill.style.transform = "";
      nav.style.opacity = "";
      sheet.style.height = "";
      sheet.style.transform = "";
      sheet.style.transformOrigin = "";
      sheet.style.boxShadow = "";
      sheet.style.visibility = "";
      if (next) clearBehind(next);
    };
  }, [pinned, panelCount]);

  const goTo = (panel: number) => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    smoothScrollToY(trigger.start + panel * panelWidthRef.current, 900);
  };

  // Só foco por teclado: um painel fora da tela está deslocado pela trilha, e o
  // navegador não rolaria a página até ele sozinho.
  const focusPanel = (panel: number) => (e: FocusEvent<HTMLElement>) => {
    if (e.target.matches(":focus-visible")) goTo(panel);
  };

  if (preview.length === 0) return null;

  const panelClass = (panel: number) =>
    cn(
      "relative shrink-0",
      pinned
        ? cn("h-full w-[var(--panel-w,100vw)] overflow-hidden pb-20 pt-32 sm:pb-24 sm:pt-28", panelTones[panel % panelTones.length])
        : "w-[86vw] snap-center sm:w-[70vw]",
    );

  // Camadas de fundo com parallax: só no modo preso, quando há rolagem lateral.
  const panelDecor = (panel: number, number?: string) =>
    pinned ? (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div data-parallax="0.6" data-panel={panel} className="absolute inset-0 will-change-transform">
          <div
            className={cn(
              "absolute h-80 w-80 rounded-full blur-3xl",
              panel % 2 === 0 ? "-left-16 top-1/4 bg-brand-sage/25" : "-right-10 bottom-10 bg-brand-gold/25",
            )}
          />
        </div>
        {number ? (
          <div data-parallax="0.35" data-panel={panel} className="absolute inset-0 will-change-transform">
            <span className="absolute -bottom-10 right-[4%] select-none font-serif text-[14rem] leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(203,184,154,0.45)] sm:text-[24rem]">
              {number}
            </span>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <section
      ref={sectionRef}
      id="nossos-cuidados"
      className={cn(
        "wave-top relative scroll-mt-28",
        // Presa, a seção não tem fundo próprio (os painéis têm) e fica por cima da
        // seguinte, que sobe por baixo dela na abertura do corte. A caixa cobre o topo
        // da seguinte, então só a folha recebe eventos de ponteiro.
        pinned
          ? "pointer-events-none z-10"
          : "bg-brand-cream bg-gradient-to-b from-brand-cream via-brand-cream to-brand-beige/60",
      )}
    >
      <div className={cn("relative overflow-hidden", pinned ? "sticky top-0 h-svh" : "section-padding")}>
        {pinned ? (
          <div aria-hidden="true">
            <div ref={shadeRef} className="invisible absolute inset-0 bg-brand-graphite opacity-0" />
            <div
              ref={stripRef}
              className={cn(
                "invisible absolute inset-x-0 bottom-0 origin-top-right will-change-transform",
                panelTones[(panelCount - 1) % panelTones.length],
              )}
              style={{ top: `${CUT_LINE * 100}%` }}
            />
          </div>
        ) : null}
        <div
          ref={sheetRef}
          className={pinned ? "pointer-events-auto absolute inset-x-0 top-0 h-full overflow-hidden will-change-transform" : "contents"}
        >
          <div className={pinned ? "absolute inset-x-0 top-0 h-svh" : "contents"}>
            {pinned ? null : (
              <>
                <div className="pointer-events-none absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-brand-sage/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-brand-gold/15 blur-3xl" />
              </>
            )}

            <div
              className={cn(
                "relative",
                pinned ? "h-full" : "snap-x snap-mandatory overflow-x-auto px-5 pb-4 [scrollbar-width:none]",
              )}
            >
              <div ref={trackRef} className={cn("flex w-max will-change-transform", pinned ? "h-full" : "gap-5")}>
                <div className={panelClass(0)} onFocus={focusPanel(0)}>
                  {panelDecor(0)}
                  <div className="container-herbert relative flex h-full flex-col justify-center">
                    <p className="eyebrow mb-4 inline-flex items-center gap-1.5">
                      <TypewriterText text="Nossos cuidados" />
                    </p>
                    <WordsRise
                      text="Cuidados pensados para você"
                      className="max-w-3xl font-serif text-4xl leading-tight text-brand-forest sm:text-6xl"
                    />
                    <p className="mt-5 max-w-xl text-brand-graphite/80 sm:text-lg">
                      Protocolos e serviços da Casa Herbert — todos começam por uma avaliação individual.
                    </p>
                    {pinned ? (
                      <p className="mt-10 inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-brand-moss">
                        Role para conhecer
                        <ArrowRight size={18} aria-hidden="true" className="animate-nudge-x" />
                      </p>
                    ) : null}
                  </div>
                </div>

                {preview.map((service, i) => {
                  const panel = i + 1;
                  return (
                    <article
                      key={service.id}
                      data-active={pinned && activePanel === panel}
                      onFocus={focusPanel(panel)}
                      className={panelClass(panel)}
                    >
                      {panelDecor(panel, String(i + 1).padStart(2, "0"))}
                      <div
                        className={cn(
                          "container-herbert relative flex flex-col gap-5 md:grid md:grid-cols-2 md:items-center md:gap-14",
                          pinned && "h-full",
                        )}
                      >
                        <div
                          className={cn(
                            "organic-photo relative w-full overflow-hidden bg-brand-beige/40 shadow-soft",
                            pinned ? "min-h-0 flex-1 md:h-[62svh] md:flex-none" : "aspect-[4/3]",
                          )}
                        >
                          {service.imageUrl ? (
                            <Image
                              src={service.imageUrl}
                              alt={service.name}
                              fill
                              sizes="(min-width: 768px) 50vw, 90vw"
                              className="object-cover"
                              style={{ objectPosition: service.imagePosition ?? "center" }}
                            />
                          ) : (
                            <PlaceholderImage label="" tone={placeholderTones[i % placeholderTones.length]} className="h-full w-full" />
                          )}
                        </div>

                        <div className="shrink-0">
                          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-brand-moss">
                            <span className="font-serif text-3xl normal-case tracking-normal text-brand-gold sm:text-5xl">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="h-px w-10 bg-brand-gold/60" aria-hidden="true" />
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} aria-hidden="true" /> {formatServiceDuration(service.durationMinutes)}
                            </span>
                          </div>
                          <h3 className="mt-2 font-serif text-3xl text-brand-forest sm:mt-4 sm:text-5xl">{service.name}</h3>
                          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-brand-graphite/80 sm:mt-5 sm:line-clamp-5 sm:text-lg">
                            {service.description}
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedService(service)}
                            className="btn-secondary mt-5 sm:mt-8"
                          >
                            Saiba mais <ArrowRight size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}

                <div className={panelClass(panelCount - 1)} onFocus={focusPanel(panelCount - 1)}>
                  {panelDecor(panelCount - 1)}
                  <div className="container-herbert relative flex h-full flex-col items-center justify-center text-center">
                    <p className="font-serif text-4xl italic text-brand-forest sm:text-6xl">E tem mais.</p>
                    <p className="mt-4 max-w-md text-brand-graphite/75 sm:text-lg">
                      Conheça todos os cuidados da Casa Herbert e encontre o que combina com você.
                    </p>
                    <LinkButton href="/servicos" variant="primary" className="mt-8">
                      Ver todos os cuidados
                    </LinkButton>
                  </div>
                </div>
              </div>
            </div>

            {pinned ? (
              <nav ref={navRef} aria-label="Serviços" className="absolute inset-x-0 bottom-8 sm:bottom-10">
                <div className="container-herbert">
                  <div className="relative mr-14 h-px bg-brand-beige sm:mr-0">
                    <div ref={fillRef} className="absolute inset-0 origin-left scale-x-0 bg-brand-forest" />
                    {preview.map((service, i) => {
                      const panel = i + 1;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => goTo(panel)}
                          aria-label={service.name}
                          aria-current={activePanel === panel ? "step" : undefined}
                          className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 p-2"
                          style={{ left: `${(panel / (panelCount - 1)) * 100}%` }}
                        >
                          <span
                            className={cn(
                              "block h-3 w-3 rounded-full border-2 transition-all duration-300",
                              activePanel >= panel ? "border-brand-forest bg-brand-forest" : "border-brand-beige bg-brand-cream",
                              activePanel === panel && "scale-125",
                            )}
                          />
                          <span
                            className={cn(
                              "absolute left-1/2 top-full hidden max-w-[9rem] -translate-x-1/2 truncate whitespace-nowrap text-xs transition-colors md:block",
                              activePanel === panel
                                ? "text-brand-forest"
                                : "text-brand-graphite/50 group-hover:text-brand-graphite/80",
                            )}
                          >
                            {service.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </nav>
            ) : null}
          </div>
        </div>

        {pinned ? (
          <div aria-hidden="true">
            <div ref={dashRef} className="absolute left-0 w-0 border-t-2 border-dashed border-brand-graphite/30 opacity-0" />
            <div
              ref={scissorsRef}
              className="invisible absolute left-0 top-0 w-[min(80vw,600px)] drop-shadow-[0_6px_8px_rgba(46,46,46,0.25)] will-change-transform"
              style={{ transformOrigin: `${SCISSORS_ANCHOR.x * 100}% ${SCISSORS_ANCHOR.y * 100}%` }}
            >
              {/* A lâmina de trás, vista "através" do papel: uma silhueta escura e borrada,
                  menos deitada que a da frente (ela entra na tela) e girando no pivô. */}
              <div
                ref={backBladeRef}
                className="absolute inset-0"
                style={{ transformOrigin: `${SCISSORS_PIVOT.x * 100}% ${SCISSORS_PIVOT.y * 100}%` }}
              >
                <Image
                  src="/decor/tesoura-perfil-tras.webp"
                  alt=""
                  width={1400}
                  height={363}
                  sizes="600px"
                  className="h-auto w-full opacity-40 [filter:brightness(0.3)_blur(2px)]"
                />
              </div>
              <Image src="/decor/tesoura-perfil.webp" alt="" width={1400} height={363} sizes="600px" className="relative h-auto w-full" />
            </div>
          </div>
        ) : null}
      </div>

      <ServiceDetailModal
        service={selectedService}
        whatsappNumber={whatsappNumber}
        onClose={() => setSelectedService(null)}
        onSchedule={(service) => {
          setSelectedService(null);
          setBookingRequested(true);
          setBookingServiceId(service.id);
        }}
      />

      {bookingRequested ? (
        <BookingModal
          open={bookingServiceId !== null}
          onClose={() => setBookingServiceId(null)}
          services={services}
          minAdvanceDays={minAdvanceDays}
          preselectedServiceId={bookingServiceId ?? undefined}
        />
      ) : null}
    </section>
  );
}
