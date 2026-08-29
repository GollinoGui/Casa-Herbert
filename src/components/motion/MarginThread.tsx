import { cn } from "@/lib/utils/cn";

interface MarginThreadProps {
  side: "left" | "right";
  tone?: "gold" | "sage" | "cream";
  className?: string;
}

const TONE_GRADIENT: Record<NonNullable<MarginThreadProps["tone"]>, string> = {
  gold: "from-transparent via-brand-gold/40 to-transparent",
  sage: "from-transparent via-brand-sage/40 to-transparent",
  cream: "from-transparent via-brand-cream/25 to-transparent",
};

/** Linha vertical fina na margem, ancorada na borda real da viewport — dá continuidade
 * visual entre seções em vez de cada uma isolar sua própria decoração. */
export function MarginThread({ side, tone = "gold", className }: MarginThreadProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute hidden w-px bg-gradient-to-b sm:block",
        TONE_GRADIENT[tone],
        side === "left" ? "left-5 lg:left-8" : "right-5 lg:right-8",
        className
      )}
      aria-hidden="true"
    />
  );
}
