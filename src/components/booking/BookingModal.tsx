"use client";

import type { Service } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { BookingWizard } from "@/components/booking/BookingWizard";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  services: Service[];
  minAdvanceDays: number;
  preselectedServiceId?: string;
}

export function BookingModal({ open, onClose, services, minAdvanceDays, preselectedServiceId }: BookingModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Agendar avaliação" widthClassName="max-w-2xl">
      <BookingWizard
        services={services}
        minAdvanceDays={minAdvanceDays}
        preselectedServiceId={preselectedServiceId}
        onClose={onClose}
      />
    </Modal>
  );
}
