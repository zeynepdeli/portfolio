import DocumentsSection from "@/components/sections/DocumentSection"

/* /documents — indirilebilir özgeçmişler (Header / menü / footer'daki
   DOCUMENTS buraya gelir) */
export const metadata = {
  title: "Documents | Zeynep DELİ",
};

export default function DocumentsPage() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <DocumentsSection />
    </main>
  );
}
