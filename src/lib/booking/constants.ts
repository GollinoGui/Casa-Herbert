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
