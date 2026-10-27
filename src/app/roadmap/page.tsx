import type { Metadata } from "next";
import SiteFlow from "@/components/SiteFlow";

export const metadata: Metadata = {
  title: "Yetenekler — React, Next.js, React Native, Node.js",
  description:
    "Zeynep Deli'nin web ve mobil geliştirme yetenekleri: React, Next.js, React Native, Node.js, TypeScript, Tailwind CSS, REST API, veritabanları ve geliştirme araçları.",
  alternates: { canonical: "/roadmap" },
};


/* /roadmap — menüdeki SKILLS. Yetenekler toplanmış son hali açılır;
   yukarı kaydırınca hero, aşağı kaydırınca projeler gelir. */
export default function RoadmapPage() {
  return <SiteFlow start="roadmap" />;
}
