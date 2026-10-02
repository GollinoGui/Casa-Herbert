"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { smoothScrollToElementId, smoothScrollToY } from "@/lib/utils/scroll";
import { ScrollProgressScissors } from "@/components/layout/ScrollProgressScissors";

const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/sobre", label: "Sobre" },
  { href: "/#nossos-cuidados", label: "Serviços" },
  { href: "/produtos", label: "Produtos" },
  { href: "/contato", label: "Contato" },
];

const HEADER_LAYOUT_TRANSITION = { duration: 0.8, ease: [0.45, 0, 0.2, 1] as const };

// Medidas do estado "pill" que precisam bater com as classes abaixo: logo h-11,
// gap-2.5 do link, gap-8 da linha, px-8 / sm:px-10 e a borda de 1px.
const PILL_LOGO = 44;
const PILL_LOGO_GAP = 10;
const PILL_ROW_GAP = 32;
const PILL_BORDER = 2;

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pillWidth, setPillWidth] = useState<number | null>(null);
  const titleMeasureRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Duas margens (não um único ponto de corte) evitam que o header pisque
    // entrando e saindo do estado "scrolled" quando o scroll real (inércia de
    // trackpad, rubber-band no topo) oscila alguns pixels em torno do limite.
    const ENTER_THRESHOLD = 64;
    const EXIT_THRESHOLD = 24;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled((prev) => {
        if (y > ENTER_THRESHOLD) return true;
        if (y < EXIT_THRESHOLD) return false;
        return prev;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // `width: fit-content` não é animável: o pill saltava direto para a largura final
  // e o logo dava um pulo em direção à nav. Calculamos essa largura em px para a
  // transição de width funcionar.
  useEffect(() => {
    const title = titleMeasureRef.current;
    const right = rightRef.current;
    if (!title || !right) return;
    const smQuery = window.matchMedia("(min-width: 640px)");
    const measure = () => {
      const padding = smQuery.matches ? 40 : 32;
      setPillWidth(
        Math.ceil(PILL_LOGO + PILL_LOGO_GAP + title.offsetWidth + PILL_ROW_GAP + right.offsetWidth + padding * 2 + PILL_BORDER)
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(title);
    observer.observe(right);
    smQuery.addEventListener("change", measure);
    document.fonts?.ready.then(measure);
    return () => {
      observer.disconnect();
      smQuery.removeEventListener("change", measure);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  function handleNavClick(href: string) {
    return (event: React.MouseEvent<HTMLAnchorElement>) => {
      setMenuOpen(false);
      const [path, hash] = href.split("#");
      const targetPath = path || "/";
      if (targetPath !== pathname) return;
      event.preventDefault();
      if (hash) {
        smoothScrollToElementId(hash);
      } else {
        smoothScrollToY(0);
      }
    };
  }

  return (
    <header className="site-header sticky top-0 z-40 w-full">
      <ScrollProgressScissors />
      <span
        ref={titleMeasureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap font-serif text-base"
      >
        Casa Herbert
      </span>
      <div
        // O max-width é o mesmo nos dois estados de propósito: se ele mudasse junto
        // (6xl → 95vw), em telas largas o header alargava antes de encolher e o logo
        // ia para a esquerda antes de vir para perto da nav.
        style={scrolled && pillWidth ? { width: `min(95vw, ${pillWidth}px)` } : undefined}
        className={cn(
          "mx-auto flex items-center justify-between gap-8 overflow-hidden transition-[background-color,border-color,border-radius,box-shadow,backdrop-filter,width,height,margin,padding] duration-[800ms] ease-[cubic-bezier(0.45,0,0.2,1)]",
          scrolled
            ? cn(
                "mt-4 h-[4.5rem] max-w-6xl 2xl:max-w-7xl rounded-full border border-brand-beige/70 bg-brand-cream/95 px-8 shadow-soft backdrop-blur-md sm:px-10",
                !pillWidth && "w-fit"
              )
            : "mt-0 h-20 w-full max-w-6xl rounded-none 2xl:max-w-7xl border border-transparent bg-transparent px-5 sm:px-8"
        )}
      >
        <Link href="/" onClick={handleNavClick("/")} className="flex min-w-0 shrink-0 items-center gap-2.5">
          <span
            className={cn(
              "relative shrink-0 overflow-hidden rounded-full ring-1 ring-brand-beige transition-[height,width] duration-[800ms] ease-[cubic-bezier(0.45,0,0.2,1)]",
              scrolled ? "h-11 w-11" : "h-12 w-12"
            )}
          >
            <Image src="/logo.jpg" alt="Casa Herbert" fill sizes="48px" className="object-cover" priority />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span
              className={cn(
                "whitespace-nowrap font-serif text-brand-forest transition-[font-size] duration-[800ms] ease-[cubic-bezier(0.45,0,0.2,1)]",
                scrolled ? "text-base" : "text-xl sm:text-2xl"
              )}
            >
              Casa Herbert
            </span>
            <AnimatePresence initial={false}>
              {!scrolled && (
                // Encolhe também na largura, junto com o pill: só na altura, o bloco do
                // logo segurava a largura do subtítulo até ele sair do DOM e dava um tranco.
                <motion.span
                  initial={{ opacity: 0, height: 0, width: 0 }}
                  animate={{ opacity: 1, height: "auto", width: "auto" }}
                  exit={{ opacity: 0, height: 0, width: 0 }}
                  transition={HEADER_LAYOUT_TRANSITION}
                  className="overflow-hidden"
                >
                  <span className="block w-[10rem] text-[0.65rem] uppercase leading-snug tracking-[0.2em] text-brand-moss sm:w-max sm:whitespace-nowrap">
                    Embelezamento &amp; Saúde Capilar
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </Link>

        <div ref={rightRef} className="flex shrink-0 items-center">
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleNavClick(link.href)}
                className={cn(
                  "whitespace-nowrap text-sm font-medium text-brand-graphite/75 transition-colors hover:text-brand-forest",
                  !link.href.includes("#") && pathname === link.href && "text-brand-forest"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="shrink-0">
              <Link
                href="/agendar"
                className="btn-primary whitespace-nowrap !px-6 !py-2.5 text-sm"
              >
                Agendar avaliação
              </Link>
            </div>
          </nav>

          <button
            className="rounded-full p-2 text-brand-forest lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* O menu flutua sobre a página (absolute) em vez de crescer dentro do header sticky:
          crescendo no fluxo, ele empurrava o conteúdo e a página dava um pulo ao abrir. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-nav-backdrop"
            className="fixed inset-0 -z-10 bg-brand-graphite/20 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}
        {menuOpen && (
          <motion.nav
            key="mobile-nav"
            id="mobile-nav"
            data-lenis-prevent
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute inset-x-0 top-full mx-auto max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain bg-brand-cream shadow-soft lg:hidden",
              scrolled ? "mt-2 w-[92%] max-w-3xl rounded-3xl border border-brand-beige/70" : "w-full rounded-b-3xl border-t border-brand-beige"
            )}
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={handleNavClick(link.href)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium text-brand-graphite/80 transition hover:bg-brand-forest/5 hover:text-brand-forest",
                    !link.href.includes("#") && pathname === link.href && "bg-brand-forest/5 text-brand-forest"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/agendar" className="btn-primary mt-2 justify-center">
                Agendar avaliação
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
