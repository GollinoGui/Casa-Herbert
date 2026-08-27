import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Painel Administrativo",
    template: "%s | Painel Casa Herbert",
  },
  robots: { index: false, follow: false },
};

/**
 * Wrapper "vazio" — o shell visual (sidebar + top bar) fica em
 * (shell)/layout.tsx, aplicado via route group, para que /admin/login
 * (fora do grupo) renderize como página independente, sem menu.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
