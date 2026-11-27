import { BotanicalBranch } from "@/components/admin/BotanicalBranch";

const SEEDS = [
  { left: "12%", top: "22%", size: 5, delay: 0 },
  { left: "82%", top: "30%", size: 4, delay: 2.4 },
  { left: "70%", top: "78%", size: 6, delay: 4.1 },
  { left: "24%", top: "70%", size: 3, delay: 1.2 },
  { left: "48%", top: "12%", size: 4, delay: 3.3 },
  { left: "90%", top: "60%", size: 3, delay: 5.2 },
];

export function LoginBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="login-brilho absolute -left-[12%] top-[8%] h-[28rem] w-[28rem] rounded-full bg-brand-forest/25 blur-3xl" />
      <div className="login-brilho login-brilho-2 absolute -right-[10%] bottom-[2%] h-[32rem] w-[32rem] rounded-full bg-brand-sage/20 blur-3xl" />

      <div className="login-pontos absolute inset-0 text-brand-onPine/[0.09]" />

      <svg className="absolute left-1/2 top-1/2 h-[54rem] w-[54rem] -translate-x-1/2 -translate-y-1/2 text-brand-onPine/[0.07]" viewBox="0 0 200 200" fill="none" stroke="currentColor">
        <circle cx="100" cy="100" r="58" strokeWidth="0.25" />
        <circle cx="100" cy="100" r="74" strokeWidth="0.2" strokeDasharray="0.6 2.4" />
        <circle cx="100" cy="100" r="92" strokeWidth="0.18" />
      </svg>

      <BotanicalBranch draw className="absolute -left-16 bottom-[-4rem] h-[26rem] w-80 rotate-[20deg] text-brand-onPine/10" strokeWidth={1} />
      <BotanicalBranch draw className="absolute -right-12 -top-10 h-80 w-64 rotate-[200deg] text-brand-onPine/[0.07]" strokeWidth={1} />
      <div className="login-balanca absolute left-[8%] top-[6%] hidden sm:block">
        <BotanicalBranch draw className="h-40 w-32 -rotate-[24deg] text-brand-onPine/[0.08]" strokeWidth={1.2} />
      </div>
      <div className="login-balanca login-balanca-2 absolute bottom-[8%] right-[7%] hidden sm:block">
        <BotanicalBranch draw className="h-48 w-36 rotate-[28deg] text-brand-forest/25" strokeWidth={1.1} />
      </div>
      <BotanicalBranch draw className="absolute right-[22%] top-[14%] hidden h-24 w-20 rotate-[150deg] text-brand-onPine/[0.06] lg:block" strokeWidth={1.4} />
      <BotanicalBranch draw className="absolute bottom-[18%] left-[24%] hidden h-20 w-16 -rotate-[40deg] text-brand-onPine/[0.06] lg:block" strokeWidth={1.4} />

      {SEEDS.map((s) => (
        <span
          key={s.left + s.top}
          className="login-semente absolute rounded-full bg-brand-onPine/25"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
        />
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(var(--c-pine)/0.55)_100%)]" />

      <p className="absolute inset-x-0 bottom-5 hidden sm:block text-center text-[0.68rem] font-medium uppercase tracking-[0.3em] text-brand-onPine/60">
        Embelezamento e Saúde Capilar · Orlândia/SP
      </p>
    </div>
  );
}
