import type { ReactNode } from "react";
import { Sidebar } from "@/components/admin/Sidebar";

export default function AdminShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-cream">
      <Sidebar />
      <div className="lg:pl-72">
        <main className="min-h-screen p-4 pb-10 sm:p-6 lg:p-8 2xl:px-12">{children}</main>
      </div>
    </div>
  );
}
