import type { MetadataRoute } from "next";

const SITE_URL = "https://casaherbert.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/sobre", "/terapia-capilar", "/servicos", "/produtos", "/contato", "/agendar"];
  const staticRoutes = routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.7,
  }));

  return [
    ...staticRoutes,
    {
      url: `${SITE_URL}/privacidade`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
