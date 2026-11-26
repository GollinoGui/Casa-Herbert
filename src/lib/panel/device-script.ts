/**
 * Parte de servidor das preferências do aparelho (ver device.ts): o layout raiz
 * põe este script no <head> do painel. Fica separado porque device.ts usa hooks
 * e não pode ser importado por Server Component.
 */
export const DEVICE_PREFS_STORAGE_KEY = "painel-aparelho";

/** Roda antes da primeira pintura. Precisa seguir a mesma regra de parse() + applyToDocument() em device.ts. */
export const DEVICE_PREFS_SCRIPT = `(function(){var h=document.documentElement,p={};try{p=JSON.parse(localStorage.getItem("${DEVICE_PREFS_STORAGE_KEY}")||"{}")||{}}catch(e){}var t=p.textSize;h.dataset.texto=t==="confortavel"||t==="grande"?t:"normal";h.dataset.valores=p.hideMoney===true?"ocultos":"visiveis";var s=Array.isArray(p.shortcuts)?p.shortcuts:null;h.dataset.barra=p.shortcutBar===false||(s&&!s.length)?"nao":"sim"})();`;
