import type { HTMLAttributes } from "react";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-brand-beige bg-white/70 shadow-softer backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" ? "text-center" : "text-left", className)}>
      {eyebrow ? (
        <p className={cn("eyebrow mb-3 inline-flex items-center gap-1.5", align === "center" && "justify-center")}>
          <Leaf size={12} className="shrink-0 text-brand-moss" aria-hidden="true" />
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-serif text-3xl text-brand-forest sm:text-4xl">{title}</h2>
      {description ? (
        <p className={cn("mt-4 text-brand-graphite/80", align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
