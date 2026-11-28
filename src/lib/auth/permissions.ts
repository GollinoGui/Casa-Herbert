import type { PanelRole } from "./session";

export type { PanelRole };

export const ROLE_LABELS: Record<PanelRole, string> = {
  admin: "Administrador",
  staff: "Secretária",
};

/**
 * O que a secretária pode abrir. É uma lista do que é permitido (não do que é
 * proibido): página nova do painel nasce fechada para ela até entrar aqui.
 * Sem dependências: o middleware importa este arquivo.
 */
export const STAFF_PATHS = [
  "/admin",
  "/admin/agenda",
  "/admin/agendamentos",
  "/admin/clientes",
  "/admin/lista-de-espera",
  "/admin/bloqueios",
  "/admin/horarios-especiais",
  "/admin/configuracoes",
] as const;

/** Abas de Configurações que a secretária vê (o resto mexe em financeiro, salão ou equipe). */
export const STAFF_SETTINGS_TABS = ["aparelho"] as const;

export function canAccessPath(role: PanelRole, pathname: string): boolean {
  if (role === "admin") return true;
  // "/admin" só vale exato: senão liberaria tudo que começa com /admin.
  return STAFF_PATHS.some((p) => pathname === p || (p !== "/admin" && pathname.startsWith(`${p}/`)));
}
