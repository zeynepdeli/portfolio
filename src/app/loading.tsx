/* Sayfa geçişinde (menüden /projects, /roadmap, /documents…) yeni sayfa
   hazırlanırken ANINDA görünen ekran: yalnızca sitenin zemini. "Yükleniyor"
   yazısı / yanıp sönen çubuk yok — sayfa çoğu zaman bir an içinde gelir,
   yazı yalnızca göz kırpması gibi görünüyordu. */
export default function Loading() {
  return (
    <main
      aria-busy
      className="fixed inset-0"
      style={{
        background:
          "linear-gradient(180deg, rgb(var(--bg-1,2,4,15)) 0%, rgb(var(--bg-2,4,10,34)) 45%, rgb(var(--bg-3,3,8,32)) 70%, rgb(var(--bg-4,1,3,11)) 100%)",
      }}
    />
  );
}
