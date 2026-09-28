export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export type BlockReason =
  | "personal"
  | "vacation"
  | "holiday"
  | "training"
  | "maintenance"
  | "other";

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  durationMinutes: number;
  priceCents: number | null;
  isActive: boolean;
  displayOrder: number;
  imageId: string | null;
  imageUrl: string | null;
  imagePosition: ImagePosition | null;
  showOnHome: boolean; // aparece no carrossel "Nossos cuidados" da home
  createdAt: string;
  updatedAt: string;
}

/** Recorte da foto quando ela não tem a mesma proporção do espaço (object-position). */
export type ImagePosition = "center" | "top" | "bottom";

export interface Media {
  id: string;
  url: string;
  storagePath: string | null; // null = arquivo estático do site (/public)
  alt: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface ResolvedImage {
  src: string;
  position: ImagePosition | null;
}

export interface SiteImageSlotAssignment {
  slotKey: string;
  mediaId: string;
  url: string;
  position: ImagePosition | null;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  normalizedPhone: string;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AppointmentStatus;
  customerNotes: string | null;
  adminNotes: string | null;
  priceCents: number | null; // valor combinado para este agendamento; null = ainda não definido
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
}

export interface AppointmentWithRelations extends Appointment {
  customer: Customer;
  service: Service;
}

export interface Product {
  id: string;
  name: string;
  priceCents: number; // diferente de Service.priceCents: aqui não é nullable
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SaleItemType = "service" | "product";

export type PaymentMethod = "dinheiro" | "pix" | "cartao_credito" | "cartao_debito" | "outro";

export interface SaleItem {
  type: SaleItemType;
  refId: string | null; // serviceId ou productId; null para linha de serviço sem vínculo
  description: string; // snapshot — sobrevive a renomeação/alteração de preço do produto/serviço depois
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
}

export interface Sale {
  id: string;
  appointmentId: string | null; // null = venda avulsa
  customerId: string | null;
  items: SaleItem[];
  totalCents: number;
  paymentMethod: PaymentMethod;
  notes: string | null;
  createdAt: string;
}

export interface TimeRange {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface BusinessHourRule {
  id: string;
  weekday: number; // 0 = Sunday .. 6 = Saturday
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface SpecialHours {
  id: string;
  date: string; // YYYY-MM-DD
  isClosed: boolean;
  reason: string | null;
  ranges: TimeRange[];
}

export interface BlockedSlot {
  id: string;
  startDate: string;
  endDate: string;
  isFullDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: BlockReason;
  notes: string | null;
  createdAt: string;
}

export interface Settings {
  minAdvanceDays: number;
  bufferMinutes: number;
  slotStepMinutes: number;
  pendingExpiryHours: number;
  defaultDurationMinutes: number;
  whatsappNumber: string; // digits only, with country code, e.g. 5516991479968
  salonAddress: string;
  salonTimezone: string;
  messageTemplates: {
    confirmed: string;
    rejected: string;
    cancelled: string;
  };
}

export interface Testimonial {
  id: string;
  customerName: string;
  rating: number;
  content: string;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface GalleryItem {
  id: string;
  caption: string | null;
  category: string;
  mediaId: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
}

export type SlotUnavailableReason =
  | "PAST_DATE"
  | "TOO_SOON"
  | "CLOSED"
  | "FULLY_BOOKED";

export interface AvailabilityResult {
  bookable: boolean;
  reason?: SlotUnavailableReason;
  slots: TimeRange[];
}
