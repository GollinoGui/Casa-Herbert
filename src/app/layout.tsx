import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloatingButton } from "@/components/layout/WhatsAppFloatingButton";
import { ScrollRestoration } from "@/components/layout/ScrollRestoration";
import { getSettings } from "@/lib/data/settings";

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
  const settings = await getSettings();
  const pathname = headers().get("x-pathname") ?? "";
  const isAdminRoute = pathname.startsWith("/admin");

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
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "11:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "14:00",
        closes: "19:00",
      },
    ],
  };

  return (
    <html lang="pt-BR" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ScrollRestoration />
        {isAdminRoute ? (
          children
        ) : (
          <>
            <Header />
            <main>{children}</main>
            <Footer whatsappNumber={settings.whatsappNumber} address={settings.salonAddress} />
            <WhatsAppFloatingButton whatsappNumber={settings.whatsappNumber} />
          </>
        )}
      </body>
    </html>
  );
}
