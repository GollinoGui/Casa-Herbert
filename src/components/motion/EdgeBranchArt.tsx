import { cn } from "@/lib/utils/cn";

interface EdgeBranchArtProps {
  tone?: "moss" | "gold" | "cream";
  flip?: boolean;
  className?: string;
}

const STROKE_BY_TONE: Record<NonNullable<EdgeBranchArtProps["tone"]>, string> = {
  moss: "#53735A",
  gold: "#CBB89A",
  cream: "#F7F3EA",
};

/** Galho ilustrado full-bleed (ponta a ponta da seção), para o fundo deixar de ser
 * uma faixa vazia e virar atmosfera — a coluna de conteúdo continua por cima, intocada. */
export function EdgeBranchArt({ tone = "moss", flip = false, className }: EdgeBranchArtProps) {
  const stroke = STROKE_BY_TONE[tone];
  return (
    <svg
      className={cn("pointer-events-none absolute inset-x-0 w-full", flip && "-scale-y-100", className)}
      viewBox="0 0 1600 260"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path d="M-40 90C240 40 520 160 800 100C1080 40 1360 150 1640 90" stroke={stroke} strokeWidth="2" strokeOpacity="0.5" />
      <path d="M120 90C150 62 190 62 210 86" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.4" />
      <path d="M330 115C360 86 400 86 420 110" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.4" />
      <path d="M700 78C730 50 770 50 790 74" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.4" />
      <path d="M980 115C1010 86 1050 86 1070 110" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.4" />
      <path d="M1260 100C1290 72 1330 72 1350 96" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.4" />
    </svg>
  );
}
