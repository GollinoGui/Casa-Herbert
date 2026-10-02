// O endereço completo das configurações ("nº", CEP) geocodifica pior que esta busca curta.
const MAP_QUERY = "Avenida Onze 668 Orlandia SP";

export const MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&output=embed`;
export const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(MAP_QUERY)}`;
