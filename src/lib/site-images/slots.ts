/**
 * Todo lugar fixo do site que mostra uma foto. A chave é o que fica gravado em
 * site_image_slots.slot_key; o painel (/admin/fotos) lista exatamente isto, por
 * página e seção. Espaço sem foto escolhida mostra o PlaceholderImage.
 *
 * Fotos que não são "fixas" ficam fora daqui: a do card de cada serviço vai em
 * services.image_id e as da seção de resultados em gallery.media_id — as páginas
 * apontam para elas em `elsewhere`.
 */

export type SlotAspect = "16/9" | "4/3" | "4/5" | "1/1";

export interface SiteImageSlot {
  key: string;
  label: string;
  /** Onde exatamente aparece, para quem está escolhendo a foto. */
  hint: string;
  /** Proporção do espaço no site — orienta a escolha (foto deitada, em pé ou quadrada). */
  aspect: SlotAspect;
}

export interface SiteImageSection {
  title: string;
  slots: SiteImageSlot[];
}

export interface SiteImagePage {
  id: string;
  page: string;
  path: string;
  sections: SiteImageSection[];
  /** Fotos desta página que são gerenciadas em outra tela do painel. */
  elsewhere?: { label: string; href: string; linkLabel: string }[];
}

export const ASPECT_LABELS: Record<SlotAspect, string> = {
  "16/9": "Horizontal larga",
  "4/3": "Horizontal",
  "4/5": "Vertical",
  "1/1": "Quadrada",
};

const JOURNEY_HINT = "Aparece ao passar o mouse sobre a etapa; no celular, fica sempre visível.";
const PRODUCT_HINT = "No card da página Produtos e na conversa de WhatsApp simulada da página inicial.";

export const SITE_IMAGE_PAGES: SiteImagePage[] = [
  {
    id: "inicio",
    page: "Início",
    path: "/",
    sections: [
      {
        title: "Topo da página",
        slots: [
          { key: "home.hero", label: "Foto principal", hint: "Grande, ao lado do título “Casa Herbert”.", aspect: "16/9" },
          {
            key: "home.hero-thumb",
            label: "Miniatura",
            hint: "Pequena, ao lado do selo “Sem fórmula fixa”, abaixo dos botões.",
            aspect: "1/1",
          },
        ],
      },
      {
        title: "Terapia Capilar & Fotobiomodulação",
        slots: [
          {
            key: "home.terapia",
            label: "Aba Terapia Capilar",
            hint: "Ao lado do texto quando a aba “Terapia Capilar” está aberta.",
            aspect: "4/3",
          },
          {
            key: "home.fotobio",
            label: "Aba Fotobiomodulação",
            hint: "Ao lado do texto quando a aba “Fotobiomodulação” está aberta.",
            aspect: "4/3",
          },
        ],
      },
    ],
    elsewhere: [
      { label: "Carrossel “Nossos cuidados”", href: "/admin/servicos", linkLabel: "Editar em Serviços" },
      { label: "Seção “Resultados”", href: "/admin/galeria", linkLabel: "Editar em Galeria" },
    ],
  },
  {
    id: "sobre",
    page: "Sobre",
    path: "/sobre",
    sections: [
      {
        title: "Topo da página",
        slots: [
          { key: "sobre.retrato", label: "Retrato", hint: "Ao lado do título “Um espaço de cuidado individual”.", aspect: "4/5" },
        ],
      },
      {
        title: "Sua jornada de cuidado",
        slots: [
          { key: "sobre.jornada-1", label: "Etapa 1 — Conversa inicial", hint: JOURNEY_HINT, aspect: "4/3" },
          { key: "sobre.jornada-2", label: "Etapa 2 — Avaliação individual", hint: JOURNEY_HINT, aspect: "4/3" },
          { key: "sobre.jornada-3", label: "Etapa 3 — Protocolo personalizado", hint: JOURNEY_HINT, aspect: "4/3" },
          { key: "sobre.jornada-4", label: "Etapa 4 — Acompanhamento contínuo", hint: JOURNEY_HINT, aspect: "4/3" },
        ],
      },
    ],
  },
  {
    id: "terapia",
    page: "Terapia Capilar",
    path: "/terapia-capilar",
    sections: [
      {
        title: "Topo da página",
        slots: [
          {
            key: "terapia.hero",
            label: "Foto principal",
            hint: "Ao lado do título “Acompanhamento contínuo da saúde do couro cabeludo”.",
            aspect: "4/5",
          },
        ],
      },
      {
        title: "Fotobiomodulação em destaque",
        slots: [
          {
            key: "terapia.fotobio",
            label: "Sessão de fotobiomodulação",
            hint: "Ao lado do texto “Luz de baixa intensidade como parte do seu cuidado”.",
            aspect: "4/3",
          },
        ],
      },
    ],
  },
  {
    id: "produtos",
    page: "Produtos",
    path: "/produtos",
    sections: [
      {
        title: "Linhas de produtos",
        slots: [
          { key: "produto.shampoo", label: "Shampoo de Limpeza Suave", hint: PRODUCT_HINT, aspect: "4/3" },
          { key: "produto.tonico", label: "Tônico Fortalecedor", hint: PRODUCT_HINT, aspect: "4/3" },
          { key: "produto.serum", label: "Sérum Pós-Terapia", hint: PRODUCT_HINT, aspect: "4/3" },
          { key: "produto.mascara", label: "Máscara de Nutrição", hint: PRODUCT_HINT, aspect: "4/3" },
          { key: "produto.condicionador", label: "Condicionador de Manutenção", hint: PRODUCT_HINT, aspect: "4/3" },
          { key: "produto.oleo", label: "Óleo de Finalização", hint: PRODUCT_HINT, aspect: "4/3" },
        ],
      },
    ],
  },
];

/** Aba da biblioteca em /admin/fotos (?aba=), ao lado das abas por página. */
export const LIBRARY_TAB = "biblioteca";

export const SITE_IMAGE_SLOTS = SITE_IMAGE_PAGES.flatMap((p) =>
  p.sections.flatMap((s) => s.slots.map((slot) => ({ ...slot, page: p.page, section: s.title })))
);

export const SITE_IMAGE_SLOT_KEYS = new Set(SITE_IMAGE_SLOTS.map((s) => s.key));
