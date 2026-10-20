/* =========================================================
   KARE ATLAMAYAN SAAT
   Animasyonlar "başlangıçtan bu yana geçen gerçek süre" ile çizilince,
   telefon bir an takıldığında (resim çözme, sayfa yükü) takılma bitince
   hareket ileri SIÇRAR: avatar bir anda nehrin ortasında belirir,
   sayfa geçişi yarıdan başlar. Bu saat ani TAKILMALARI kırpar: o anki
   olağan kare süresinin (yavaş cihazda da) çok üstündeki bir boşluk
   tek kare gibi sayılır → hareket kısa bir an yavaşlar ama hiçbir kısmı
   atlanmaz. Düzenli yavaş çalışan cihazda ise gerçek hızda ilerler
   (geçişler uzamaz).
========================================================= */

/** kırpılacak boşluğun alt sınırı (ms) */
const MIN_LIMIT_MS = 50;

/** her çağrıda (rAF zamanıyla) geçen "düzgün" süreyi döndürür */
export function smoothClock(startAt = 0) {
  let last = -1;
  let elapsed = startAt;
  /** olağan kare süresi (yürüyen ortalama) */
  let typical = 16.7;
  return (now: number) => {
    if (last >= 0) {
      const dt = Math.max(0, now - last);
      const limit = Math.max(MIN_LIMIT_MS, typical * 1.8);
      elapsed += Math.min(dt, limit);
      typical = typical * 0.85 + Math.min(dt, 250) * 0.15;
    }
    last = now;
    return elapsed;
  };
}
