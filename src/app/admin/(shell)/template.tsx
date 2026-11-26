import type { ReactNode } from "react";

/** Remonta a cada navegação: a página entra com fade e os blocos dela em cascata (globals.css). */
export default function AdminTemplate({ children }: { children: ReactNode }) {
  return <div className="pagina-entra">{children}</div>;
}
