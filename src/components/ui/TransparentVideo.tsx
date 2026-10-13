"use client";

import AlphaVideo from "./AlphaVideo";

/**
 * ESKİ BİLEŞEN — artık sadece AlphaVideo'ya yönlendiriyor.
 *
 * Eskiden gri arka planı renk anahtarıyla siliyordu; ama videolardaki
 * kareli desen iki tonlu olduğu için bu hiç düzgün çalışmadı (ya kare
 * görünüyordu ya da hiçbir şey). Projede hâlâ <TransparentVideo> kullanan
 * bir yer kaldıysa bozulmasın diye aynı props'larla AlphaVideo'yu açar.
 *
 * Orijinal videolar (tırmanma.mp4 / yürüme.mp4) verilirse otomatik olarak
 * arka planı silinmiş sürümlere çevrilir:
 *   public/videos/zeynep-tirmanma.mp4  (+ .webm)
 *   public/videos/zeynep-yurume.mp4    (+ .webm)
 */
type TransparentVideoProps = {
  src: string;
  /** Artık kullanılmıyor (geriye uyumluluk için duruyor) */
  keyColor?: { r: number; g: number; b: number };
  /** Artık kullanılmıyor (geriye uyumluluk için duruyor) */
  tolerance?: number;
  autoPlay?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  className?: string;
};

function toAlphaSrc(src: string): string {
  const name = decodeURIComponent(src).normalize("NFC").toLowerCase();
  if (name.includes("zeynep-")) return src;
  if (name.includes("rmanma")) return "/videos/zeynep-tirmanma.mp4";
  if (name.includes("rüme") || name.includes("rume"))
    return "/videos/zeynep-yurume.mp4";
  return src;
}

export default function TransparentVideo({
  src,
  autoPlay = true,
  loop = false,
  onEnded,
  className,
}: TransparentVideoProps) {
  return (
    <AlphaVideo
      src={toAlphaSrc(src)}
      loop={loop}
      playing={autoPlay}
      onEnded={onEnded}
      className={className}
    />
  );
}
