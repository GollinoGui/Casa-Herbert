import { z } from "zod";

/** Compartilhado entre o form do wizard (client) e a validação de criação (mock/server). */
export const bookingRequestSchema = z.object({
  serviceId: z.string().min(1, "Selecione um serviço."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
  customerName: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo.")
    .max(120, "Nome muito longo."),
  customerPhone: z
    .string()
    .trim()
    .min(10, "Informe um WhatsApp válido com DDD.")
    .max(20, "Telefone inválido."),
  customerEmail: z.union([z.string().trim().email("E-mail inválido."), z.literal("")]).optional(),
  notes: z.string().trim().max(500, "Observação muito longa.").optional(),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

export const blockSlotSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isFullDay: z.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    reason: z.enum(["personal", "vacation", "holiday", "training", "maintenance", "other"]),
    notes: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "Data final deve ser igual ou depois da inicial.",
    path: ["endDate"],
  })
  .refine((v) => v.isFullDay || v.startDate === v.endDate, {
    message: "Bloqueio parcial só pode ser em um único dia.",
    path: ["isFullDay"],
  })
  .refine((v) => v.isFullDay || (!!v.startTime && !!v.endTime && v.endTime > v.startTime), {
    message: "Informe horário inicial e final válidos.",
    path: ["startTime"],
  });

export const serviceFormSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório."),
  description: z.string().trim().min(5, "Descrição obrigatória."),
  durationMinutes: z.coerce
    .number()
    .int()
    .positive()
    .refine((v) => v % 5 === 0, "Duração deve ser múltiplo de 5 minutos."),
  priceCents: z.coerce.number().int().nonnegative().optional().nullable(),
  isActive: z.boolean().default(true),
  imageId: z.string().nullable(),
  imagePosition: z.enum(["center", "top", "bottom"]).nullable(),
  showOnHome: z.boolean(),
});

export const customerFormSchema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo.").max(120, "Nome muito longo."),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Informe um WhatsApp válido com DDD.")
    .refine((v) => v.replace(/\D/g, "").length <= 13, "Telefone inválido."),
  email: z.union([z.string().trim().email("E-mail inválido."), z.literal("")]),
});

export const adminAppointmentFormSchema = z
  .object({
    customerMode: z.enum(["existing", "new"]),
    customerId: z.string().optional(),
    newCustomerName: z.string().trim().optional(),
    newCustomerPhone: z.string().trim().optional(),
    newCustomerEmail: z.string().trim().optional(),
    serviceId: z.string().min(1, "Selecione um serviço."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
    priceCents: z.coerce.number().int().nonnegative("Preço inválido.").optional().nullable(),
    adminNotes: z.string().trim().max(500, "Observação muito longa.").optional(),
    status: z.enum(["CONFIRMED", "PENDING"]),
  })
  .refine((v) => v.customerMode !== "existing" || !!v.customerId, {
    message: "Selecione um cliente.",
    path: ["customerId"],
  })
  .refine((v) => v.customerMode !== "new" || (v.newCustomerName?.trim().length ?? 0) >= 3, {
    message: "Informe o nome completo do cliente.",
    path: ["newCustomerName"],
  })
  .refine((v) => v.customerMode !== "new" || (v.newCustomerPhone?.trim().length ?? 0) >= 10, {
    message: "Informe um WhatsApp válido com DDD.",
    path: ["newCustomerPhone"],
  });

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório."),
  priceCents: z.coerce.number().int().nonnegative("Preço inválido."),
  stockQuantity: z.coerce.number().int().nonnegative("Quantidade inválida."),
  isActive: z.boolean().default(true),
});

export const settingsFormSchema = z.object({
  minAdvanceDays: z.coerce.number().int().min(0),
  bufferMinutes: z.coerce.number().int().min(0),
  slotStepMinutes: z.coerce.number().int().positive(),
  pendingExpiryHours: z.coerce.number().int().positive(),
  defaultDurationMinutes: z.coerce.number().int().positive(),
  whatsappNumber: z.string().trim().min(10),
  salonAddress: z.string().trim().min(5),
});
