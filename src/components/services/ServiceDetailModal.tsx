"use client";

import { CalendarCheck, Clock, MessageCircle } from "lucide-react";
import type { Service } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button, LinkButton } from "@/components/ui/Button";
import { formatServiceDuration, formatServicePrice } from "@/lib/utils/service-format";
import { buildSalonWhatsAppLink } from "@/lib/booking/whatsapp";

interface ServiceDetailModalProps {
  service: Service | null;
  whatsappNumber: string;
  onClose: () => void;
  onSchedule: (service: Service) => void;
}

export function ServiceDetailModal({ service, whatsappNumber, onClose, onSchedule }: ServiceDetailModalProps) {
  return (
    <Modal open={service !== null} onClose={onClose} title={service?.name} widthClassName="max-w-lg">
      {service ? (
        <div>
          <div className="flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-brand-moss">
              <Clock size={14} /> {formatServiceDuration(service.durationMinutes)}
            </span>
            <span className="font-medium text-brand-forest">{formatServicePrice(service.priceCents)}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-brand-graphite/80">{service.description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton
              href={buildSalonWhatsAppLink(
                whatsappNumber,
                `Olá! Gostaria de saber mais sobre o serviço "${service.name}".`
              )}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              className="flex-1"
            >
              <MessageCircle size={18} /> Falar com o Herbert
            </LinkButton>
            <Button type="button" onClick={() => onSchedule(service)} className="flex-1">
              <CalendarCheck size={18} /> Agendar
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
