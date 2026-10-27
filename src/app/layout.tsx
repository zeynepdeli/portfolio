import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Chakra_Petch } from "next/font/google";
import { ThemeStyles } from "@/components/ui/Theme";
import "./globals.css";
import { LangProvider } from "@/i18n/lang";
import { ENGINE_SCRIPT } from "@/components/ui/perfTier";
import {
  KEYWORDS,
  NAME,
  NAME_TR,
  PERSON_JSON_LD,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_URL,
  WEBSITE_JSON_LD,
} from "./seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* Başlık fontu (isim): köşeleri kesik, devre kartı hissi veren teknik font.
   latin-ext: Türkçe karakterler (İ, Ş, Ğ). Başka bir font denemek için
   yalnızca bu tanımı değiştir — ör. Oxanium veya Space_Grotesk. */
const display = Chakra_Petch({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

/* SEO: başlık, açıklama, anahtar kelimeler, sosyal paylaşım kartı.
   Sekme simgesi (logo): app/icon.png, app/apple-icon.png, app/favicon.ico
   Paylaşım görseli: app/opengraph-image.png (Next.js otomatik ekler) */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${NAME_TR}`,
  },
  description: SITE_DESCRIPTION,
  keywords: KEYWORDS,
  applicationName: `${NAME_TR} Portfolyo`,
  authors: [{ name: NAME, url: SITE_URL }],
  creator: NAME,
  publisher: NAME,
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    locale: "tr_TR",
    alternateLocale: ["en_US"],
    url: SITE_URL,
    siteName: `${NAME_TR} — Portfolyo`,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    firstName: "Zeynep",
    lastName: "Deli",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#030b1a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      /* sınıflar (engine-lite / perf-lite) ve dil, çizimden önce / sonra
         tarayıcıda eklenir */
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <head>
        {/* Safari / Firefox: hafif görünüm, ilk çizimden önce (perfTier) */}
        <script dangerouslySetInnerHTML={{ __html: ENGINE_SCRIPT }} />
        {/* Google için kişi ve site bilgisi (yapılandırılmış veri) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([PERSON_JSON_LD, WEBSITE_JSON_LD]),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* RENK PALETİ (Theme.tsx → PALETTE): layout'ta olduğu için
            "/", "/home", "/projects", "/roadmap" — tüm sayfalarda geçerli */}
        <ThemeStyles />
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
