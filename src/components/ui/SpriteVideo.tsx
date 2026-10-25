"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/* =========================================================
   KARE DİZİSİ ANİMASYONU (sprite sheet)
   Avatarın koşma ve tırmanma hareketleri, şeffaf zeminli TEK bir
   görselde yan yana / satır satır dizilmiş karelerdir; arka plan
   konumu kare kare kaydırılarak oynatılır.

   Neden video değil: şeffaf video WebGL ile çiziliyordu; iPhone'da
   tuval boş kalıyor, avatar görünmüyordu (yalnızca ışığı). Görsel her
   tarayıcıda aynı çalışır, video çözme ve WebGL bağlamı gerektirmez.
========================================================= */

type Props = {
  /** kare dizisi görseli */
  src: string;
  /** kare sayısı */
  frames: number;
  /** görseldeki sütun sayısı (satır sayısı hesaplanır) */
  cols: number;
  /** kaynak videonun kare hızı */
  fps?: number;
  /** oynatma hızı çarpanı */
  playbackRate?: number;
  loop?: boolean;
  playing: boolean;
  /** tek seferlik animasyon bitince */
  onEnded?: () => void;
  /** her yeni karede (video zamanı, sn) */
  onFrame?: (t: number) => void;
  className?: string;
  style?: CSSProperties;
};

export default function SpriteVideo({
  src,
  frames,
  cols,
  fps = 24,
  playbackRate = 1,
  loop = false,
  playing,
  onEnded,
  onFrame,
  className,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rows = Math.ceil(frames / cols);
  /* durunca kaldığı kare korunur (yeniden başlarken oradan devam) */
  const timeRef = useRef(0);
  const endedRef = useRef(false);
  const cb = useRef({ onEnded, onFrame });
  useEffect(() => {
    cb.current = { onEnded, onFrame };
  });

  useEffect(() => {
    if (!playing) return;
    const show = (frame: number) => {
      const el = ref.current;
      if (!el) return;
      const c = frame % cols;
      const r = Math.floor(frame / cols);
      el.style.backgroundPosition = `${cols > 1 ? (c / (cols - 1)) * 100 : 0}% ${
        rows > 1 ? (r / (rows - 1)) * 100 : 0
      }%`;
    };
    let raf = 0;
    let last = -1;
    let shown = -1;
    const tick = (now: number) => {
      if (last >= 0) {
        /* sekme arkadayken gelen uzun boşluk tek kare sayılır */
        const dt = Math.min(100, now - last) / 1000;
        timeRef.current += dt * playbackRate;
      }
      last = now;
      let f = Math.floor(timeRef.current * fps);
      if (loop) f %= frames;
      else if (f >= frames - 1) {
        f = frames - 1;
        if (!endedRef.current) {
          endedRef.current = true;
          show(f);
          cb.current.onEnded?.();
        }
        return;
      }
      if (f !== shown) {
        shown = f;
        show(f);
        cb.current.onFrame?.(f / fps);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, loop, frames, fps, playbackRate, cols, rows]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={className}
      style={{
        backgroundImage: `url(${src})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${cols * 100}% ${rows * 100}%`,
        backgroundPosition: "0% 0%",
        ...style,
      }}
    />
  );
}
