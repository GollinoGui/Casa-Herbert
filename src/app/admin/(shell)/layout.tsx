import type { ReactNode } from "react";
import { Sidebar } from "@/components/admin/Sidebar";

export default function AdminShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-cream">
      <Sidebar />
      <div className="lg:pl-72">
        <main className="min-h-screen p-4 pt-24 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
