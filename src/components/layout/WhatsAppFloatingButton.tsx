"use client";

import { MessageCircle } from "lucide-react";

export function WhatsAppFloatingButton({ whatsappNumber }: { whatsappNumber: string }) {
  const message = encodeURIComponent(
    "Olá! Vim pelo site da Casa Herbert e gostaria de saber mais sobre os cuidados capilares. 🌿"
  );

  return (
    <a
      href={`https://wa.me/${whatsappNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.75rem))] right-5 z-40 flex h-14 w-14 animate-pulseSoft items-center justify-center rounded-full bg-brand-forest text-brand-cream shadow-lg transition-transform hover:scale-105 sm:bottom-8 sm:right-8"
    >
      <MessageCircle size={26} strokeWidth={1.75} />
    </a>
  );
}
