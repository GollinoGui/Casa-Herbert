import type {
  Appointment,
  AppointmentWithRelations,
  BlockedSlot,
  BusinessHourRule,
  Customer,
  GalleryItem,
  Product,
  Service,
  Settings,
  SpecialHours,
  Testimonial,
} from "@/types";

type Row = Record<string, any>;

/** Postgres devolve `time` como "HH:mm:ss"; o app inteiro trabalha com "HH:mm". */
export function hhmm(time: string): string;
export function hhmm(time: string | null): string | null;
export function hhmm(time: string | null): string | null {
  return time ? time.slice(0, 5) : null;
}

export function toService(r: Row): Service {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description ?? "",
    durationMinutes: r.duration_minutes,
    priceCents: r.price_cents,
    isActive: r.is_active,
    displayOrder: r.display_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toCustomer(r: Row): Customer {
  return {
    id: r.id,
    fullName: r.full_name,
    phone: r.phone,
    normalizedPhone: r.normalized_phone,
    email: r.email,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toAppointment(r: Row): Appointment {
  return {
    id: r.id,
    customerId: r.customer_id,
    serviceId: r.service_id,
    date: r.appointment_date,
    startTime: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    status: r.status,
    customerNotes: r.customer_notes,
    adminNotes: r.admin_notes,
    priceCents: r.price_cents,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    confirmedAt: r.confirmed_at,
    cancelledAt: r.cancelled_at,
  };
}

/** Select com os relacionamentos que AppointmentWithRelations precisa. */
export const APPOINTMENT_WITH_RELATIONS = "*, customer:customers(*), service:services(*)";

export function toAppointmentWithRelations(r: Row): AppointmentWithRelations {
  return { ...toAppointment(r), customer: toCustomer(r.customer), service: toService(r.service) };
}

export function toBusinessHour(r: Row): BusinessHourRule {
  return {
    id: r.id,
    weekday: r.weekday,
    startTime: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    isActive: r.is_active,
  };
}

/** Espera o select "*, special_hours_ranges(*)". */
export function toSpecialHours(r: Row): SpecialHours {
  const ranges = ((r.special_hours_ranges ?? []) as Row[])
    .map((range) => ({ startTime: hhmm(range.start_time), endTime: hhmm(range.end_time) }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  return { id: r.id, date: r.special_date, isClosed: r.is_closed, reason: r.reason, ranges };
}

export function toBlockedSlot(r: Row): BlockedSlot {
  return {
    id: r.id,
    startDate: r.start_date,
    endDate: r.end_date,
    isFullDay: r.is_full_day,
    startTime: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    reason: r.reason,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

export function toSettings(r: Row): Settings {
  const templates = r.message_templates ?? {};
  return {
    minAdvanceDays: r.min_advance_days,
    bufferMinutes: r.buffer_minutes,
    slotStepMinutes: r.slot_step_minutes,
    pendingExpiryHours: r.pending_expiry_hours,
    defaultDurationMinutes: r.default_duration_minutes,
    whatsappNumber: r.whatsapp_number,
    salonAddress: r.salon_address ?? "",
    salonTimezone: r.salon_timezone,
    messageTemplates: {
      confirmed: templates.confirmed ?? "",
      rejected: templates.rejected ?? "",
      cancelled: templates.cancelled ?? "",
    },
  };
}

export function fromSettings(s: Partial<Settings>): Row {
  const row: Row = {};
  if (s.minAdvanceDays !== undefined) row.min_advance_days = s.minAdvanceDays;
  if (s.bufferMinutes !== undefined) row.buffer_minutes = s.bufferMinutes;
  if (s.slotStepMinutes !== undefined) row.slot_step_minutes = s.slotStepMinutes;
  if (s.pendingExpiryHours !== undefined) row.pending_expiry_hours = s.pendingExpiryHours;
  if (s.defaultDurationMinutes !== undefined) row.default_duration_minutes = s.defaultDurationMinutes;
  if (s.whatsappNumber !== undefined) row.whatsapp_number = s.whatsappNumber;
  if (s.salonAddress !== undefined) row.salon_address = s.salonAddress;
  if (s.salonTimezone !== undefined) row.salon_timezone = s.salonTimezone;
  if (s.messageTemplates !== undefined) row.message_templates = s.messageTemplates;
  return row;
}

export function toTestimonial(r: Row): Testimonial {
  return {
    id: r.id,
    customerName: r.customer_name,
    rating: r.rating,
    content: r.content,
    isPublished: r.is_published,
    displayOrder: r.display_order,
    createdAt: r.created_at,
  };
}

export function toGalleryItem(r: Row): GalleryItem {
  return {
    id: r.id,
    caption: r.caption,
    category: r.category ?? "",
    isPublished: r.is_published,
    displayOrder: r.display_order,
    createdAt: r.created_at,
  };
}

export function toProduct(r: Row): Product {
  return {
    id: r.id,
    name: r.name,
    priceCents: r.price_cents,
    stockQuantity: r.stock_quantity,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
