"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MoreVertical, Smile, Paperclip, Mic, CheckCheck, MessageCircle } from "lucide-react";
import { SiteImage } from "@/components/ui/SiteImage";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { useIntroGate } from "@/components/motion/introGate";

interface ChatMessage {
  id: number;
  fromBusiness: boolean;
  text: string;
  product?: { name: string; slot: string; tone: "sage" | "cream" | "gold" };
  cta?: boolean;
  time: string;
}

const CONVERSATION: ChatMessage[] = [
  { id: 1, fromBusiness: false, text: "Oi! Quais produtos vocês indicam pro meu couro cabeludo?", time: "14:02" },
  {
    id: 2,
    fromBusiness: true,
    text: "Higienização delicada, preserva o equilíbrio do couro cabeludo.",
    product: { name: "Shampoo de Limpeza Suave", slot: "produto.shampoo", tone: "sage" },
    time: "14:03",
  },
  {
    id: 3,
    fromBusiness: true,
    text: "Apoia a saúde dos fios entre as sessões.",
    product: { name: "Tônico Fortalecedor", slot: "produto.tonico", tone: "gold" },
    time: "14:03",
  },
  {
    id: 4,
    fromBusiness: true,
    text: "Finalização recomendada após a terapia capilar.",
    product: { name: "Sérum Pós-Terapia", slot: "produto.serum", tone: "cream" },
    time: "14:04",
  },
  {
    id: 5,
    fromBusiness: true,
    text: "Cuidado intensivo, conforme sua avaliação.",
    product: { name: "Máscara de Nutrição", slot: "produto.mascara", tone: "sage" },
    time: "14:04",
  },
  {
    id: 6,
    fromBusiness: true,
    text: "Uso contínuo, alinhado ao seu protocolo.",
    product: { name: "Condicionador de Manutenção", slot: "produto.condicionador", tone: "gold" },
    time: "14:05",
  },
  {
    id: 7,
    fromBusiness: true,
    text: "Toque final para fios e comprimentos.",
    product: { name: "Óleo de Finalização", slot: "produto.oleo", tone: "cream" },
    time: "14:05",
  },
  { id: 8, fromBusiness: false, text: "Onde posso encontrar mais detalhes?", time: "14:06" },
  { id: 9, fromBusiness: true, cta: true, text: "Você pode:", time: "14:06" },
];

const TYPING_MS = 900;
const HOLD_MS = 2100;

/**
 * Laptop com um chat estilo WhatsApp simulando uma conversa com a Casa Herbert,
 * revelando os produtos um a um. Abre em 3D (rotateX) e só começa a "digitar"
 * quando entra na viewport (mesmo gatilho do onViewportEnter), tocando a
 * sequência uma única vez.
 */
export function LaptopChatMockup({ whatsappNumber, className }: { whatsappNumber: string; className?: string }) {
  const introReady = useIntroGate();
  const [hasEntered, setHasEntered] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasEntered) return;

    let isMounted = true;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, delay: number) => {
      timeouts.push(
        setTimeout(() => {
          if (isMounted) fn();
        }, delay)
      );
    };

    let elapsed = 500;
    CONVERSATION.forEach((_, index) => {
      schedule(() => setIsTyping(true), elapsed);
      elapsed += TYPING_MS;
      schedule(() => {
        setIsTyping(false);
        setVisibleCount(index + 1);
      }, elapsed);
      elapsed += HOLD_MS;
    });

    return () => {
      isMounted = false;
      timeouts.forEach(clearTimeout);
    };
  }, [hasEntered]);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visibleCount, isTyping]);

  const visibleMessages = CONVERSATION.slice(0, visibleCount);

  return (
    <div className={cn("relative mx-auto w-full max-w-[560px] select-none [perspective:1200px]", className)}>
      <motion.div
        initial={{ rotateX: -65, opacity: 0, scale: 0.92 }}
        whileInView={introReady ? { rotateX: 0, opacity: 1, scale: 1 } : undefined}
        viewport={{ once: true, margin: "-100px" }}
        onViewportEnter={introReady ? () => setHasEntered(true) : undefined}
        transition={{ type: "spring", stiffness: 130, damping: 20, mass: 0.9 }}
        style={{ transformOrigin: "bottom center" }}
        className="relative z-10 rounded-t-2xl bg-gradient-to-br from-neutral-600 via-brand-graphite to-neutral-900 p-2 shadow-soft sm:p-2.5"
      >
        <div className="flex h-[360px] flex-col overflow-hidden rounded-t-[10px] bg-brand-cream sm:h-[400px]">
          <div className="flex shrink-0 items-center justify-between bg-brand-forest px-3.5 py-2.5 text-brand-cream">
            <div className="flex items-center gap-2.5">
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-brand-cream/25">
                <Image src="/logo.jpg" alt="Casa Herbert" fill sizes="32px" className="object-cover" />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold">Casa Herbert</span>
                <span className="text-[10px] text-brand-cream/80">online</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-brand-cream/70">
              <Search size={15} />
              <MoreVertical size={15} />
            </div>
          </div>

          <div
            ref={scrollAreaRef}
            data-lenis-prevent
            className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-brand-beige/30 p-3"
          >
            <div className="flex-1" />
            <AnimatePresence>
              {visibleMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  className={cn("flex", msg.fromBusiness ? "justify-start" : "justify-end")}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-xl px-3 py-2 text-[11.5px] leading-snug shadow-sm",
                      msg.fromBusiness
                        ? "rounded-tl-none bg-white text-brand-graphite"
                        : "rounded-tr-none bg-brand-sage/35 text-brand-graphite"
                    )}
                  >
                    {msg.product && (
                      <SiteImage
                        slot={msg.product.slot}
                        alt={msg.product.name}
                        placeholderTone={msg.product.tone}
                        sizes="160px"
                        className="mb-1.5 aspect-[4/3] w-40"
                      />
                    )}
                    {msg.product && <p className="font-serif text-[12px] text-brand-forest">{msg.product.name}</p>}
                    <p className={cn(msg.product && "mt-0.5 text-brand-graphite/70")}>{msg.text}</p>

                    {msg.cta && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        <LinkButton
                          href={`https://wa.me/${whatsappNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="primary"
                          className="!gap-1.5 !rounded-lg !px-3 !py-1.5 !text-[10.5px] !shadow-none"
                        >
                          <MessageCircle size={12} /> Falar no WhatsApp
                        </LinkButton>
                        <LinkButton
                          href="/produtos"
                          variant="secondary"
                          className="!gap-1.5 !rounded-lg !px-3 !py-1.5 !text-[10.5px]"
                        >
                          Conhecer os produtos
                        </LinkButton>
                      </div>
                    )}

                    <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-brand-graphite/45">
                      <span>{msg.time}</span>
                      {msg.fromBusiness && <CheckCheck size={12} className="text-brand-gold" />}
                    </div>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-center gap-1 rounded-xl rounded-tl-none bg-white px-3 py-2.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-brand-sage"
                        animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-brand-sage/15 bg-white px-3 py-2">
            <Smile size={16} className="text-brand-graphite/50" />
            <Paperclip size={16} className="text-brand-graphite/50" />
            <div className="flex-1 rounded-full bg-brand-beige/50 px-3 py-1.5 text-[11px] text-brand-graphite/40">
              Digite uma mensagem
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-forest text-brand-cream">
              <Mic size={13} />
            </span>
          </div>
        </div>
      </motion.div>

      <div className="relative z-0 mx-auto h-3 w-full rounded-b-xl bg-neutral-300 sm:h-3.5">
        <div className="mx-auto h-1.5 w-14 rounded-b-md bg-neutral-400/90" />
      </div>
    </div>
  );
}
