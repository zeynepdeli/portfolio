import DocumentsSection from "@/components/sections/DocumentSection";
import MobileMenu from "@/components/layout/MobileMenu";

/* /documents — indirilebilir özgeçmişler (Header / menü / footer'daki
   DOCUMENTS buraya gelir). Sağ üstte diğer sayfalara giden menü. */
export const metadata = {
  title: "Documents | Zeynep DELİ",
};

export default function DocumentsPage() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <DocumentsSection />
      <div
        className="fixed z-90"
        style={{
          top: "calc(1.5% + 12px)",
          right: "calc(1% + 12px)",
          width: 58,
          height: 50,
        }}
      >
        <MobileMenu powered style={{ left: 0, top: 0 }} />
      </div>
    </main>
  );
}
