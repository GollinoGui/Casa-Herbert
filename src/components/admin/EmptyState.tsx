import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { BotanicalBranch } from "@/components/admin/BotanicalBranch";

/** Lista vazia: um ramo que se desenha, a frase principal e, se houver, uma dica. */
export function EmptyState({
  title,
  hint,
  action,
  className,
  compact,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "px-4 py-6" : "px-4 py-10", className)}>
      <BotanicalBranch draw className={cn("text-brand-sage", compact ? "h-12 w-10" : "h-20 w-16")} strokeWidth={1.5} />
      <p className={cn("mt-3 font-serif text-brand-forest", compact ? "text-base" : "text-lg")}>{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-brand-graphite/60">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
