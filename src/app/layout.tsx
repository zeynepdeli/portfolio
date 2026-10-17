import type { Metadata } from "next";
import { Geist, Geist_Mono, Chakra_Petch } from "next/font/google";
import { ThemeStyles } from "@/components/ui/Theme";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Zeynep DELİ | Full Stack Developer",
  description: "Zeynep DELİ — Full Stack Developer",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* RENK PALETİ (Theme.tsx → PALETTE): layout'ta olduğu için
            "/", "/home", "/projects", "/roadmap" — tüm sayfalarda geçerli */}
        <ThemeStyles />
        {children}
      </body>
    </html>
  );
}
