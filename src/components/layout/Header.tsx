"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ScrollProgressScissors } from "@/components/layout/ScrollProgressScissors";

const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/sobre", label: "Sobre" },
  { href: "/#nossos-cuidados", label: "Serviços" },
  { href: "/produtos", label: "Produtos" },
  { href: "/contato", label: "Contato" },
];

const HEADER_LAYOUT_TRANSITION = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function handleNavClick(href: string) {
    return (event: React.MouseEvent<HTMLAnchorElement>) => {
      setMenuOpen(false);
      const [path, hash] = href.split("#");
      const targetPath = path || "/";
      if (targetPath !== pathname) return;
      event.preventDefault();
      if (hash) {
        const target = document.getElementById(hash);
        target?.scrollIntoView({ behavior: "smooth" });
        // O primeiro scroll que cruza o ENTER_THRESHOLD dispara o re-render que anima
        // o pill do header (layout do framer-motion): a medição de um elemento sticky
        // faz o framer-motion chamar window.scrollTo internamente, o que cancela o
        // smooth scroll em andamento. Repetir a chamada depois que esse re-render já
        // aconteceu retoma o scroll até o destino certo.
        window.setTimeout(() => target?.scrollIntoView({ behavior: "smooth" }), 300);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      <ScrollProgressScissors />
      <motion.div
        layout
        transition={{ layout: HEADER_LAYOUT_TRANSITION }}
        className={cn(
          "mx-auto flex items-center justify-between gap-8 overflow-hidden transition-[background-color,border-color,border-radius,box-shadow,backdrop-filter] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled
            ? "mt-4 h-[4.5rem] w-fit max-w-[95vw] rounded-full border border-brand-beige/70 bg-brand-cream/95 px-8 shadow-soft backdrop-blur-md sm:px-10"
            : "mt-0 h-20 w-full max-w-6xl rounded-none border border-transparent bg-transparent px-5 sm:px-8"
        )}
      >
        <Link href="/" onClick={handleNavClick("/")} className="flex min-w-0 shrink-0 items-center gap-2.5">
          <motion.span
            layout
            transition={{ layout: HEADER_LAYOUT_TRANSITION }}
            className={cn(
              "relative shrink-0 overflow-hidden rounded-full ring-1 ring-brand-beige",
              scrolled ? "h-11 w-11" : "h-12 w-12"
            )}
          >
            <Image src="/logo.jpg" alt="Casa Herbert" fill sizes="48px" className="object-cover" priority />
          </motion.span>
          <span className="flex min-w-0 flex-col leading-tight">
            <motion.span
              layout
              transition={{ layout: HEADER_LAYOUT_TRANSITION }}
              className={cn("whitespace-nowrap font-serif text-brand-forest", scrolled ? "text-base" : "text-xl sm:text-2xl")}
            >
              Casa Herbert
            </motion.span>
            <AnimatePresence initial={false}>
              {!scrolled && (
                <motion.span
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={HEADER_LAYOUT_TRANSITION}
                  className="max-w-[10rem] overflow-hidden text-[0.65rem] uppercase leading-snug tracking-[0.2em] text-brand-moss sm:max-w-none sm:whitespace-nowrap"
                >
                  Embelezamento &amp; Saúde Capilar
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 xl:flex">
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
          <motion.div layout transition={{ layout: HEADER_LAYOUT_TRANSITION }} className="shrink-0">
            <Link
              href="/agendar"
              className="btn-primary whitespace-nowrap !px-6 !py-2.5 text-sm"
            >
              Agendar avaliação
            </Link>
          </motion.div>
        </nav>

        <button
          className="rounded-full p-2 text-brand-forest xl:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Abrir menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </motion.div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "mx-auto overflow-hidden bg-brand-cream shadow-soft xl:hidden",
              scrolled ? "mt-2 w-[92%] max-w-3xl rounded-3xl border border-brand-beige/70" : "w-full border-t border-brand-beige"
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
