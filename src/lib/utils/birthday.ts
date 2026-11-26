/** Ano gravado quando a cliente conta só dia e mês (customers.birth_date é `date`). */
export const BIRTH_YEAR_UNKNOWN = "1900";

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** "14 de Março" ou "14 de Março de 1990". */
export function formatBirthDate(birthDate: string): string {
  const [y, m, d] = birthDate.split("-");
  const base = `${Number(d)} de ${MONTHS[Number(m) - 1]}`;
  return y === BIRTH_YEAR_UNKNOWN ? base : `${base} de ${y}`;
}
