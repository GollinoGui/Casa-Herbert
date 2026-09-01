import { ogImageAlt, ogImageContentType, ogImageSize, renderOgImage } from "./_og-image";

export const runtime = "nodejs";
export const size = ogImageSize;
export const contentType = ogImageContentType;
export const alt = ogImageAlt;

export default function Image() {
  return renderOgImage();
}
