import { cn } from "@/lib/utils/cn";
import type { CSSProperties } from "react";

/**
 * Ramo em traço fino (caule + folhas). `draw` desenha o traço ao montar; `loop`
 * desenha e apaga sem parar (carregamento). Cor pelo `currentColor`.
 */
export function BotanicalBranch({
  className,
  draw,
  loop,
  strokeWidth = 1.4,
}: {
  className?: string;
  draw?: boolean;
  loop?: boolean;
  strokeWidth?: number;
}) {
  const paths: { d: string; len: number; delay: number }[] = [
    { d: "M60 150 C58 120 62 92 60 66 C58 44 62 24 60 8", len: 150, delay: 0 },
    { d: "M60 120 C44 116 30 104 24 88 C40 88 54 98 60 120 Z", len: 110, delay: 260 },
    { d: "M60 96 C76 92 90 80 96 64 C80 64 66 74 60 96 Z", len: 110, delay: 420 },
    { d: "M60 70 C46 66 36 56 32 42 C46 44 56 52 60 70 Z", len: 95, delay: 580 },
    { d: "M60 46 C72 42 82 32 84 20 C72 22 62 30 60 46 Z", len: 85, delay: 740 },
    { d: "M60 8 C56 4 56 0 60 -4 C64 0 64 4 60 8 Z", len: 30, delay: 900 },
  ];
  return (
    <svg
      viewBox="0 -6 120 160"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(draw && "ramo-desenha", loop && "ramo-loop", className)}
    >
      {paths.map((p) => (
        <path key={p.d} d={p.d} style={{ "--len": p.len, "--d": p.delay } as CSSProperties} />
      ))}
    </svg>
  );
}
