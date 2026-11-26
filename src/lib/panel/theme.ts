export type PanelTheme = "verde" | "laranja" | "escuro";

const ORDER: PanelTheme[] = ["verde", "laranja", "escuro"];

const STORAGE_KEY = "painel-tema";
const META_COLORS: Record<PanelTheme, string> = { verde: "#1D3A2A", laranja: "#7A3410", escuro: "#09110C" };

/**
 * Roda no <head> antes da primeira pintura: aplica o tema salvo para o painel
 * não abrir verde e piscar para outro na hidratação. Sem escolha salva, segue o
 * sistema (escuro ou verde); o antigo "claro" vira verde.
 */
export const PANEL_THEME_SCRIPT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="verde"&&t!=="laranja"&&t!=="escuro"){t=t==="claro"?"verde":window.matchMedia("(prefers-color-scheme: dark)").matches?"escuro":"verde"}d.dataset.tema=t}catch(e){d.dataset.tema="verde"}})();`;

function current(): PanelTheme {
  const theme = document.documentElement.dataset.tema as PanelTheme;
  return ORDER.includes(theme) ? theme : "verde";
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
  const next = ORDER[(ORDER.indexOf(current()) + 1) % ORDER.length];
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
