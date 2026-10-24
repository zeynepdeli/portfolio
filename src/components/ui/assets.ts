/* =========================================================
   AVATAR GÖRSELLERİ — ÖNCEDEN YÜKLEME
   Avatar pozları (kayma, oturma, asılma…) eskiden ancak ekranda
   göründükleri an indirilmeye başlıyordu. Telefonda bu yüzden
   sayfa geliyor, kişi sonradan "pat" diye beliriyordu; nehirde
   kayan avatar da yolun yarısında ortaya çıkıyordu.
   Artık site açılır açılmaz hepsi indirilir ve çözülür (decode);
   bir bölüm görünmeden önce onun görselleri hazır olur.
========================================================= */

export const IMG = {
  sit: "/images/zeynep-oturma.webp",
  ride: "/images/zeynep-kayma.webp",
  rideFront: "/images/zeynep-kayma-on.webp",
  pinch: "/images/zeynep-burun.webp",
  hang: "/images/zeynep-asilma.webp",
  crouch: "/images/zeynep-comelme.webp",
  climbStill: "/images/zeynep-tirmanma-kare.webp",
  runStill: "/images/zeynep-kosma-kare.webp",
  waveStart: "/images/zeynep-wave-start.webp",
  waveEnd: "/images/zeynep-wave-end.webp",
  jump: "/images/zeynep-ziplama.webp",
} as const;

/** sitedeki bütün avatar görselleri */
export const ALL_AVATAR_IMAGES: string[] = Object.values(IMG);

/* Çözülmüş görseller bellekte tutulur: tarayıcı önbellekten silip
   yeniden çözmesin (aynı görsel birden çok bölümde kullanılıyor) */
const decoded = new Map<string, Promise<void>>();
const keep: HTMLImageElement[] = [];

/** görseli indirip çözer; hata olsa da (yoksa / bozuksa) çözülür */
export function preloadImage(src: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  let p = decoded.get(src);
  if (p) return p;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  keep.push(img);
  p = (typeof img.decode === "function"
    ? img.decode()
    : new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
      })
  ).catch(() => {});
  decoded.set(src, p);
  return p;
}

/** listedeki görseller hazır olunca (en geç `maxMs` sonra) çözülür */
export function preloadImages(srcs: string[], maxMs: number): Promise<void> {
  return Promise.race([
    Promise.all(srcs.map(preloadImage)).then(() => {}),
    new Promise<void>((res) => window.setTimeout(res, maxMs)),
  ]);
}

/** yazı tipleri hazır olunca (en geç `maxMs` sonra): isim yazısının
 *  genişliği sonradan değişip avatarın konacağı yer kaymasın */
export function fontsReady(maxMs: number): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.ready)
    return Promise.resolve();
  return Promise.race([
    document.fonts.ready.then(() => {}),
    new Promise<void>((res) => window.setTimeout(res, maxMs)),
  ]);
}
