import type { Metadata } from "next";
import { TiltCard } from "@/components/admin/TiltCard";
import { LoginForm } from "@/components/admin/LoginForm";
import { LoginBackdrop } from "@/components/admin/LoginBackdrop";
import { Leaf } from "lucide-react";
import { DEMO_LOGIN, isDemoMode } from "@/lib/demo/mode";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-pine via-brand-pineSoft to-brand-pine px-4 py-12">
      <LoginBackdrop />
      <div className="pagina-entra relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-forest text-brand-ink shadow-[0_12px_28px_-10px_rgb(var(--c-forest)/0.8)]">
            <Leaf size={22} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <p className="font-serif text-3xl text-brand-onPine">Casa Herbert</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.25em] text-brand-onPine/65">Painel Administrativo</p>
        </div>
        {/* Sem backdrop-blur: ele achata o preserve-3d do cartão. */}
        <TiltCard className="rounded-2xl bg-white/95 p-6 shadow-lift sm:p-8">
          <LoginForm next={searchParams?.next} />
        </TiltCard>
        {isDemoMode() ? (
          <p className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-center text-sm text-brand-graphite">
            Modo demonstração: entre com <strong>{DEMO_LOGIN.email}</strong> e a senha <strong>{DEMO_LOGIN.password}</strong>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
