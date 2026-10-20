import SiteFlow from "@/components/SiteFlow";

/* /home — menüdeki HOME. Giriş animasyonu oynamaz: her şey yerinde,
   fiş takılı. Aşağı kaydırarak roadmap, projeler ve footer'a gidilir. */
export default function HomePage() {
  return <SiteFlow start="hero" />;
}
