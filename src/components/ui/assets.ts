/* =========================================================
   AVATAR GÖRSELLERİ — ÖNCEDEN YÜKLEME
   Avatar pozları (kayma, oturma, asılma…) eskiden ancak ekranda
   göründükleri an indirilmeye başlıyordu. Telefonda bu yüzden
   sayfa geliyor, kişi sonradan "pat" diye beliriyordu; nehirde
   kayan avatar da yolun yarısında ortaya çıkıyordu.
   Artık site açılır açılmaz hepsi indirilir ve çözülür (decode);
   bir bölüm görünmeden önce onun görselleri hazır olur.
========================================================= */

/** Görselin İÇERİĞİ değişince bu sürüm artırılır: tarayıcılar görselleri
 *  bir süre önbellekte tuttuğu için aynı adla yüklenen yeni görsel
 *  (ör. yeni oturma pozu) telefonda hemen görünmüyordu. */
const V = "?v=3";

export const IMG = {
  sit: `/images/zeynep-oturma.webp${V}`,
  ride: "/images/zeynep-kayma.webp",
  rideFront: "/images/zeynep-kayma-on.webp",
  pinch: "/images/zeynep-burun.webp",
  hang: `/images/zeynep-asilma.webp${V}`,
  crouch: "/images/zeynep-comelme.webp",
  waveStart: "/images/zeynep-wave-start.webp",
  waveEnd: "/images/zeynep-wave-end.webp",
  jump: `/images/zeynep-ziplama.webp${V}`,
  drop: `/images/zeynep-inme.webp${V}`,
  /* koşma ve tırmanma: kare dizisi görselleri (SpriteVideo) */
  runSprite: `/images/zeynep-kosma-sprite.webp${V}`,
  climbSprite: `/images/zeynep-tirmanma-sprite.webp${V}`,
} as const;

/** kare dizilerinin ölçüleri (SpriteVideo) */
export const RUN_SPRITE = { src: IMG.runSprite, frames: 27, cols: 27 } as const;
export const CLIMB_SPRITE = {
  src: IMG.climbSprite,
  frames: 120,
  cols: 12,
} as const;

/** el sallama videosu (sürümlü: yeniden sıkıştırıldı) */
export const WAVE_VIDEO_SRC = `/videos/zeynep-wave.mp4${V}`;

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
