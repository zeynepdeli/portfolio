"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type TypewriterTextProps = {
  text: string;
  /** Harfler arası başlama aralığı, milisaniye (dalga hızı). Varsayılan: 18 */
  speed?: number;
  className?: string;
  /** Başlamadan önce bekleme, milisaniye (giriş animasyonu için) */
  startDelay?: number;
  /** Her harfin karışık sembollerle "çözülme" süresi, ms. Varsayılan: 220 */
  scramble?: number;
  /** false iken yazı görünmez (genişliği ayrılır) ve başlamaz */
  active?: boolean;
  /** Yazı rengi (verilmezse sıcak beyaz) */
  color?: string;
};

/* Çözülürken görünen semboller (sci-fi / terminal havası) */
const GLYPHS = "01<>/\\|#*+=-_[]{}$%&@ABCDEFXYZ";

/* her harf için: 0 = henüz yok, 1 = çözülüyor, 2 = yerinde */
type Frame = { chars: string[]; state: number[]; done: boolean };

const makeFrame = (text: string, state: 0 | 2): Frame => {
  const chars = text.split("");
  return {
    chars,
    state: chars.map(() => state),
    done: state === 2,
  };
};

/* prefers-reduced-motion: render sırasında güvenle okunur (SSR'da false) */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const readReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

/**
 * DECODE YAZISI
 * Klasik daktilo yerine: harfler soldan sağa bir dalgayla belirir,
 * her biri kısa bir an karışık sembol olarak titreşip doğru harfe oturur.
 * - Yazının tam genişliği baştan ayrılır → ortalı başlık kaymaz
 * - Çok daha kısa sürer ama "yazılıyor" hissi kalır
 */
export default function TypewriterText({
  text,
  speed = 18,
  className,
  startDelay = 0,
  scramble = 220,
  active = true,
  color = "#a8eef6", // poster turkuazı
}: TypewriterTextProps) {
  const reduce = useSyncExternalStore(
    subscribeReducedMotion,
    readReducedMotion,
    () => false,
  );
  const [anim, setAnim] = useState<Frame>(() => makeFrame(text, 0));

  /* Ayarlar değişince animasyon baştan başlar: eski kare hemen temizlenir
     (render sırasında state ayarlama; effect içinde setState yok) */
  const resetKey = `${text}|${speed}|${startDelay}|${scramble}|${active}`;
  const [prevKey, setPrevKey] = useState(resetKey);
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setAnim(makeFrame(text, 0));
  }

  useEffect(() => {
    if (!active || reduce) return;

    const letters = text.split("");
    const chars = letters.slice();
    const state = letters.map(() => 0);
    let raf = 0;
    let start = 0;
    let lastGlyph = 0;

    const tick = (now: number) => {
      if (!start) start = now;
      const t = now - start;
      /* semboller ~30 kez/sn değişsin (her karede değil, göz yormasın) */
      const refresh = now - lastGlyph > 33;
      if (refresh) lastGlyph = now;

      let allDone = true;
      for (let i = 0; i < letters.length; i++) {
        const t0 = i * speed;
        if (letters[i] === "\n") {
          /* satır sonu hep yerinde kalsın (iki satırlı başlık kaymasın) */
          chars[i] = "\n";
          state[i] = 2;
        } else if (letters[i] === " ") {
          chars[i] = " ";
          state[i] = t >= t0 ? 2 : 0;
        } else if (t < t0) {
          state[i] = 0;
          allDone = false;
        } else if (t < t0 + scramble) {
          if (state[i] !== 1 || refresh)
            chars[i] = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          state[i] = 1;
          allDone = false;
        } else {
          state[i] = 2;
          chars[i] = letters[i];
        }
      }

      setAnim({ chars: chars.slice(), state: state.slice(), done: allDone });

      if (!allDone) raf = requestAnimationFrame(tick);
    };

    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, startDelay);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [text, speed, startDelay, scramble, active, reduce]);

  /* Hareketi azalt: yazı doğrudan yerinde görünür */
  const view = active && reduce ? makeFrame(text, 2) : anim;

  return (
    <span
      className={`font-mono ${className || ""}`}
      style={{
        /* Tozlu mavi zeminde beyaz metin + buzlu hale (renk prop ile değişir) */
        color,
        textShadow: `
          0 0 6px rgba(var(--c-4fd8ff,79,216,255),0.45),
          0 0 16px rgba(var(--c-4fd8ff,79,216,255),0.22)
        `,
        whiteSpace: "pre",
      }}
      aria-label={text}
    >
      {view.chars.map((c, i) => (
        <span
          key={i}
          aria-hidden
          style={
            view.state[i] === 0
              ? { opacity: 0 }
              : view.state[i] === 1
                ? {
                    /* çözülen harf: açık buz, hafif parlak */
                    color: "rgb(var(--c-e1f8ff,225,248,255))",
                    textShadow: "0 0 8px rgba(var(--c-6ef5e8,110,245,232),.9)",
                  }
                : undefined
          }
        >
          {c}
        </span>
      ))}
      {/* İmleç: buzlu aksan — yazı bitince yanıp söner */}
      <span
        className={`ml-0.5 inline-block font-bold ${view.done ? "animate-pulse" : ""}`}
        style={{
          color: "rgb(var(--c-6ef5e8,110,245,232))",
          textShadow: `
            0 0 8px rgba(var(--c-4fd8ff,79,216,255),0.9),
            0 0 16px rgba(var(--c-4fd8ff,79,216,255),0.5)
          `,
        }}
      >
        _
      </span>
    </span>
  );
}
