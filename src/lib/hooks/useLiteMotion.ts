"use client";

import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * true quando o dispositivo deve receber a versão leve de uma animação:
 * o usuário pediu menos movimento, ou a tela é de celular/tablet, onde
 * efeitos de scroll com transform (parallax, scale contínuo) pesam mais.
 * Começa em `true` (assume o caso leve) para nunca montar a versão pesada
 * antes de sabermos o tamanho real da tela.
 */
export function useLiteMotion() {
  const [lite, setLite] = useState(true);

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setLite(mobile.matches || reducedMotion.matches);
    update();
    mobile.addEventListener("change", update);
    reducedMotion.addEventListener("change", update);
    return () => {
      mobile.removeEventListener("change", update);
      reducedMotion.removeEventListener("change", update);
    };
  }, []);

  return lite;
}
