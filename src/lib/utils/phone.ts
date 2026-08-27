export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Formata um telefone BR (com ou sem DDI) para exibição: (16) 99147-9968 */
export function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhone(phone);
  const local = digits.length > 11 ? digits.slice(-11) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return phone;
}

/** Garante DDI 55 para uso em links wa.me. */
export function toWhatsAppDigits(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}
