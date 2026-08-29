"use client";

import { createContext, useContext } from "react";

const IntroGateContext = createContext(true);

export const IntroGateProvider = IntroGateContext.Provider;

/**
 * `false` só enquanto a cortina de entrada (IntroReveal) está tocando na home —
 * componentes com `whileInView` leem isso pra não animar escondidos atrás da cortina.
 * Em qualquer outra página, sem IntroReveal por perto, o valor padrão é `true`.
 */
export function useIntroGate() {
  return useContext(IntroGateContext);
}
