"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { formatChipDatePtBR, nowTimeStr, todayDateStr } from "@/lib/utils/date-format";
import { readLastBooking, type LastBooking } from "@/lib/utils/last-booking";

function greetingFor(time: string): string {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function isUpcoming(booking: LastBooking): boolean {
  const today = todayDateStr();
  return booking.date > today || (booking.date === today && booking.startTime >= nowTimeStr());
}

/**
 * Quem já agendou por este navegador é reconhecido no topo da home: com o pedido ainda
 * por vir, lembra o dia; com ele no passado, oferece marcar o retorno do mesmo cuidado.
 * Só monta depois da hidratação — o servidor não sabe nada do localStorage.
 */
export function WelcomeBack() {
  const [booking, setBooking] = useState<LastBooking | null>(null);

  useEffect(() => {
    setBooking(readLastBooking());
  }, []);

  if (!booking) return null;

  const greeting = `${greetingFor(nowTimeStr())}, ${booking.firstName}!`;
  const upcoming = isUpcoming(booking);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mt-8 max-w-xl border-l-2 border-brand-gold pl-4"
    >
      <p className="font-hand text-2xl leading-tight text-brand-moss">{greeting}</p>
      {upcoming ? (
        <p className="mt-1 text-brand-graphite/80">
          Seu pedido de <span className="font-medium text-brand-graphite">{booking.serviceName}</span> está
          marcado para{" "}
          <span className="font-medium text-brand-graphite">
            {formatChipDatePtBR(booking.date)}, às {booking.startTime}
          </span>
          . A confirmação chega pelo WhatsApp.
        </p>
      ) : (
        <p className="mt-1 text-brand-graphite/80">
          Que bom te ver de novo.{" "}
          <Link
            href={`/agendar?service=${booking.serviceId}`}
            className="group inline-flex items-center gap-1 font-medium text-brand-forest underline-offset-4 hover:underline"
          >
            Marcar o retorno{booking.serviceName ? ` de ${booking.serviceName}` : ""}
            <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
          </Link>
        </p>
      )}
    </motion.div>
  );
}
