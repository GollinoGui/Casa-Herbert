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
  barcode: string | null;
  /** Retorno sugerido em dias depois do atendimento; null = sem retorno. */
  returnDays: number | null;
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
  /** "YYYY-MM-DD"; ano 1900 = só dia e mês (ver BIRTH_YEAR_UNKNOWN). */
  birthDate: string | null;
  /** Quando a cliente autorizou fotos de acompanhamento; null = sem autorização. */
  photoConsentAt: string | null;
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
  discountCents: number;
  professionalId: string | null;
  /** Quando o painel abriu o WhatsApp com o lembrete de véspera; remarcar zera. */
  reminderSentAt: string | null;
  /** Pacote de onde saiu a sessão; null = atendimento avulso. */
  customerPackageId: string | null;
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
  description: string;
  imageId: string | null;
  imageUrl: string | null;
  imagePosition: ImagePosition | null;
  /** Aparece na página /produtos e no chat simulado da home. */
  showOnSite: boolean;
  barcode: string | null;
  /** Último custo de compra; null = nunca comprado pelo painel. */
  costCents: number | null;
  /** Com estoque igual ou abaixo disso, avisa no Início; null = sem aviso. */
  minStock: number | null;
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

export type SaleStatus = "open" | "paid" | "cancelled";

export interface Sale {
  id: string;
  appointmentId: string | null; // null = venda avulsa
  customerId: string | null;
  customer: { id: string; fullName: string; phone: string } | null;
  items: SaleItem[];
  discountCents: number;
  totalCents: number; // já com desconto
  paidCents: number;
  status: SaleStatus;
  paymentMethod: PaymentMethod | null; // última forma usada; null = nada recebido ainda
  notes: string | null;
  saleDate: string; // YYYY-MM-DD
  dueDate: string | null; // só para vendas em aberto
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface AppointmentProduct {
  productId: string;
  quantity: number;
  name: string;
  priceCents: number;
}

/** Linha da receita de consumo do serviço: quanto se gasta do produto por atendimento (aceita fração). */
export interface ServiceProduct {
  productId: string;
  quantity: number;
  name: string;
}

export interface Professional {
  id: string;
  name: string;
  isActive: boolean;
}

export type CashDirection = "in" | "out";

export interface CashEntry {
  id: string;
  entryDate: string;
  direction: CashDirection;
  amountCents: number;
  category: string;
  description: string;
  paymentMethod: PaymentMethod | null;
  saleId: string | null;
  payableId: string | null;
  customerId: string | null;
  customerName: string | null;
  receiptTxid: string | null;
  reversalOf: string | null;
  /** Já tem um estorno lançado contra ele. */
  reversed: boolean;
  createdAt: string;
}

export type PayableStatus = "open" | "paid" | "cancelled";

export interface Payable {
  id: string;
  description: string;
  category: string;
  supplier: string | null;
  amountCents: number;
  dueDate: string;
  status: PayableStatus;
  paidOn: string | null;
  paymentMethod: PaymentMethod | null;
  recurringBillId: string | null;
  purchaseId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface RecurringBill {
  id: string;
  description: string;
  category: string;
  supplier: string | null;
  amountCents: number;
  dueDay: number;
  isActive: boolean;
  startsOn: string;
}

export interface PurchaseItem {
  productId: string | null;
  description: string;
  quantity: number;
  unitCostCents: number;
  totalCents: number;
}

export interface Purchase {
  id: string;
  supplier: string | null;
  purchaseDate: string;
  totalCents: number;
  notes: string | null;
  items: PurchaseItem[];
  payable: { id: string; status: PayableStatus; dueDate: string } | null;
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
  /** URL completa; vazio = o site não mostra o link. */
  instagramUrl: string;
  facebookUrl: string;
  /** Faixa acima do menu; vazio = sem faixa. */
  announcementText: string;
  /** Caminho interno ("/agendar") ou URL completa; vazio = faixa sem link. */
  announcementLink: string;
  /** "YYYY-MM-DD", último dia em que a faixa aparece; vazio = sem prazo. */
  announcementUntil: string;
  messageTemplates: {
    confirmed: string;
    rejected: string;
    cancelled: string;
    /** Parabéns pelo aniversário (bloco do Início). */
    birthday: string;
    /** Convite para voltar, para quem não vem há um tempo. */
    comeback: string;
    /** Lembrete de véspera (bloco "Lembretes de amanhã" do Início). */
    reminder: string;
    /** Hora do retorno sugerido pelo serviço. Aceita {servico}. */
    returnDue: string;
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

export interface ServicePackage {
  id: string;
  name: string;
  serviceId: string;
  serviceName: string;
  sessions: number;
  priceCents: number;
  /** Validade em dias a partir da venda; null = sem validade. */
  validDays: number | null;
  isActive: boolean;
}

export type CustomerPackageStatus = "active" | "finished" | "cancelled";

export interface CustomerPackage {
  id: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  name: string;
  sessionsTotal: number;
  sessionsUsed: number;
  /** Valor de cada sessão fixado na venda (preço do pacote menos desconto, dividido pelas sessões). */
  sessionValueCents: number;
  saleId: string;
  status: CustomerPackageStatus;
  expiresOn: string | null;
  createdAt: string;
}

export interface CashDrawerPreview {
  firstClosing: boolean;
  previousAt: string | null;
  openingCents: number;
  cashInCents: number;
  cashOutCents: number;
  expectedCents: number;
}

export interface CashClosing {
  id: string;
  closingDate: string;
  openingCents: number;
  cashInCents: number;
  cashOutCents: number;
  expectedCents: number;
  countedCents: number;
  withdrawnCents: number;
  differenceCents: number;
  /** Diferença lançada no livro-caixa como ajuste. */
  posted: boolean;
  notes: string | null;
  createdAt: string;
}

export type WaitlistPeriod = "any" | "morning" | "afternoon";
export type WaitlistStatus = "waiting" | "scheduled" | "cancelled";

export interface WaitlistEntry {
  id: string;
  customer: Pick<Customer, "id" | "fullName" | "phone">;
  serviceId: string | null;
  serviceName: string | null;
  desiredDate: string;
  period: WaitlistPeriod;
  notes: string | null;
  status: WaitlistStatus;
  createdAt: string;
}

export interface CustomerRecordPhoto {
  id: string;
  /** URL assinada, válida por pouco tempo. */
  url: string | null;
}

export interface CustomerRecord {
  id: string;
  customerId: string;
  date: string;
  appointmentId: string | null;
  notes: string | null;
  photos: CustomerRecordPhoto[];
  createdAt: string;
}
