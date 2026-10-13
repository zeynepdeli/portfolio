"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";

/* =========================================================
   PARILTI — "Ocean of Art" posterindeki parçacık ışıltısı
   Bir çizginin etrafına minik turkuaz / beyaz noktalar serper;
   altında koyu lacivert bir şerit durur.

   PERFORMANS: noktaların yeri bir kez hesaplanır ve her renk
   katmanı TEK bir <path> olarak çizilir (her nokta sıfır boylu,
   yuvarlak uçlu bir çizgi). Hareketli SVG filtresi yok; ışıltı
   yalnızca katmanların opaklığıyla yapılır → GPU/CPU yormaz.

   <SparkleStroke d="..." />      → var olan bir <svg> içinde
   <SparkleBorder radius={22} />  → bir HTML kutusunun kenarına
========================================================= */

/** Poster renkleri */
export const SPARKLE = {
  cyan: "#4fd8ff",
  teal: "#6ef5e8",
  white: "#e1f8ff",
  /* parıltının altındaki koyu lacivert çizgi */
  navyDeep: "#030a24",
  navy: "#0a1d55",
  navyLight: "#1d4fa8",
};

type Rect = { x: number; y: number; w: number; h: number; rx: number };
type Shape = { d: string; rect?: never } | { d?: never; rect: Rect };

type StrokeProps = Shape & {
  /** noktaların çizgiden ne kadar uzağa saçılacağı (kullanıcı birimi) */
  spread?: number;
  /** nokta yoğunluğu çarpanı (1 = normal) */
  density?: number;
  /** nokta boyutu çarpanı — SVG ölçeğine göre ayarla */
  scale?: number;
  /** tüm parıltının opaklığı (0-1) */
  opacity?: number;
  /** ışıltı (yanıp sönme) — SVG içindeki her path'i ayrı ayrı canlandırır;
   *  büyük SVG'lerde kapalı tutun (varsayılan kapalı) */
  flow?: boolean;
  /** (eski API ile uyum için; artık kullanılmıyor) */
  reverse?: boolean;
  /** parıltının altında koyu lacivert çizgi (posterdeki gibi) */
  base?: boolean;
  /** çizilecek nokta katmanları (LAYERS sırası); verilmezse hepsi */
  layers?: number[];
  /** hafif turkuaz pus */
  haze?: boolean;
  style?: CSSProperties;
};

/* katmanlar: [nokta boyu, ortalama aralık, renk, opaklık, saçılma çarpanı] */
const LAYERS: [number, number, string, number, number][] = [
  [1.6, 6, SPARKLE.cyan, 1, 0.9],
  [1.1, 4.5, SPARKLE.teal, 0.85, 1.1],
  [2.4, 26, SPARKLE.white, 1, 0.7],
  [0.9, 5, SPARKLE.cyan, 0.4, 2], // dış toz
];

/** Küçük, tohumlu rastgele sayı üreteci (her çizimde aynı desen) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Yuvarlak köşeli dikdörtgenin path'i */
function rectPath({ x, y, w, h, rx }: Rect) {
  const r = Math.min(rx, w / 2, h / 2);
  return `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

/** Path boyunca saçılmış noktaları, katman başına iki "d" olarak üretir */
function buildDots(
  el: SVGPathElement,
  spread: number,
  density: number,
  scale: number,
) {
  const L = el.getTotalLength();
  if (!L || !isFinite(L)) return LAYERS.map(() => ["", ""]);
  const MAX = 2400; // tek katmanda en fazla nokta
  return LAYERS.map(([, gap, , , spreadK], k) => {
    const rand = rng(17 + k * 101);
    const step = Math.max((gap * scale) / density, L / MAX);
    const n = Math.floor(L / step);
    const halves: [string[], string[]] = [[], []];
    for (let i = 0; i < n; i++) {
      const p = el.getPointAtLength((i + rand()) * step);
      /* yaklaşık normal dağılım: üç düzgün sayının toplamı */
      const gx = (rand() + rand() + rand() - 1.5) / 1.5;
      const gy = (rand() + rand() + rand() - 1.5) / 1.5;
      const x = p.x + gx * spread * spreadK;
      const y = p.y + gy * spread * spreadK;
      /* iki yarı farklı zamanda yanıp söner */
      halves[i & 1].push(`M${x.toFixed(1)} ${y.toFixed(1)}h.01`);
    }
    return [halves[0].join(""), halves[1].join("")];
  });
}

export function SparkleStroke({
  d,
  rect,
  spread = 6,
  density = 1,
  scale = 1,
  opacity = 1,
  flow = false,
  base = true,
  layers,
  haze = true,
  style,
}: StrokeProps) {
  const uid = useId().replace(/:/g, "");
  const shapeD = useMemo(
    () => (rect ? rectPath(rect) : (d ?? "")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [d, rect?.x, rect?.y, rect?.w, rect?.h, rect?.rx],
  );

  /* noktalar: şekil değişince bir kez hesaplanır */
  const measureRef = useRef<SVGPathElement>(null);
  const [dots, setDots] = useState<string[][] | null>(null);
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || !shapeD) return;
    setDots(buildDots(el, spread, density, scale));
  }, [shapeD, spread, density, scale]);

  const line = {
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <g
      style={{ opacity, transition: "opacity 600ms", ...style }}
      pointerEvents="none"
    >
      {/* ölçüm için görünmez kopya */}
      <path ref={measureRef} d={shapeD} fill="none" stroke="none" />

      {/* KOYU LACİVERT ÇİZGİ (filtresiz: üst üste saydam şeritler) */}
      {base && (
        <>
          <path
            d={shapeD}
            {...line}
            stroke={SPARKLE.navyDeep}
            strokeWidth={spread * 3}
            strokeOpacity={0.35}
          />
          <path
            d={shapeD}
            {...line}
            stroke={SPARKLE.navyDeep}
            strokeWidth={spread * 2.2}
            strokeOpacity={0.6}
          />
          <path
            d={shapeD}
            {...line}
            stroke={SPARKLE.navy}
            strokeWidth={spread * 1.3}
          />
          <path
            d={shapeD}
            {...line}
            stroke={SPARKLE.navyLight}
            strokeWidth={Math.max(1, spread * 0.35)}
            strokeOpacity={0.5}
          />
        </>
      )}

      {/* hafif turkuaz pus */}
      {haze && (
        <path
          d={shapeD}
          {...line}
          stroke={SPARKLE.cyan}
          strokeWidth={spread * 1.8}
          strokeOpacity={0.06}
        />
      )}

      {/* NOKTALAR — katman başına iki path */}
      {dots &&
        LAYERS.map(([size, , color, o], k) =>
          layers && !layers.includes(k)
            ? null
            : dots[k].map((dd, half) =>
                dd ? (
                  <path
                    key={`${uid}-${k}-${half}`}
                    d={dd}
                    {...line}
                    stroke={color}
                    strokeOpacity={o}
                    strokeWidth={size * scale}
                    className={flow ? "sp-tw" : undefined}
                    style={
                      flow
                        ? {
                            animationDuration: `${2.4 + k * 0.6}s`,
                            animationDelay: `${half ? -(1.2 + k * 0.3) : 0}s`,
                          }
                        : undefined
                    }
                  />
                ) : null,
              ),
        )}

      {/* beyaz noktaların hâlesi (filtresiz: kalın, saydam kopya) */}
      {dots && dots[2][0] && (!layers || layers.includes(2)) && (
        <path
          d={dots[2][0] + dots[2][1]}
          {...line}
          stroke={SPARKLE.cyan}
          strokeOpacity={0.18}
          strokeWidth={6 * scale}
        />
      )}

      <style>{`
        @keyframes spTw { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        .sp-tw { animation-name: spTw; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        @media (prefers-reduced-motion: reduce) { .sp-tw { animation: none; } }
      `}</style>
    </g>
  );
}

/* =========================================================
   HTML kutusunun kenarına parıltı.
   Ebeveyn position: relative/absolute olmalı; kenarına oturur.
========================================================= */
export function SparkleBorder({
  radius = 16,
  spread = 5,
  density = 1,
  scale = 1,
  opacity = 1,
  style,
}: {
  radius?: number;
  spread?: number;
  density?: number;
  scale?: number;
  opacity?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const pad = spread * 3;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      /* küçük titreşimlerde yeniden hesaplama yapma */
      setSize((s) =>
        Math.abs(s.w - w) < 2 && Math.abs(s.h - h) < 2 ? s : { w, h },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rect = {
    x: pad,
    y: pad,
    w: size.w - pad * 2,
    h: size.h - pad * 2,
    rx: radius,
  };
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute"
      style={{ inset: -pad, opacity, transition: "opacity 600ms", ...style }}
    >
      <style>{`
        @keyframes sbTw { 0%,100% { opacity: 1; } 50% { opacity: .2; } }
        .sb-tw { animation: sbTw 2.6s ease-in-out infinite; will-change: opacity; }
        @media (prefers-reduced-motion: reduce) { .sb-tw { animation: none; } }
      `}</style>
      {size.w > 0 && (
        <>
          {/* sabit katman: lacivert çizgi + noktalar (bir kez çizilir) */}
          <svg
            width={size.w}
            height={size.h}
            className="absolute inset-0 overflow-visible"
          >
            <SparkleStroke
              rect={rect}
              spread={spread}
              density={density}
              scale={scale}
              layers={[0, 1, 3]}
            />
          </svg>
          {/* parlak beyaz noktalar ayrı katmanda: yalnızca opaklığı değişir
              → tarayıcı yeniden çizmez, sadece birleştirir (GPU) */}
          <svg
            width={size.w}
            height={size.h}
            className="sb-tw absolute inset-0 overflow-visible"
          >
            <SparkleStroke
              rect={rect}
              spread={spread}
              density={density}
              scale={scale}
              layers={[2]}
              base={false}
              haze={false}
            />
          </svg>
        </>
      )}
    </div>
  );
}

/* =========================================================
   SİM DOKUSU (CSS) — pin çizgileri gibi küçük alanlar için.
   SVG / JS yok: üst üste binen, farklı aralıklarla tekrar eden
   minik radyal noktalar → rastgele serpilmiş sim görünümü.
   Işıltı: yalnızca opaklık animasyonu (GPU, yeniden çizim yok).
   Kullanım: <span className="glitter-tw" style={GLITTER} />
========================================================= */
const dot = (c: string, r: number, x: string, y: string) =>
  `radial-gradient(circle at ${x} ${y}, ${c} 0 ${r}px, transparent ${r + 0.6}px)`;

export const GLITTER: CSSProperties = {
  backgroundImage: [
    dot("rgba(255,255,255,.95)", 0.9, "30%", "40%"),
    dot("rgba(110,245,232,.95)", 0.7, "70%", "20%"),
    dot("rgba(79,216,255,1)", 0.8, "50%", "75%"),
    dot("rgba(225,248,255,.9)", 0.6, "15%", "85%"),
    dot("rgba(79,216,255,.85)", 0.6, "85%", "60%"),
  ].join(","),
  backgroundSize: "11px 9px, 7px 13px, 13px 7px, 9px 11px, 17px 5px",
  filter: "drop-shadow(0 0 2px rgba(79,216,255,.9))",
  pointerEvents: "none",
};

/** Sim ışıltısı için bir kez eklenecek stil (opaklık ile yanıp söner) */
export function GlitterStyles() {
  return (
    <style>{`
      @keyframes glitterTw { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
      .glitter-tw { animation: glitterTw 3.2s ease-in-out infinite; will-change: opacity; }
      @media (prefers-reduced-motion: reduce) { .glitter-tw { animation: none; } }
    `}</style>
  );
}
