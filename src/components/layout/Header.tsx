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
  { href: "/servicos", label: "Serviços" },
  { href: "/produtos", label: "Produtos" },
  { href: "/contato", label: "Contato" },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 w-full">
      <ScrollProgressScissors />
      <motion.div
        layout
        transition={{ layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
        className={cn(
          "mx-auto flex items-center justify-between gap-8 overflow-hidden",
          scrolled
            ? "mt-3 h-16 w-fit max-w-[95vw] rounded-full border border-brand-beige/70 bg-brand-cream/95 px-6 shadow-soft backdrop-blur-md sm:px-8"
            : "mt-0 h-20 w-full max-w-6xl rounded-none border border-transparent bg-transparent px-5 sm:px-8"
        )}
      >
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <span
            className={cn(
              "relative shrink-0 overflow-hidden rounded-full ring-1 ring-brand-beige transition-all",
              scrolled ? "h-10 w-10" : "h-12 w-12"
            )}
          >
            <Image src="/logo.jpg" alt="Casa Herbert" fill sizes="48px" className="object-cover" priority />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className={cn("whitespace-nowrap font-serif text-brand-forest", scrolled ? "text-base" : "text-xl sm:text-2xl")}>
              Casa Herbert
            </span>
            <AnimatePresence initial={false}>
              {!scrolled && (
                <motion.span
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap text-[0.65rem] uppercase tracking-[0.2em] text-brand-moss"
                >
                  Embelezamento &amp; Saúde Capilar
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 xl:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "whitespace-nowrap text-sm font-medium text-brand-graphite/75 transition-colors hover:text-brand-forest",
                pathname === link.href && "text-brand-forest"
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/agendar"
            className={cn("btn-primary whitespace-nowrap text-sm", scrolled ? "!px-5 !py-2" : "!px-6 !py-2.5")}
          >
            Agendar avaliação
          </Link>
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
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium text-brand-graphite/80 transition hover:bg-brand-forest/5 hover:text-brand-forest",
                    pathname === link.href && "bg-brand-forest/5 text-brand-forest"
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
