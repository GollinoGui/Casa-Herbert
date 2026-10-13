/**
 * O último pedido feito pelo site, guardado só no navegador de quem agendou — é o que
 * permite à home reconhecer a pessoa ("que bom te ver de novo") sem login nem cookie
 * de servidor. Pode sumir a qualquer momento (aba anônima, limpeza de dados): quem lê
 * trata a ausência como visitante novo.
 */

const STORAGE_KEY = "casa-herbert:last-booking";

export interface LastBooking {
  firstName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  startTime: string;
}

export function saveLastBooking(booking: LastBooking): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(booking));
  } catch {
    // Armazenamento bloqueado: a home só não vai reconhecer a pessoa.
  }
}

export function readLastBooking(): LastBooking | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastBooking>;
    if (!parsed.firstName || !parsed.serviceId || !parsed.date || !parsed.startTime) return null;
    return {
      firstName: parsed.firstName,
      serviceId: parsed.serviceId,
      serviceName: parsed.serviceName ?? "",
      date: parsed.date,
      startTime: parsed.startTime,
    };
  } catch {
    return null;
  }
}

export function firstNameOf(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
