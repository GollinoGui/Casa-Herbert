import { ogImageAlt, ogImageContentType, ogImageSize, renderOgImage } from "./_og-image";

export const runtime = "nodejs";
// Gerada a cada pedido, não no build: o @vercel/og não carrega no Windows com Node 22
// ("Invalid URL" em fileURLToPath) e derrubava o `next build` local.
export const dynamic = "force-dynamic";
export const size = ogImageSize;
export const contentType = ogImageContentType;
export const alt = ogImageAlt;

export default function Image() {
  return renderOgImage();
}
