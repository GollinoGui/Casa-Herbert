import type { MetadataRoute } from "next";

const SITE_URL = "https://casaherbert.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/sobre", "/terapia-capilar", "/servicos", "/produtos", "/contato", "/agendar"];
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
