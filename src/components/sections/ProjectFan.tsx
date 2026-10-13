"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type Project = {
  id: number;
  title: string;
  images: string[];
};

type Props = {
  projects: Project[];
  activeIndex: number;
  onSelect: (index: number) => void;
  /** Section ekrana geldiğinde true: tüm sahne (nehir → göbek → yapraklar) baştan oynar. */
  play: boolean;
};

/* =========================================================
   GEOMETRİ

   Nehir, göbek ve yapraklar ARTIK AYNI SVG'de ve aynı
   koordinat sisteminde. Böylece nehrin ucu her ekran
   boyutunda fanın tam merkezine iner.
========================================================= */

const SIZE = 1200;
const CX = 600;
const CY = 600;

const INNER_R = 178;
const OUTER_R = 655;

const HUB_R = 222; // göbeğin dış bileziği (yaprak köklerini örter)
const METAL_R = 190; // fırçalanmış metal disk
const HUB_RING_R = 199; // buz mavisi halka

const TWIST = 12;

/* Aktif yaprak sola (ekrana doğru) baksın. */
const FACE_ANGLE = 180 + TWIST / 2;

/* =========================================================
   ZAMAN ÇİZELGESİ (ms)

   0 ─────── 1500   nehir sağdan akar
        1150 ─────── 2950   su girdap olur, sonra metale döner
        1250 ── 2250        nehrin kuyruğu göbeğe çekilir
                  2650 ──────────── ~6000   yapraklar tek tek
                                     ─── 900  dış halka kapanır
========================================================= */

const STREAM_DUR = 1500;

const DRAIN_START = 1250;
const DRAIN_DUR = 1000;

const HUB_START = 1150;
const HUB_DUR = 1800;

const BLADES_START = 2650;
const BLADE_DUR = 950;
const BLADE_STAGGER = 270;

const RING_DUR = 900;

const SELECT_TRANSITION = "transform 900ms cubic-bezier(.22,.8,.3,1)";

function getTimeline(count: number) {
  const lastBladeStart = BLADES_START + (count - 1) * BLADE_STAGGER;
  const ringStart = lastBladeStart + BLADE_DUR * 0.55;
  const buildEnd = ringStart + RING_DUR;

  return { ringStart, buildEnd };
}

/* =========================================================
   HELPERS
========================================================= */

const clamp = (v: number) => Math.max(0, Math.min(1, v));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const phase = (t: number, start: number, dur: number) =>
  clamp((t - start) / dur);

const smoothstep = (t: number) => t * t * (3 - 2 * t);

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* Hafif taşma: yaprak yerine "oturur". */
const easeOutBack = (t: number) => {
  const c1 = 1.25;
  const c3 = c1 + 1;

  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const bump = (t: number) => Math.sin(Math.PI * clamp(t));

function polar(radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180;

  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);

  const ch = (p: number, s: number) => (p >> s) & 255;

  const r = Math.round(lerp(ch(pa, 16), ch(pb, 16), t));
  const g = Math.round(lerp(ch(pa, 8), ch(pb, 8), t));
  const bl = Math.round(lerp(ch(pa, 0), ch(pb, 0), t));

  return `rgb(${r},${g},${bl})`;
}

function arcPath(radius: number, from: number, to: number) {
  const a = polar(radius, from);
  const b = polar(radius, to);

  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y}`;
}

/** İki açı arasındaki en kısa fark (-180…180) */
const shortestDelta = (from: number, to: number) =>
  ((((to - from) % 360) + 540) % 360) - 180;

/* =========================================================
   YAPRAK

   Tek bir yaprak 0° yönünde çiziliyor, her yaprak
   grubu kendi açısına döndürülüyor.
========================================================= */

function createBladePath(count: number) {
  const step = 360 / count;

  const innerHalf = step * 0.31;
  const outerHalf = step * 0.42;

  const a = polar(INNER_R, -innerHalf);
  const b = polar(OUTER_R, -outerHalf - TWIST);
  const c = polar(OUTER_R, outerHalf - TWIST);
  const d = polar(INNER_R, innerHalf);

  const control1 = polar(390, -innerHalf - TWIST * 0.35);
  const control2 = polar(455, innerHalf - TWIST * 0.72);

  const tip = polar(OUTER_R + 18, -TWIST);

  return `
    M ${a.x} ${a.y}
    Q ${control1.x} ${control1.y} ${b.x} ${b.y}
    Q ${tip.x} ${tip.y} ${c.x} ${c.y}
    Q ${control2.x} ${control2.y} ${d.x} ${d.y}
    Q ${CX} ${CY} ${a.x} ${a.y}
    Z
  `;
}

/* Fotoğrafın döndüğü nokta (yaprağın ağırlık merkezi). */
const BLADE_CENTROID = polar((INNER_R + OUTER_R) / 2 + 20, -TWIST * 0.6);

/* Her açıda yaprağı tamamen kaplayacak kare. */
const IMG = 640;

/* =========================================================
   NEHİR

   Ekranın en sağından (görünür alanın dışından) giriyor,
   fanın üstünden sola kıvrılıyor, alttan dönüp merkeze
   sarmal gibi dalıyor.
========================================================= */

const STREAM_START: [number, number] = [1120, 150];

/** Kübik Bézier parçaları: [c1x, c1y, c2x, c2y, x, y] */
const STREAM_CURVES: [number, number, number, number, number, number][] = [
  [930, 118, 780, 168, 650, 235],
  [500, 312, 330, 300, 282, 430],
  [238, 548, 300, 662, 405, 642],
  [482, 626, 522, 562, 600, 600],
];

const STREAM_PATH = `M ${STREAM_START.join(" ")} ${STREAM_CURVES.map(
  (c) => `C ${c.join(" ")}`,
).join(" ")}`;

/* Akış başının konumu için yol uzunluğu tablosu.
   DOM'a (getPointAtLength) ihtiyaç duymadan, saf matematikle hesaplanır. */
const STREAM_SAMPLES = 80;

const STREAM_LUT = (() => {
  const pts: { x: number; y: number; len: number }[] = [
    { x: STREAM_START[0], y: STREAM_START[1], len: 0 },
  ];

  let px = STREAM_START[0];
  let py = STREAM_START[1];
  let acc = 0;

  for (const [x1, y1, x2, y2, x3, y3] of STREAM_CURVES) {
    for (let k = 1; k <= STREAM_SAMPLES; k++) {
      const t = k / STREAM_SAMPLES;
      const u = 1 - t;

      const x =
        u * u * u * px +
        3 * u * u * t * x1 +
        3 * u * t * t * x2 +
        t * t * t * x3;
      const y =
        u * u * u * py +
        3 * u * u * t * y1 +
        3 * u * t * t * y2 +
        t * t * t * y3;

      const prev = pts[pts.length - 1];
      acc += Math.hypot(x - prev.x, y - prev.y);
      pts.push({ x, y, len: acc });
    }

    px = x3;
    py = y3;
  }

  return pts;
})();

const STREAM_TOTAL = STREAM_LUT[STREAM_LUT.length - 1].len;

/** Yolun %frac noktasındaki (0…1) koordinat */
function streamPointAt(frac: number) {
  const target = clamp(frac) * STREAM_TOTAL;

  let lo = 0;
  let hi = STREAM_LUT.length - 1;

  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;

    if (STREAM_LUT[mid].len <= target) lo = mid;
    else hi = mid;
  }

  const a = STREAM_LUT[lo];
  const b = STREAM_LUT[hi];
  const f = (target - a.len) / (b.len - a.len || 1);

  return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) };
}

const FLOW_LINES: [number, number, number, number, number][] = [
  // [dx, dy, genişlik, opaklık, süre]
  [-20, -24, 2, 0.3, 3.1],
  [-8, -11, 1.3, 0.55, 2.6],
  [0, 0, 2.4, 0.22, 3.4],
  [10, 13, 1.2, 0.6, 2.8],
  [22, 25, 1.8, 0.32, 3.2],
];

/* =========================================================
   GİRDAP KOLLARI
========================================================= */

function spiralPath(offset: number) {
  const pts: string[] = [];
  const N = 64;

  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const a = ((offset + s * 1.4 * 360) * Math.PI) / 180;
    const r = 12 + (HUB_R - 26) * s;

    pts.push(`${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`);
  }

  return `M ${pts.join(" L ")}`;
}

const VORTEX_ARMS = [0, 120, 240].map(spiralPath);

/* =========================================================
   FIRÇALANMIŞ METAL (conic gradient'in saf SVG hali)
========================================================= */

const METAL_STOPS: [number, string][] = [
  [0, "#344f78"],
  [0.12, "#a5b8d4"],
  [0.25, "#2a4468"],
  [0.4, "#7e94b8"],
  [0.55, "#1c355c"],
  [0.7, "#aec0da"],
  [0.85, "#39547c"],
  [1, "#344f78"],
];

const WEDGES = 120;

const BRUSHED_WEDGES = Array.from({ length: WEDGES }, (_, i) => {
  const f = i / WEDGES;

  let k = 0;

  while (k < METAL_STOPS.length - 2 && f > METAL_STOPS[k + 1][0]) {
    k++;
  }

  const [f0, c0] = METAL_STOPS[k];
  const [f1, c1] = METAL_STOPS[k + 1];

  const a0 = f * 360;
  const a1 = ((i + 1) / WEDGES) * 360 + 0.6; // ek yeri kalmasın

  const p0 = polar(METAL_R, a0);
  const p1 = polar(METAL_R, a1);

  return {
    d: `M ${CX} ${CY} L ${p0.x} ${p0.y} A ${METAL_R} ${METAL_R} 0 0 1 ${p1.x} ${p1.y} Z`,
    fill: mixHex(c0, c1, (f - f0) / (f1 - f0)),
  };
});

const GROOVES = Array.from(
  { length: Math.floor((METAL_R - 18) / 5) },
  (_, i) => 18 + i * 5,
);

/* =========================================================
   "Hareketi azalt" tercihi (tarayıcı ayarı, değişince güncellenir)
========================================================= */

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeReduceMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCE_QUERY);

  mq.addEventListener("change", onChange);

  return () => mq.removeEventListener("change", onChange);
};

const getReduceMotion = () => window.matchMedia(REDUCE_QUERY).matches;
const getServerReduceMotion = () => false;

/* =========================================================
   COMPONENT
========================================================= */

export default function ProjectFan({
  projects,
  activeIndex,
  onSelect,
  play,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;

  const count = projects.length;
  const step = 360 / count;

  const bladePath = useMemo(() => createBladePath(count), [count]);

  const { ringStart, buildEnd } = useMemo(() => getTimeline(count), [count]);

  /* =======================================================
     TEK ZAMAN ÇİZELGESİ
     play kapalıysa t = 0; "hareketi azalt" açıksa doğrudan son kare;
     aksi halde rAF döngüsü geçen süreyi günceller.
  ======================================================= */

  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotion,
    getServerReduceMotion,
  );

  const [elapsed, setElapsed] = useState(0);
  const [prevPlay, setPrevPlay] = useState(play);

  /* play her değiştiğinde sahne baştan başlasın (render sırasında sıfırlama) */
  if (prevPlay !== play) {
    setPrevPlay(play);
    setElapsed(0);
  }

  useEffect(() => {
    if (!play || reduceMotion) return;

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const passed = now - start;

      setElapsed(Math.min(passed, buildEnd));

      if (passed < buildEnd) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [play, reduceMotion, buildEnd]);

  const t = !play ? 0 : reduceMotion ? buildEnd : elapsed;

  /* =======================================================
     PROJE SEÇİMİ — en kısa yoldan döner
     (9 → 0 geçişinde fan tam tur atmaz)
  ======================================================= */

  const targetRot = FACE_ANGLE - activeIndex * step;

  const [fanRot, setFanRot] = useState(targetRot);
  const [prevTargetRot, setPrevTargetRot] = useState(targetRot);

  if (prevTargetRot !== targetRot) {
    setPrevTargetRot(targetRot);
    setFanRot((prev) => prev + shortestDelta(prev, targetRot));
  }

  /* =======================================================
     NEHİR
  ======================================================= */

  const head = easeInOutCubic(phase(t, 0, STREAM_DUR));
  const tail = easeInOutCubic(phase(t, DRAIN_START, DRAIN_DUR));

  const streamVisible = play && head - tail > 0.002;

  const headPt = head > 0 && head < 1 ? streamPointAt(head) : null;

  /* =======================================================
     GÖBEK: su → girdap → metal
  ======================================================= */

  const hubRaw = phase(t, HUB_START, HUB_DUR);

  const waterP = easeOutCubic(phase(t, HUB_START, HUB_DUR * 0.6));
  const metalP = easeInOutCubic(
    phase(t, HUB_START + HUB_DUR * 0.45, HUB_DUR * 0.55),
  );
  const ringHubP = easeOutCubic(
    phase(t, HUB_START + HUB_DUR * 0.6, HUB_DUR * 0.45),
  );
  const waveP = phase(t, HUB_START + HUB_DUR * 0.78, 800);

  const vortexRot = easeOutCubic(hubRaw) * 900;
  const waterFade = 1 - phase(metalP, 0.6, 0.4);

  /* =======================================================
     YAPRAKLAR
  ======================================================= */

  const buildP = phase(t, BLADES_START, buildEnd - BLADES_START);
  const buildRot = (1 - easeOutCubic(buildP)) * -30;

  const ringP = easeInOutCubic(phase(t, ringStart, RING_DUR));

  const done = t >= buildEnd;
  const transition = done ? SELECT_TRANSITION : "none";

  const blades = projects.map((project, i) => {
    const lp = phase(t, BLADES_START + i * BLADE_STAGGER, BLADE_DUR);
    const e = easeOutCubic(lp);

    return {
      project,
      i,
      lp,
      e,
      /* Önceki yaprağın arkasından kayarak açılır (yelpaze gibi). */
      swing: lerp(-step * 0.85, 0, easeOutBack(lp)),
      /* Göbeğin altından dışarı doğru büyüyen görünürlük. */
      revealR: lerp(HUB_R - 30, OUTER_R + 70, e),
      frameP: easeOutCubic(clamp((lp - 0.08) / 0.72)),
      imgP: smoothstep(clamp((lp - 0.35) / 0.55)),
      glint: clamp((lp - 0.5) / 0.5),
    };
  });

  const C = BLADE_CENTROID;

  const rotateAround = (x: number, y: number, deg: number) =>
    `translate(${x}px, ${y}px) rotate(${deg}deg) translate(${-x}px, ${-y}px)`;

  return (
    <div className="pointer-events-none absolute top-1/2 -right-62.5 aspect-square h-[min(116vh,1200px)] -translate-y-1/2">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-full overflow-visible"
      >
        <defs>
          {/* ================= METAL ================= */}

          <linearGradient id={id("metal")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8497b8" />
            <stop offset=".1" stopColor="#28416a" />
            <stop offset=".27" stopColor="#a9b9d2" />
            <stop offset=".43" stopColor="#3f5a82" />
            <stop offset=".62" stopColor="#18345a" />
            <stop offset=".82" stopColor="#0a2444" />
            <stop offset="1" stopColor="#04142a" />
          </linearGradient>

          <linearGradient id={id("innerMetal")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b8c6dc" />
            <stop offset=".22" stopColor="#62789e" />
            <stop offset=".5" stopColor="#2c4870" />
            <stop offset=".78" stopColor="#122c50" />
            <stop offset="1" stopColor="#061832" />
          </linearGradient>

          <linearGradient id={id("glass")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#03132a" stopOpacity=".15" />
            <stop offset=".5" stopColor="#061a34" stopOpacity=".07" />
            <stop offset="1" stopColor="#000f22" stopOpacity=".32" />
          </linearGradient>

          {/* ================= GÖBEK ================= */}

          <radialGradient id={id("hubCollar")}>
            <stop offset="0" stopColor="#0d2442" />
            <stop offset=".82" stopColor="#16345a" />
            <stop offset=".9" stopColor="#2b4a74" />
            <stop offset=".96" stopColor="#0e2442" />
            <stop offset="1" stopColor="#05132a" />
          </radialGradient>

          <radialGradient id={id("hubShade")}>
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset=".7" stopColor="#020f22" stopOpacity=".08" />
            <stop offset="1" stopColor="#020f22" stopOpacity=".55" />
          </radialGradient>

          <linearGradient id={id("hubSpec")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".2" />
            <stop offset=".45" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#000814" stopOpacity=".3" />
          </linearGradient>

          <linearGradient id={id("hubBevel")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d8e4f4" stopOpacity=".7" />
            <stop offset=".5" stopColor="#3a5a86" stopOpacity=".4" />
            <stop offset="1" stopColor="#020b1a" stopOpacity=".8" />
          </linearGradient>

          <radialGradient id={id("cap")} cx=".35" cy=".35">
            <stop offset="0" stopColor="#c4d2e6" />
            <stop offset=".5" stopColor="#4e6890" />
            <stop offset="1" stopColor="#0e2748" />
          </radialGradient>

          {/* ================= SU ================= */}

          <linearGradient id={id("streamBody")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#010f22" />
            <stop offset=".2" stopColor="#021a36" />
            <stop offset=".48" stopColor="#083465" />
            <stop offset=".72" stopColor="#0d4f8f" />
            <stop offset="1" stopColor="#03254a" />
          </linearGradient>

          <linearGradient id={id("streamLight")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#46beff" stopOpacity=".04" />
            <stop offset=".35" stopColor="#4a86c8" stopOpacity=".14" />
            <stop offset=".6" stopColor="#cfe6ff" stopOpacity=".35" />
            <stop offset="1" stopColor="#4a86c8" stopOpacity=".06" />
          </linearGradient>

          <radialGradient id={id("waterHub")}>
            <stop offset="0" stopColor="#04162e" />
            <stop offset=".28" stopColor="#07305a" />
            <stop offset=".58" stopColor="#0d4b86" />
            <stop offset=".8" stopColor="#083766" />
            <stop offset="1" stopColor="#021428" />
          </radialGradient>

          <radialGradient id={id("waterHighlight")}>
            <stop offset="0" stopColor="#dbe9fb" stopOpacity=".35" />
            <stop offset=".35" stopColor="#4a86c8" stopOpacity=".13" />
            <stop offset="1" stopColor="#00131f" stopOpacity="0" />
          </radialGradient>

          {/* ================= FİLTRELER ================= */}

          <filter
            id={id("glow")}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter
            id={id("soft")}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="12" />
          </filter>

          <filter
            id={id("distort")}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".004 .014"
              numOctaves="1"
              seed="5"
            />
            <feDisplacementMap in="SourceGraphic" scale="7" />
          </filter>

          {/* ================= MASKELER ================= */}

          <mask
            id={id("streamMask")}
            maskUnits="userSpaceOnUse"
            x={-1200}
            y={-600}
            width={3600}
            height={2400}
          >
            <rect x={-1200} y={-600} width={3600} height={2400} fill="black" />

            {/* baş ve kuyruk aynı anda kontrol ediliyor */}
            <path
              d={STREAM_PATH}
              fill="none"
              stroke="white"
              strokeWidth={190}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${Math.max(0, head - tail)} 3`}
              strokeDashoffset={-tail}
            />
          </mask>

          <clipPath id={id("blade")}>
            <path d={bladePath} />
          </clipPath>

          {blades.map((b) => (
            <clipPath key={b.i} id={id(`reveal-${b.i}`)}>
              <circle cx={CX} cy={CY} r={b.revealR} />
            </clipPath>
          ))}
        </defs>

        {/* ===================================================
            1. NEHİR — sağdan akar, sonra göbeğe çekilir
        =================================================== */}

        {streamVisible && (
          <g mask={`url(#${id("streamMask")})`}>
            <path
              d={STREAM_PATH}
              fill="none"
              stroke="#1a5ea8"
              strokeWidth={170}
              strokeOpacity={0.22}
              filter={`url(#${id("soft")})`}
            />

            <path
              d={STREAM_PATH}
              fill="none"
              stroke={`url(#${id("streamBody")})`}
              strokeWidth={122}
              strokeLinecap="round"
            />

            <path
              d={STREAM_PATH}
              fill="none"
              stroke="#011226"
              strokeWidth={86}
              strokeLinecap="round"
              opacity={0.5}
            />

            <path
              d={STREAM_PATH}
              fill="none"
              stroke="#073362"
              strokeWidth={68}
              strokeLinecap="round"
              opacity={0.65}
            />

            <path
              d={STREAM_PATH}
              fill="none"
              stroke={`url(#${id("streamLight")})`}
              strokeWidth={44}
              strokeLinecap="round"
            />

            <g filter={`url(#${id("distort")})`}>
              {FLOW_LINES.map(([dx, dy, w, o, dur], k) => (
                <path
                  key={k}
                  d={STREAM_PATH}
                  fill="none"
                  stroke={k % 2 ? "#5b8fc9" : "#a9cdf5"}
                  strokeWidth={w}
                  strokeOpacity={o}
                  strokeDasharray="110 60"
                  strokeLinecap="round"
                  transform={`translate(${dx} ${dy})`}
                  style={{ animation: `fanStreamFlow ${dur}s linear infinite` }}
                />
              ))}
            </g>

            {/* akan ucun köpüğü */}
            {head < 1 && (
              <path
                d={STREAM_PATH}
                fill="none"
                stroke="#e6f0ff"
                strokeWidth={70}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray=".05 3"
                strokeDashoffset={0.05 - head}
                strokeOpacity={0.22}
                filter={`url(#${id("soft")})`}
              />
            )}
          </g>
        )}

        {headPt && (
          <g>
            <circle
              cx={headPt.x}
              cy={headPt.y}
              r={44}
              fill="#46beff"
              opacity={0.16}
              filter={`url(#${id("soft")})`}
            />
            <circle
              cx={headPt.x}
              cy={headPt.y}
              r={16}
              fill="#7fb6e8"
              opacity={0.5}
              filter={`url(#${id("glow")})`}
            />
            <circle cx={headPt.x} cy={headPt.y} r={5} fill="#eef5ff" />
          </g>
        )}

        {/* ===================================================
            2. YAPRAKLAR + DIŞ HALKA (dönen grup)
        =================================================== */}

        <g
          style={{
            transform: rotateAround(CX, CY, fanRot + buildRot),
            transition,
          }}
        >
          {blades.map(({ project, i, lp, e, swing, frameP, imgP, glint }) => {
            if (lp <= 0) return null;

            const angle = i * step;
            const isActive = i === activeIndex;

            /* Fotoğraf her zaman dik dursun: tüm dönüşlerin tersi. */
            const imageRot = -(angle + swing + buildRot);
            const imgScale = 1.18 - 0.18 * imgP;

            return (
              <g
                key={project.id}
                className={[
                  "fan-blade",
                  done ? "is-ready pointer-events-auto cursor-pointer" : "",
                  isActive ? "is-active" : "",
                ].join(" ")}
                role="button"
                tabIndex={done ? 0 : -1}
                aria-label={project.title}
                aria-pressed={isActive}
                onClick={() => {
                  if (done) onSelect(i);
                }}
                onKeyDown={(ev: KeyboardEvent<SVGGElement>) => {
                  if (done && (ev.key === "Enter" || ev.key === " ")) {
                    ev.preventDefault();
                    onSelect(i);
                  }
                }}
                transform={`rotate(${angle + swing} ${CX} ${CY})`}
                clipPath={`url(#${id(`reveal-${i}`)})`}
              >
                {/* gölge */}
                <path
                  d={bladePath}
                  fill="#000914"
                  opacity={e * 0.5}
                  transform="translate(6 10)"
                />

                {/* gövde */}
                <path d={bladePath} fill="#03152c" />

                {/* fotoğraf */}
                <g clipPath={`url(#${id("blade")})`}>
                  <g
                    style={{
                      transform: rotateAround(C.x, C.y, -fanRot),
                      transition,
                    }}
                  >
                    {project.images[0] && (
                      <image
                        href={project.images[0]}
                        x={C.x - IMG / 2}
                        y={C.y - IMG / 2}
                        width={IMG}
                        height={IMG}
                        preserveAspectRatio="xMidYMid slice"
                        opacity={imgP}
                        transform={`translate(${C.x} ${C.y}) rotate(${imageRot}) scale(${imgScale}) translate(${-C.x} ${-C.y})`}
                      />
                    )}
                  </g>
                </g>

                {/* koyu cam */}
                <path
                  className="blade-glass"
                  d={bladePath}
                  fill={`url(#${id("glass")})`}
                  opacity={imgP * (isActive ? 0.3 : 1)}
                />

                {/* metal çerçeve çizilerek oluşur */}
                <path
                  d={bladePath}
                  fill="none"
                  stroke={`url(#${id("metal")})`}
                  strokeWidth="26"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset={1 - frameP}
                />

                <path
                  d={bladePath}
                  fill="none"
                  stroke={`url(#${id("innerMetal")})`}
                  strokeWidth="9"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset={1 - frameP}
                  opacity={0.72}
                />

                {/* kenar — aktif yaprakta altın */}
                <path
                  className="blade-edge"
                  d={bladePath}
                  fill="none"
                  stroke={isActive ? "#ffe4aa" : "#5b8fc9"}
                  strokeWidth={isActive ? 2.6 : 1.15}
                  strokeOpacity={frameP * (isActive ? 0.85 : 0.3)}
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset={1 - frameP}
                />

                {isActive && done && (
                  <path
                    d={bladePath}
                    fill="none"
                    stroke="#d9b777"
                    strokeWidth="8"
                    strokeOpacity=".22"
                    filter={`url(#${id("soft")})`}
                  />
                )}

                {/* çizim ucunu takip eden ışık */}
                {frameP > 0 && frameP < 1 && (
                  <path
                    d={bladePath}
                    fill="none"
                    stroke="#eef5ff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray=".05 .95"
                    strokeDashoffset={0.05 - frameP}
                    strokeOpacity={bump(frameP) * 0.95}
                    filter={`url(#${id("glow")})`}
                  />
                )}

                {/* yaprak oturunca kenarda gezen parıltı */}
                {glint > 0 && glint < 1 && (
                  <path
                    d={bladePath}
                    fill="none"
                    stroke="#8cc4f2"
                    strokeWidth="10"
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray=".08 .92"
                    strokeDashoffset={-glint}
                    strokeOpacity={bump(glint) * 0.35}
                    filter={`url(#${id("soft")})`}
                  />
                )}
              </g>
            );
          })}

          {/* dış halka — tüm yapraklardan sonra kapanır */}
          {ringP > 0 && (
            <g transform={`rotate(-90 ${CX} ${CY})`}>
              <circle
                cx={CX}
                cy={CY}
                r={OUTER_R + 9}
                fill="none"
                stroke={`url(#${id("metal")})`}
                strokeWidth="36"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset={1 - ringP}
              />
              <circle
                cx={CX}
                cy={CY}
                r={OUTER_R - 11}
                fill="none"
                stroke="#7fb6e8"
                strokeWidth="1.5"
                strokeOpacity={ringP * 0.38}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset={1 - ringP}
              />
              {ringP < 1 && (
                <circle
                  cx={CX}
                  cy={CY}
                  r={OUTER_R + 9}
                  fill="none"
                  stroke="#eef5ff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray=".03 .97"
                  strokeDashoffset={0.03 - ringP}
                  strokeOpacity={bump(ringP)}
                  filter={`url(#${id("glow")})`}
                />
              )}
            </g>
          )}
        </g>

        {/* ===================================================
            3. GÖBEK — su girdabı metale dönüşür
        =================================================== */}

        {waterP > 0 && waterFade > 0 && (
          <g opacity={waterFade}>
            <circle
              cx={CX}
              cy={CY}
              r={HUB_R * waterP}
              fill={`url(#${id("waterHub")})`}
            />
            <circle
              cx={CX}
              cy={CY}
              r={HUB_R * 0.9 * waterP}
              fill={`url(#${id("waterHighlight")})`}
            />

            <g
              transform={`translate(${CX} ${CY}) rotate(${vortexRot}) scale(${waterP})`}
            >
              {VORTEX_ARMS.map((d, k) => (
                <path
                  key={k}
                  d={d}
                  fill="none"
                  stroke={["#7fb6e8", "#4a86c8", "#cfe6ff"][k]}
                  strokeWidth={[4, 3, 2][k]}
                  strokeOpacity={0.55}
                  strokeLinecap="round"
                  strokeDasharray="60 26"
                  filter={k === 0 ? `url(#${id("glow")})` : undefined}
                />
              ))}
            </g>

            {[0, 0.5].map((o) => {
              const rp = (hubRaw * 3 + o) % 1;

              return (
                <circle
                  key={o}
                  cx={CX}
                  cy={CY}
                  r={HUB_R * waterP * rp}
                  fill="none"
                  stroke="#cfe6ff"
                  strokeWidth="1.5"
                  strokeOpacity={(1 - rp) * 0.4}
                />
              );
            })}

            <circle
              cx={CX}
              cy={CY}
              r={HUB_R * waterP}
              fill="none"
              stroke="#5b8fc9"
              strokeWidth="3"
              strokeOpacity=".42"
            />
          </g>
        )}

        {metalP > 0 && (
          <g
            opacity={metalP}
            transform={`translate(${CX} ${CY}) scale(${0.9 + 0.1 * metalP}) translate(${-CX} ${-CY})`}
          >
            <circle
              cx={CX}
              cy={CY}
              r={HUB_R + 6}
              fill="#000a12"
              opacity=".5"
              transform="translate(6 10)"
            />

            <circle
              cx={CX}
              cy={CY}
              r={HUB_R}
              fill={`url(#${id("hubCollar")})`}
              stroke="#071d3a"
              strokeWidth="2"
            />

            <circle
              cx={CX}
              cy={CY}
              r={HUB_R - 4}
              fill="none"
              stroke="#5b8fc9"
              strokeWidth="1"
              strokeOpacity=".22"
            />

            <circle
              cx={CX}
              cy={CY}
              r={206}
              fill="none"
              stroke="#051228"
              strokeWidth="8"
              opacity=".7"
            />

            {/* su donarken hâlâ biraz dönüyor */}
            <g transform={`rotate(${(1 - metalP) * 140} ${CX} ${CY})`}>
              {BRUSHED_WEDGES.map((w, k) => (
                <path key={k} d={w.d} fill={w.fill} />
              ))}

              {GROOVES.map((r, k) => (
                <circle
                  key={r}
                  cx={CX}
                  cy={CY}
                  r={r}
                  fill="none"
                  stroke={k % 2 ? "#000" : "#fff"}
                  strokeWidth=".7"
                  strokeOpacity={k % 2 ? 0.06 : 0.045}
                />
              ))}
            </g>

            <circle
              cx={CX}
              cy={CY}
              r={METAL_R}
              fill={`url(#${id("hubShade")})`}
            />
            <circle
              cx={CX}
              cy={CY}
              r={METAL_R}
              fill={`url(#${id("hubSpec")})`}
            />
            <circle
              cx={CX}
              cy={CY}
              r={METAL_R}
              fill="none"
              stroke={`url(#${id("hubBevel")})`}
              strokeWidth="3"
            />

            <circle
              cx={CX}
              cy={CY}
              r={30}
              fill={`url(#${id("cap")})`}
              stroke="#6fa3dc"
              strokeWidth="1.2"
              strokeOpacity=".4"
            />
            <circle cx={CX} cy={CY} r={4} fill="#eef5ff" opacity=".85" />
          </g>
        )}

        {/* buz mavisi halka çizilir */}
        {ringHubP > 0 && (
          <g
            className={done ? "hub-breathe" : ""}
            transform={`rotate(-90 ${CX} ${CY})`}
          >
            <circle
              cx={CX}
              cy={CY}
              r={HUB_RING_R}
              fill="none"
              stroke="#8cc4f2"
              strokeWidth="5"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={1 - ringHubP}
              strokeOpacity=".75"
              filter={`url(#${id("glow")})`}
            />
            <circle
              cx={CX}
              cy={CY}
              r={HUB_RING_R}
              fill="none"
              stroke="#eef5ff"
              strokeWidth="1.2"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={1 - ringHubP}
              strokeOpacity=".8"
            />
          </g>
        )}

        {/* her yaprak doğarken göbek halkasında ışık atımı */}
        {blades.map(({ i, lp, swing }) => {
          if (lp <= 0 || lp >= 0.5) return null;

          const ang = fanRot + buildRot + i * step + swing - TWIST / 2;

          return (
            <path
              key={i}
              d={arcPath(HUB_RING_R, ang - 10, ang + 10)}
              fill="none"
              stroke="#eef5ff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeOpacity={bump(lp / 0.5)}
              filter={`url(#${id("glow")})`}
            />
          );
        })}

        {/* göbek tamamlanırken enerji dalgası */}
        {waveP > 0 && waveP < 1 && (
          <>
            <circle
              cx={CX}
              cy={CY}
              r={HUB_R + waveP * 300}
              fill="none"
              stroke="#dbe9fb"
              strokeWidth="2"
              strokeOpacity={(1 - waveP) * 0.9}
              filter={`url(#${id("glow")})`}
            />
            <circle
              cx={CX}
              cy={CY}
              r={HUB_R + waveP * 160}
              fill="none"
              stroke="#5b8fc9"
              strokeWidth="1"
              strokeOpacity={(1 - waveP) * 0.6}
            />
          </>
        )}

        <style>{`
          @keyframes fanStreamFlow {
            to { stroke-dashoffset: -340; }
          }

          @keyframes hubBreathe {
            0%, 100% { opacity: .7; }
            50% { opacity: 1; }
          }

          .hub-breathe {
            animation: hubBreathe 3.2s ease-in-out infinite;
          }

          .fan-blade { outline: none; }

          .fan-blade .blade-glass,
          .fan-blade .blade-edge {
            transition: opacity .35s ease, stroke-opacity .35s ease;
          }

          .fan-blade.is-ready:not(.is-active):hover .blade-glass {
            opacity: .45;
          }

          .fan-blade.is-ready:not(.is-active):hover .blade-edge,
          .fan-blade.is-ready:focus-visible .blade-edge {
            stroke-opacity: .9;
          }

          @media (prefers-reduced-motion: reduce) {
            .hub-breathe { animation: none; }
            .fan-blade path { animation: none !important; }
          }
        `}</style>
      </svg>
    </div>
  );
}
