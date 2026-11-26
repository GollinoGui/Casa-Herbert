export type PanelTheme = "claro" | "escuro";

const STORAGE_KEY = "painel-tema";
const META_COLORS: Record<PanelTheme, string> = { claro: "#1D3A2A", escuro: "#09110C" };

/**
 * Roda no <head> antes da primeira pintura: aplica o tema salvo (ou o do sistema)
 * para o painel não abrir claro e piscar para o escuro na hidratação.
 */
export const PANEL_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="claro"&&t!=="escuro"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"escuro":"claro"}document.documentElement.dataset.tema=t}catch(e){}})();`;

function current(): PanelTheme {
  return document.documentElement.dataset.tema === "escuro" ? "escuro" : "claro";
}

function apply(theme: PanelTheme) {
  document.documentElement.dataset.tema = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // navegador sem storage: vale só nesta visita
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META_COLORS[theme]);
}

type ToggleEvent = { detail?: number; clientX?: number; clientY?: number; currentTarget?: EventTarget | null };

export function toggleTheme(event?: ToggleEvent) {
  const next: PanelTheme = current() === "escuro" ? "claro" : "escuro";
  const html = document.documentElement;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (document.startViewTransition && !reducedMotion) {
    // Pelo teclado o clique vem sem posição (detail 0): usa o centro do botão; sem evento, o da tela.
    const box = event?.detail === 0 ? (event.currentTarget as Element | null)?.getBoundingClientRect() : null;
    const x = box ? box.left + box.width / 2 : event?.clientX ?? window.innerWidth / 2;
    const y = box ? box.top + box.height / 2 : event?.clientY ?? window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    html.style.setProperty("--tema-x", `${x}px`);
    html.style.setProperty("--tema-y", `${y}px`);
    html.style.setProperty("--tema-raio", `${radius}px`);
    html.classList.add("trocando-tema-vt");
    document
      .startViewTransition(() => apply(next))
      .finished.finally(() => html.classList.remove("trocando-tema-vt"));
    return;
  }

  html.classList.add("trocando-tema");
  apply(next);
  setTimeout(() => html.classList.remove("trocando-tema"), 400);
}
