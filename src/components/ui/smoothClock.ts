/* =========================================================
   KARE ATLAMAYAN SAAT
   Animasyon "başlangıçtan bu yana geçen gerçek süre" ile çizilince,
   telefon bir an takıldığında (video başlatma, resim çözme…) takılma
   bitince hareket ileri SIÇRAR: parçalar bir anda yerinde belirir,
   avatar yolun yarısında görünür. Bu saat ANİ boşlukları kırpar —
   o anki olağan kare süresinin çok üstündeki bir boşluk tek kare gibi
   sayılır. Hareket bir an yavaşlar ama hiçbir kısmı atlanmaz. Sürekli
   yavaş çalışan cihazda ise gerçek hızda kalır (animasyonlar uzamaz).
========================================================= */

/** kırpılacak boşluğun alt sınırı (ms) */
const MIN_LIMIT_MS = 50;

/** her çağrıda (rAF zamanıyla) geçen "düzgün" süreyi (ms) döndürür */
export function smoothClock(startAt = 0) {
  let last = -1;
  let elapsed = startAt;
  /** olağan kare süresi (yürüyen ortalama) */
  let typical = 16.7;
  return (now: number) => {
    if (last >= 0) {
      const dt = Math.max(0, now - last);
      elapsed += Math.min(dt, Math.max(MIN_LIMIT_MS, typical * 1.8));
      typical = typical * 0.85 + Math.min(dt, 250) * 0.15;
    }
    last = now;
    return elapsed;
  };
}
