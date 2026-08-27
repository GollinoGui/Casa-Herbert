import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/components/admin/LoginForm";

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
    <div className="flex min-h-screen items-center justify-center bg-brand-forest px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-serif text-3xl text-brand-cream">Casa Herbert</p>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-brand-sage">Painel Administrativo</p>
        </div>
        <Card className="bg-white/95 p-6 sm:p-8">
          <LoginForm next={searchParams?.next} />
        </Card>
      </div>
    </div>
  );
}
