import type { Metadata } from "next";
import SiteFlow from "@/components/SiteFlow";

/* aynı içerik ana sayfada: arama motoru ana sayfayı esas alsın */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};


/* /home — menüdeki HOME. Giriş animasyonu oynamaz: her şey yerinde,
   fiş takılı. Aşağı kaydırarak roadmap, projeler ve footer'a gidilir. */
export default function HomePage() {
  return <SiteFlow start="hero" />;
}
