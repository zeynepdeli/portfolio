import DocumentsSection from "@/components/sections/DocumentSection";
import SiteMenu from "@/components/layout/SiteMenu";

/* /documents — indirilebilir özgeçmişler (Header / menü / footer'daki
   DOCUMENTS buraya gelir). Diğer sayfalara giden menü (SiteMenu). */
export const metadata = {
  title: "Documents | Zeynep DELİ",
};

export default function DocumentsPage() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <DocumentsSection />
      <SiteMenu current="documents" />
    </main>
  );
}
