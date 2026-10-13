import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, Caveat } from "next/font/google";
import { headers } from "next/headers";
import "lenis/dist/lenis.css";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloatingButton } from "@/components/layout/WhatsAppFloatingButton";
import { ScrollRestoration } from "@/components/layout/ScrollRestoration";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { SectionStack } from "@/components/motion/SectionStack";
import { INTRO_DECISION_SCRIPT } from "@/components/motion/introScript";
import { getSettings } from "@/lib/data/settings";
import { getSiteImageMap } from "@/lib/data/media";
import { getBusinessHours } from "@/lib/data/business-hours";
import { groupByRanges, toOpeningHoursSpecification } from "@/lib/utils/business-hours-format";
import { SiteImagesProvider } from "@/components/ui/SiteImage";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Só para as anotações à mão (HandNote) — o "caderno" de quem acompanha o cuidado.
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-hand",
  display: "swap",
});

const SITE_URL = "https://casaherbert.com.br";

// Todas as páginas leem o banco (no mínimo, settings aqui no layout). Sem isso o
// Next 14 tenta gerá-las estáticas no build, e o supabase-js engole o sinal de
// "rota dinâmica" que o fetch no-store deveria dar.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F3EA",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Casa Herbert — Embelezamento e Saúde Capilar em Orlândia/SP",
    template: "%s | Casa Herbert",
  },
  description:
    "Casa Herbert Embelezamento e Saúde Capilar, em Orlândia/SP. Avaliação capilar individual, terapia capilar, tricoscopia e fotobiomodulação. Atendimento somente com hora marcada.",
  keywords: [
    "Casa Herbert Orlândia",
    "terapia capilar Orlândia",
    "saúde capilar Orlândia",
    "tratamento capilar Orlândia",
    "queda de cabelo Orlândia",
    "cuidados com couro cabeludo Orlândia",
    "fotobiomodulação Orlândia",
  ],
  openGraph: {
    title: "Casa Herbert — Embelezamento e Saúde Capilar",
    description: "Cuidar do seu couro cabeludo é cuidar de você. Avaliação individual e protocolos personalizados em Orlândia/SP.",
    url: SITE_URL,
    siteName: "Casa Herbert",
    locale: "pt_BR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-pathname") ?? "";
  const isAdminRoute = pathname.startsWith("/admin");
  const [settings, siteImages, businessHours] = await Promise.all([
    getSettings(),
    isAdminRoute ? Promise.resolve({}) : getSiteImageMap(),
    isAdminRoute ? Promise.resolve([]) : getBusinessHours(),
  ]);
  const sameAs = [settings.instagramUrl, settings.facebookUrl].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: "Casa Herbert Embelezamento e Saúde Capilar",
    image: `${SITE_URL}/opengraph-image`,
    "@id": SITE_URL,
    url: SITE_URL,
    telephone: `+${settings.whatsappNumber}`,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Avenida Onze, 668",
      addressLocality: "Orlândia",
      addressRegion: "SP",
      postalCode: "14620-000",
      addressCountry: "BR",
    },
    openingHoursSpecification: toOpeningHoursSpecification(groupByRanges(businessHours)),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return (
    // suppressHydrationWarning: o script do <head> põe data-intro no <html> antes da hidratação.
    <html lang="pt-BR" className={`${playfair.variable} ${inter.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        {!isAdminRoute && <script dangerouslySetInnerHTML={{ __html: INTRO_DECISION_SCRIPT }} />}
      </head>
      <body className={isAdminRoute ? "font-sans antialiased" : "site-organic font-sans antialiased"}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ScrollRestoration />
        {isAdminRoute ? (
          children
        ) : (
          <SiteImagesProvider images={siteImages}>
            <SmoothScroll />
            <SectionStack />
            <AnnouncementBar settings={settings} />
            <Header />
            {/* clip, não hidden: segura as entradas laterais sem criar rolagem horizontal e sem quebrar o sticky. */}
            <main className="overflow-x-clip">{children}</main>
            <Footer settings={settings} businessHours={businessHours} />
            <WhatsAppFloatingButton whatsappNumber={settings.whatsappNumber} />
          </SiteImagesProvider>
        )}
      </body>
    </html>
  );
}
