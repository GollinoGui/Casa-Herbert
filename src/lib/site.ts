/**
 * Enquanto o cliente usa só o painel, tudo que é do site público (galeria, fotos,
 * depoimentos, aviso no topo, foto/carrossel dos serviços) fica escondido no painel.
 * Ligar o site = `SITE_ENABLED=true`.
 */
export const SITE_ONLY_ADMIN_PATHS = ["/admin/depoimentos", "/admin/fotos", "/admin/galeria"];

export function isSiteEnabled() {
  return process.env.SITE_ENABLED === "true";
}
