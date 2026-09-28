/**
 * Todo lugar fixo do site que mostra uma foto. A chave é o que fica gravado em
 * site_image_slots.slot_key; o painel (/admin/fotos) lista exatamente isto.
 * Espaço sem foto escolhida mostra o PlaceholderImage.
 *
 * Fotos que não são "fixas" ficam fora daqui: a do card de cada serviço vai em
 * services.image_id e as da seção de resultados em gallery.media_id.
 */

export interface SiteImageSlot {
  key: string;
  label: string;
  /** Proporção do espaço no site — só para o preview do painel ficar igual. */
  aspect: "16/9" | "4/3" | "4/5" | "1/1";
}

export interface SiteImageSlotGroup {
  page: string;
  slots: SiteImageSlot[];
}

export const SITE_IMAGE_SLOT_GROUPS: SiteImageSlotGroup[] = [
  {
    page: "Página inicial",
    slots: [
      { key: "home.hero", label: "Foto principal (topo)", aspect: "16/9" },
      { key: "home.hero-thumb", label: "Miniatura ao lado de \"Sem fórmula fixa\"", aspect: "1/1" },
      { key: "home.terapia", label: "Aba Terapia Capilar", aspect: "4/3" },
      { key: "home.fotobio", label: "Aba Fotobiomodulação", aspect: "4/3" },
    ],
  },
  {
    page: "Sobre",
    slots: [
      { key: "sobre.retrato", label: "Retrato (topo)", aspect: "4/5" },
      { key: "sobre.jornada-1", label: "Jornada — Conversa inicial", aspect: "4/3" },
      { key: "sobre.jornada-2", label: "Jornada — Avaliação individual", aspect: "4/3" },
      { key: "sobre.jornada-3", label: "Jornada — Protocolo personalizado", aspect: "4/3" },
      { key: "sobre.jornada-4", label: "Jornada — Acompanhamento contínuo", aspect: "4/3" },
    ],
  },
  {
    page: "Terapia Capilar",
    slots: [
      { key: "terapia.hero", label: "Foto do topo", aspect: "4/5" },
      { key: "terapia.fotobio", label: "Fotobiomodulação em destaque", aspect: "4/3" },
    ],
  },
  {
    page: "Produtos (página Produtos e conversa da home)",
    slots: [
      { key: "produto.shampoo", label: "Shampoo de Limpeza Suave", aspect: "4/3" },
      { key: "produto.tonico", label: "Tônico Fortalecedor", aspect: "4/3" },
      { key: "produto.serum", label: "Sérum Pós-Terapia", aspect: "4/3" },
      { key: "produto.mascara", label: "Máscara de Nutrição", aspect: "4/3" },
      { key: "produto.condicionador", label: "Condicionador de Manutenção", aspect: "4/3" },
      { key: "produto.oleo", label: "Óleo de Finalização", aspect: "4/3" },
    ],
  },
];

export const SITE_IMAGE_SLOT_KEYS = new Set(SITE_IMAGE_SLOT_GROUPS.flatMap((g) => g.slots.map((s) => s.key)));
