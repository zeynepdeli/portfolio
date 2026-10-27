import type { Metadata } from "next";
import SiteFlow from "@/components/SiteFlow";

export const metadata: Metadata = {
  title: "Projeler — Web ve Mobil Uygulamalar",
  description:
    "Zeynep Deli'nin geliştirdiği web ve mobil uygulama projeleri: React, Next.js, React Native ve Node.js ile yapılmış işler.",
  alternates: { canonical: "/projects" },
};


/* /projects — menüdeki PROJECTS. Fan oluşmuş son hali açılır;
   yukarı kaydırınca roadmap, aşağı kaydırınca footer gelir. */
export default function ProjectsPage() {
  return <SiteFlow start="projects" />;
}
