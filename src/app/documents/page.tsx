import type { Metadata } from "next";
import DocumentsSection from "@/components/sections/DocumentSection";
import SiteMenu from "@/components/layout/SiteMenu";

/* /documents — indirilebilir özgeçmişler (Header / menü / footer'daki
   DOCUMENTS buraya gelir). Diğer sayfalara giden menü (SiteMenu). */
export const metadata: Metadata = {
  title: "Özgeçmiş (CV) — Türkçe ve İngilizce",
  description:
    "Zeynep Deli — Full Stack Web & Mobile Developer özgeçmişi (CV). Türkçe ve İngilizce PDF olarak görüntüleyin ve indirin.",
  alternates: { canonical: "/documents" },
};

export default function DocumentsPage() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <DocumentsSection />
      <SiteMenu current="documents" />
    </main>
  );
}
