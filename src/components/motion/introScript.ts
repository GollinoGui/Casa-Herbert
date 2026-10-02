export const INTRO_SEEN_KEY = "casa-herbert:intro-seen";

/**
 * Roda no <head>, antes da primeira pintura: se a cortina de entrada da home vai tocar,
 * marca html[data-intro="play"] (ver IntroReveal). Mesmas regras do IntroReveal — só na
 * home, não vista nesta sessão, sem "reduzir movimento"; sessionStorage inacessível
 * conta como não vista, igual lá.
 */
export const INTRO_DECISION_SCRIPT = `(function(){try{if(location.pathname!=="/")return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var seen=false;try{seen=sessionStorage.getItem(${JSON.stringify(INTRO_SEEN_KEY)})==="1"}catch(e){}if(!seen)document.documentElement.dataset.intro="play"}catch(e){}})();`;
