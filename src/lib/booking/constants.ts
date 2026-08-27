/**
 * Regras de agendamento configuráveis. Estes valores são o seed inicial de
 * `settings` (ver src/lib/data/seed-data.ts) — mudar aqui só afeta o primeiro
 * boot antes do arquivo de dados existir. Depois disso, edite pelo painel
 * /admin/configuracoes.
 */
export const DEFAULT_SETTINGS_SEED = {
  minAdvanceDays: 1,
  bufferMinutes: 0,
  slotStepMinutes: 15,
  pendingExpiryHours: 48,
  defaultDurationMinutes: 60,
  whatsappNumber: "5516991479968",
  salonAddress: "Avenida Onze, nº 668, Orlândia - SP, CEP 14620-000",
  salonTimezone: "America/Sao_Paulo",
  messageTemplates: {
    confirmed:
      "Olá, {nome}! Tudo bem?\n\nSeu agendamento na Casa Herbert foi confirmado. 🌿\n\nServiço: {servico}\nData: {data}\nHorário: {horario}\n\nCasa Herbert — Embelezamento e Saúde Capilar\nOrlândia/SP",
    rejected:
      "Olá, {nome}. Recebemos sua solicitação de agendamento para {data} às {horario}.\n\nInfelizmente esse horário não poderá ser confirmado.\n\nEntre em contato conosco para escolhermos outro horário disponível. 🌿\n\nCasa Herbert — Embelezamento e Saúde Capilar",
    cancelled:
      "Olá, {nome}. Seu agendamento na Casa Herbert para {data} às {horario} foi cancelado.\n\nEntre em contato conosco para reagendar quando for melhor para você. 🌿\n\nCasa Herbert — Embelezamento e Saúde Capilar",
  },
} as const;

/** 0 = domingo .. 6 = sábado, seguindo o padrão Date.getDay() / Postgres EXTRACT(DOW). */
export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export const CLOSED_WEEKDAYS = [0, 1] as const; // domingo, segunda

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  REJECTED: "Recusado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
};

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING: { bg: "bg-brand-gold/20", text: "text-brand-forest", dot: "bg-brand-gold" },
  CONFIRMED: { bg: "bg-brand-forest/10", text: "text-brand-forest", dot: "bg-brand-forest" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  CANCELLED: { bg: "bg-graphite/10", text: "text-brand-graphite", dot: "bg-brand-graphite" },
  COMPLETED: { bg: "bg-brand-sage/25", text: "text-brand-forestDark", dot: "bg-brand-sage" },
};

export const BLOCK_REASON_LABELS: Record<string, string> = {
  personal: "Compromisso pessoal",
  vacation: "Férias",
  holiday: "Feriado",
  training: "Treinamento",
  maintenance: "Manutenção",
  other: "Outro",
};
