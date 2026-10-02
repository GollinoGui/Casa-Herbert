"use client";

import { useEffect } from "react";
import { startSmoothScroll } from "@/lib/utils/smooth-scroll";

/** Montado uma vez no layout público; o painel admin fica fora e mantém a rolagem nativa. */
export function SmoothScroll() {
  useEffect(() => startSmoothScroll(), []);
  return null;
}
