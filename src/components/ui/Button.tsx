import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "gold" | "ghost";

interface StyleProps {
  variant?: Variant;
  className?: string;
}

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  gold: "btn-gold",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-brand-forest transition-colors hover:bg-brand-forest/5",
};

interface LinkButtonProps extends StyleProps {
  href: string;
  target?: string;
  rel?: string;
  children: ReactNode;
}

export function LinkButton({ href, variant = "primary", className, children, target, rel }: LinkButtonProps) {
  return (
    <Link href={href} target={target} rel={rel} className={cn(variantClass[variant], className)}>
      {children}
    </Link>
  );
}

interface ButtonProps extends StyleProps, ButtonHTMLAttributes<HTMLButtonElement> {}

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button className={cn(variantClass[variant], "disabled:cursor-not-allowed disabled:opacity-50", className)} {...props}>
      {children}
    </button>
  );
}
