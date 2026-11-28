"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PanelRole } from "@/lib/auth/permissions";

export interface PanelUserInfo {
  name: string;
  role: PanelRole;
}

const PanelUserContext = createContext<PanelUserInfo>({ name: "", role: "staff" });

/**
 * Só decide o que aparece na tela. Quem barra de verdade é o servidor
 * (middleware, requireAdmin nas actions); aqui é para a secretária não ver
 * botão que daria erro.
 */
export function PanelUserProvider({ value, children }: { value: PanelUserInfo; children: ReactNode }) {
  return <PanelUserContext.Provider value={value}>{children}</PanelUserContext.Provider>;
}

export const usePanelUser = () => useContext(PanelUserContext);
export const useIsAdmin = () => useContext(PanelUserContext).role === "admin";
