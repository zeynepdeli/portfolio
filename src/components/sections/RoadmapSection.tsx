"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { Code2, Container, Palette, Brain } from "lucide-react";

import RoadmapNode from "@/components/sections/RoadmapNode";
import CollectedSkillsPanel from "@/components/sections/CollectedSkillsPanel";
import SciFiBackground from "../ui/ScifiBackground";

/* ================================================================
   AYARLAR
================================================================ */

const W = 2576;
const H = 1093;
const STEPS = 16;

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/* ================================================================
   PALET — sitenin geri kalanıyla aynı
   (lacivert zemin, buz mavisi ışıklar, camgöbeği cam kenarı,
   altın aksan = çip / akım çizgileri)
================================================================ */

const C = {
  edge: "#46beff", // cam kenarı (GLASS_EDGE 70,190,255)
  edgeRGB: "70,190,255",
  ice: "#cfe6ff", // buz beyazı
  iceSoft: "#a9cdf5",
  steel: "#5b8fc9", // soluk buz mavisi
  steelDim: "#3d6fa8",
  gold: "#d9b777",
  goldRGB: "217,183,119",
  goldLight: "#ffe4aa",
};

/* ================================================================
   AVATAR — nehir boyunca kayarak yetenekleri toplar
   (public/images/zeynep-comelme.png)
================================================================ */

/* Yürümez: fotoğraftaki çömelme pozuyla nehrin üstünde oturup kayar */
const SIT_SRC = "/images/zeynep-comelme.png";
const SIT_LEDGE = 0.954; // fotoğrafta zemin çizgisi
/** Kişinin boyu (ekran px) */
const AV_H = 64;
const AV_W = Math.round((AV_H * 242) / 240);
/** Hız (ekran px / sn) */
const WALK_SPEED = 1150;
/** Her yetenekte eğilip alma süresi (ms) — kısa ve tok */
const PICKUP_MS = 60;
/** Alırken saçılan altın kıvılcımlar */
const PICK_SPARKS: [number, number][] = [
  [-18, -46],
  [-6, -58],
  [8, -54],
  [20, -44],
  [-26, -30],
  [28, -32],
  [0, -70],
];

/** Hız izi çizgileri: [y oranı, uzunluk, opaklık, süre ms] */
const TRAIL_LINES: [number, number, number, number][] = [
  [0.05, 40, 0.5, 170],
  [0.35, 56, 0.75, 130],
  [0.62, 44, 0.6, 190],
  [0.88, 32, 0.45, 150],
];

/** Yetenek ışık topunun panele uçuş süresi (ms) */
const ORB_MS = 620;

/** Tüm yetenekler toplandıktan sonra panelin yanmasına kadar bekleme (ms) */
const PANEL_ON_DELAY = 350;

/** Yetenekler panelinin kapladığı alanın sağ kenarı (px) */
const PANEL_AREA = (w: number) => w * 0.02 + 610 + 60;

/** Node kartının yaklaşık sol kenarı (kart ~220px genişliğinde varsayılır) */
const cardLeft = (anchorX: number, side: Side, gap: number) =>
  side === "right"
    ? anchorX + gap
    : side === "left"
      ? anchorX - gap - 220
      : anchorX - 110;

/*
 * Scroll derinlik efekti.
 *
 * river     : nehrin scroll boyunca toplam kayma miktarı (px)
 * front     : ön planın (node'lar, panel) ters yöndeki kayması (px)
 * tiltMin   : section ekrana girerken nehrin geriye eğimi (deg)
 * tiltMax   : section ekrandan çıkarken nehrin geriye eğimi (deg)
 * fade      : nehrin üstten sise karıştığı bölge (% yükseklik)
 */
const DEPTH = {
  river: 90,
  front: 24,
  tiltMin: 3,
  tiltMax: 10,
  fade: 30,
};

const flowVars = (d: string): CSSVars => ({ "--d": d });

const ROOT_VARS: CSSVars = {
  "--rm-river": `${DEPTH.river}px`,
  "--rm-front": `${DEPTH.front}px`,
  "--rm-tilt-min": `${DEPTH.tiltMin}deg`,
  "--rm-tilt-range": `${DEPTH.tiltMax - DEPTH.tiltMin}deg`,
  "--rm-fade": `${DEPTH.fade}%`,
};

type P = [number, number];

type Pt = {
  x: number;
  y: number;
};

type Side = "above" | "below" | "left" | "right";

type RoadmapSectionProps = {
  active?: boolean;
  onComplete?: () => void;
  /** true: animasyon oynamaz, sayfa doğrudan BİTMİŞ haliyle açılır
   *  (tüm yetenekler toplanmış, panel yanık, avatar çıkmış).
   *  Header menüsünden /roadmap'e gidince kullanılır. */
  finished?: boolean;
};

/* ================================================================
   NEHİR NOKTALARI
================================================================ */

const SECTIONS: [P, P][] = [
  [
    [438, -42],
    [326, -42],
  ],
  [
    [445, 18],
    [312, 18],
  ],
  [
    [450, 58],
    [300, 58],
  ],
  [
    [450, 85],
    [310, 82],
  ],
  [
    [430, 108],
    [285, 108],
  ],
  [
    [380, 130],
    [225, 132],
  ],
  [
    [330, 152],
    [165, 160],
  ],
  [
    [310, 178],
    [140, 190],
  ],
  [
    [318, 197],
    [155, 215],
  ],
  [
    [355, 212],
    [215, 238],
  ],
  [
    [430, 219],
    [410, 255],
  ],
  [
    [600, 227],
    [600, 257],
  ],
  [
    [700, 232],
    [670, 264],
  ],
  [
    [765, 244],
    [700, 285],
  ],
  [
    [803, 280],
    [714, 320],
  ],
  [
    [830, 307],
    [745, 358],
  ],
  [
    [900, 320],
    [880, 378],
  ],
  [
    [1050, 334],
    [1050, 395],
  ],
  [
    [1210, 356],
    [1120, 425],
  ],
  [
    [1300, 425],
    [1130, 460],
  ],
  [
    [1345, 500],
    [1105, 495],
  ],
  [
    [1320, 555],
    [1040, 540],
  ],
  [
    [1305, 600],
    [990, 610],
  ],
  [
    [1330, 630],
    [1020, 715],
  ],
  [
    [1400, 648],
    [1150, 790],
  ],
  [
    [1500, 658],
    [1500, 870],
  ],
  [
    [1750, 668],
    [1750, 902],
  ],
  [
    [2000, 722],
    [1880, 990],
  ],
  [
    [2250, 838],
    [1990, 1150],
  ],
  [
    [2700, 975],
    [2150, 1300],
  ],
];

/* ================================================================
   NEHİR AKIŞLARI
================================================================ */

const makeStreams = (
  count: number,
  from: number,
  span: number,
  width: number,
  opacity: number,
  dash: number,
  gap: number,
) =>
  Array.from({ length: count }, (_, i) => ({
    f: from + (i * span) / (count - 1),
    width: width + ((i * 7) % 5) * width * 0.5,
    opacity: opacity + ((i * 3) % 4) * 0.09,
    dash: `${dash + ((i * 37) % 5) * dash * 0.22} ${
      gap + ((i * 13) % 4) * gap * 0.45
    }`,
    duration: 4 + ((i * 5) % 4),
  }));

/* PERFORMANS: hareketli çizgi sayısı azaltıldı (34 → 24) */
const STREAMS = makeStreams(7, 0.1, 0.8, 0.8, 0.22, 700, 220);

const FINE_STREAMS = makeStreams(10, 0.05, 0.9, 0.6, 0.2, 200, 80);

const SOFT_STREAMS = [0.15, 0.35, 0.55, 0.75];

const HIGHLIGHTS = [0.28, 0.5, 0.68];

const DARK_BANDS = [0.3, 0.62, 0.85];

/* ================================================================
   BINARY
================================================================ */

const BINARY_LANES: [number, number, number, number, string][] = [
  [0.85, 9, 1, 0.38, "0%"],
  [0.62, 12, 2, 0.5, "55%"],
  [0.8, 14, 3, 0.45, "60%"],
];

const DIGITS: [number, number, number, string][] = [
  [0.76, 0.52, 20, "0"],
  [0.78, 0.6, 20, "1"],
  [0.8, 0.58, 20, "1"],
  [0.82, 0.55, 24, "0"],
  [0.835, 0.52, 22, "1"],
  [0.85, 0.5, 24, "0"],
  [0.865, 0.48, 22, "1"],
  [0.88, 0.46, 26, "1"],
  [0.9, 0.5, 24, "1"],
  [0.92, 0.48, 26, "0"],
  [0.95, 0.58, 26, "1"],
  [0.975, 0.72, 24, "0"],
];

/*
 * Rastgele görünen ama her render'da (ve sunucu/istemcide) aynı çıkan
 * ikilik diziler. Math.random render sırasında saf olmadığı için
 * tohumlu basit bir üreteç kullanılıyor.
 */
function seededBinary(length: number, seed: number): string {
  let s = Math.imul(seed + 1, 2654435761) >>> 0;
  let out = "";

  for (let i = 0; i < length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out += (s >>> 16) & 1 ? "1" : "0";
  }

  return out;
}

const BINARY = BINARY_LANES.map((_, i) => seededBinary(420, i));

/* Çip çevresindeki küçük noktalar */
const CHIP_DOTS: P[] = [
  [900, 840],
  [920, 852],
  [940, 862],
  [960, 850],
  [1000, 880],
  [1030, 870],
  [1060, 890],
  [1120, 850],
  [1150, 830],
  [1170, 842],
];

/* ================================================================
   ROADMAP
================================================================ */

const NODES = [
  {
    number: 1,
    icon: Code2,
    title: "Early AI Projects",
    tags: "Python, TensorFlow",
    target: { x: 470, y: 245 },
    side: "above" as Side,
    gap: 30,
  },
  {
    number: 2,
    icon: Container,
    title: "Systems Architecture",
    tags: "Docker, Git",
    target: { x: 1225, y: 480 },
    side: "right" as Side,
    gap: 110,
  },
  {
    number: 3,
    icon: Palette,
    title: "UI/UX Design",
    tags: "Figma, Sketch",
    target: { x: 1600, y: 775 },
    side: "below" as Side,
    gap: 90,
  },
  {
    number: 4,
    icon: Brain,
    title: "Leading Creative AI Projects",
    tags: "LLM, Team Lead",
    target: { x: 2150, y: 880 },
    side: "above" as Side,
    gap: 130,
  },
];

/* ================================================================
   SPLINE
================================================================ */

const cr = (a: number, b: number, c: number, d: number, t: number) =>
  b +
  0.5 * t * (c - a) +
  t ** 2 * (a - 2.5 * b + 2 * c - 0.5 * d) +
  t ** 3 * (-0.5 * a + 1.5 * b - 1.5 * c + 0.5 * d);

function spline(points: P[]): Pt[] {
  const result: Pt[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? points[i + 1];

    for (let s = 0; s < STEPS; s++) {
      const t = s / STEPS;

      result.push({
        x: cr(p0[0], p1[0], p2[0], p3[0], t),
        y: cr(p0[1], p1[1], p2[1], p3[1], t),
      });
    }
  }

  const last = points[points.length - 1];

  return [...result, { x: last[0], y: last[1] }];
}

const fmt = ({ x, y }: Pt) => `${x.toFixed(1)} ${y.toFixed(1)}`;

const line = (points: Pt[]) => `M${points.map(fmt).join(" L")}`;

const polygon = (a: Pt[], b: Pt[]) =>
  `${line(a)} L${[...b].reverse().map(fmt).join(" L")} Z`;

/* ================================================================
   GEOMETRY
================================================================ */

function buildGeometry() {
  const top = spline(SECTIONS.map(([a]) => a));
  const bottom = spline(SECTIONS.map(([, b]) => b));

  const depth = top.map(
    (p, i) => 5 + Math.hypot(p.x - bottom[i].x, p.y - bottom[i].y) * 0.08,
  );

  const lane = (ratio: number, sunk = true): Pt[] =>
    top.map((p, i) => ({
      x: p.x + (bottom[i].x - p.x) * ratio,
      y: p.y + (bottom[i].y - p.y) * ratio + (sunk ? depth[i] : 0),
    }));

  const middle = lane(0.5, false);

  const indexAt = (value: number) => Math.round(value * (top.length - 1));

  const nearest = (point: Pt) =>
    middle.reduce(
      (best, current, i) =>
        Math.hypot(current.x - point.x, current.y - point.y) <
        Math.hypot(middle[best].x - point.x, middle[best].y - point.y)
          ? i
          : best,
      0,
    );

  return {
    middle,
    river: polygon(top, bottom),
    surface: polygon(lane(0), lane(1)),
    core: polygon(lane(0.15), lane(0.6)),
    top: line(top),
    bottom: line(bottom),
    lane: (ratio: number) => line(lane(ratio)),
    digits: DIGITS.map(([t, ratio, fontSize, char]) => ({
      ...lane(ratio)[indexAt(t)],
      fontSize,
      char,
    })),
    nodeIndexes: NODES.map((node) => nearest(node.target)),
  };
}

/* Geometri sabit veriden üretilir: modül yüklenirken bir kez hesaplanır */
const GEO = buildGeometry();

const RIVER_END = GEO.middle[GEO.middle.length - 1];

/* ================================================================
   SAFE POINT
================================================================ */

const pointAt = (points: Pt[], value: number): Pt => {
  if (!points.length) {
    return { x: 0, y: 0 };
  }

  const safeValue = Math.max(
    0,
    Math.min(Number.isFinite(value) ? value : 0, points.length - 1),
  );

  const i = Math.floor(safeValue);
  const next = Math.min(i + 1, points.length - 1);
  const t = safeValue - i;

  const current = points[i];
  const target = points[next];

  return {
    x: current.x + (target.x - current.x) * t,
    y: current.y + (target.y - current.y) * t,
  };
};

/* ================================================================
   SCALE
================================================================ */

/* DİKEY: nehrin başından sonuna dikey açıklığı ekran yüksekliğine sığar */
const computeScale = (w: number, h: number, portrait: boolean) =>
  portrait ? (h * 0.96) / (RIVER_END.y + 80) : Math.max(w / W, h / H);

/* ================================================================
   NODE POSITION
================================================================ */

/*
 * Ekran daraldığında (nehir "slice" ile kırpılınca) kenara yakın
 * node kartları ekrandan taşmasın diye yatayda içeri kaydırılır.
 */
const EDGE_ROOM = 240; // kartın yarı genişliği için ayrılan pay (px)

const sideTransform = (
  side: Side,
  gap: number,
  anchorX = 0,
  width = Infinity,
) => {
  const nearRight = anchorX > width - EDGE_ROOM;
  const nearLeft = anchorX < EDGE_ROOM;
  const x = nearRight ? "calc(-100% + 40px)" : nearLeft ? "-40px" : "-50%";

  return {
    above: `translate(${x}, calc(-100% - ${gap}px))`,
    below: `translate(${x}, ${gap}px)`,
    left: `translate(calc(-100% - ${gap}px), -50%)`,
    right: nearRight
      ? `translate(calc(-100% - ${gap}px), -50%)`
      : `translate(${gap}px, -50%)`,
  }[side];
};

/* ================================================================
   SCROLL PARENT
================================================================ */

/*
 * Section bir scroll container içindeyse onu,
 * değilse window'u dinliyoruz.
 */
function getScrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement;

  while (parent) {
    const { overflowY } = getComputedStyle(parent);

    if (
      /(auto|scroll|overlay)/.test(overflowY) &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
}

/* ================================================================
   STİLLER
================================================================ */

const ROADMAP_CSS = `
  @keyframes rmFlow {
    to {
      stroke-dashoffset: -1000;
    }
  }

  /* Işık topu: yatayda panele, dikeyde önce yukarı kavis */
  @keyframes rmOrbX {
    0%   { transform: translateX(0); }
    100% { transform: translateX(var(--tx)); }
  }
  @keyframes rmOrbY {
    0%   { transform: translateY(0) scale(.4); opacity: 0; }
    12%  { transform: translateY(-30px) scale(1.25); opacity: 1; }
    80%  { opacity: 1; }
    100% { transform: translateY(var(--ty)) scale(.5); opacity: 0; }
  }

  @keyframes rmPulse {
    50% {
      opacity: .55;
    }
  }

  /* Yetenekler paneli: ekran açılıyormuş gibi titreyerek yanar */
  @keyframes rmPanelOn {
    0%   { opacity: 0;   filter: blur(12px) brightness(2.4); transform: translateY(-50%) scale(.97); }
    18%  { opacity: .85; filter: blur(3px)  brightness(1.8); }
    24%  { opacity: .2; }
    32%  { opacity: 1;   filter: blur(1px)  brightness(1.5); }
    40%  { opacity: .55; }
    55%  { opacity: 1;   filter: blur(0)    brightness(1.2); }
    100% { opacity: 1;   filter: none;                       transform: translateY(-50%); }
  }

  .rm-panel {
    position: absolute;
    left: 2%;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0;
    pointer-events: none;
    transition: opacity .4s ease;
  }
  /* dar / kısa ekran: mobil panel */
  .rm-panel--compact { left: 4%; width: min(92%, 520px); }
  .rm-panel.is-on {
    opacity: 1;
    pointer-events: auto;
    animation: rmPanelOn .7s cubic-bezier(.16,1,.3,1) both;
  }

  .rm-flow {
    animation: rmFlow var(--d) linear infinite;
  }

  .rm-pulse {
    animation: rmPulse 2.4s ease-in-out infinite;
  }

  /*
   * ARKA KATMAN: NEHİR
   *
   * - translateY: aşağı kaydırdıkça nehir sayfadan daha
   *   yavaş yukarı çıkar → ön plana göre geride kalır.
   * - rotateX: alt kenar sabit, üst kısım geriye yatar;
   *   scroll ilerledikçe eğim artar → üst uç içeri gömülür.
   * - mask: üst kısım uzaklıkta sise karışır.
   */
  .rm-river-layer {
    transform-origin: 50% 100%;
    transform:
      perspective(1600px)
      translateY(calc((var(--rm-p, .5) - .5) * var(--rm-river)))
      rotateX(calc(var(--rm-tilt-min) + var(--rm-p, .5) * var(--rm-tilt-range)));
    will-change: transform;

    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(0, 0, 0, .35) calc(var(--rm-fade) * .4),
      #000 var(--rm-fade)
    );
    mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(0, 0, 0, .35) calc(var(--rm-fade) * .4),
      #000 var(--rm-fade)
    );
  }

  /*
   * ÖN KATMAN: NODE'LAR + PANEL
   *
   * Nehirle ters yönde hafif kayar,
   * iki katman arası derinlik farkı büyür.
   */
  .rm-front-layer {
    transform: translateY(calc((var(--rm-p, .5) - .5) * var(--rm-front) * -1));
    will-change: transform;
  }

  @media (prefers-reduced-motion: reduce) {
    .rm-flow,
    .rm-pulse {
      animation: none;
    }

    .rm-river-layer,
    .rm-front-layer {
      transform: none;
    }

    .rm-panel.is-on {
      animation: none;
    }
  }
`;

const AVATAR_CSS = `
  /* oturup kayarken suda hafif sallanma */
  @keyframes rmAvBob {
    0%, 100% { transform: translateY(0) rotate(-2deg); }
    50%      { transform: translateY(-3px) rotate(2deg); }
  }
  /* altından açılan su halkaları */
  @keyframes rmAvWake {
    0%   { transform: translateX(-50%) scale(.4); opacity: .8; }
    100% { transform: translateX(-50%) scale(1.6); opacity: 0; }
  }
  @keyframes rmAvTrail {
    0%   { transform: scaleX(.55); opacity: .5; }
    100% { transform: scaleX(1);   opacity: 1; }
  }
  @keyframes rmAvSpark {
    0%   { transform: translate(0, 0) scale(1); opacity: 0; }
    15%  { opacity: 1; }
    100% { transform: translate(var(--dx), var(--dy)) scale(.3); opacity: 0; }
  }
  @keyframes rmAvRing {
    0%   { transform: translate(-50%, -50%) scale(.3); opacity: .9; }
    100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
  }
`;

/* ================================================================
   COMPONENT
================================================================ */

type Orb = { id: number; x: number; y: number; tx: number; ty: number };

export default function RoadmapSection({
  active = false,
  onComplete,
  finished = false,
}: RoadmapSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const avatarRef = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  const [size, setSize] = useState({ w: 0, h: 0 });

  const [stopIndex, setStopIndex] = useState(finished ? NODES.length : 0);
  const [avatarIndex, setAvatarIndex] = useState(0);

  /* Avatar: en son vardığı durak (-1 = henüz başlamadı), hareket ediyor mu,
     hangi yöne bakıyor */
  const [arrived, setArrived] = useState(finished ? NODES.length : -1);
  const [moving, setMoving] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);

  /* Alınan yetenek kartı altın bir ışık topuna dönüşüp sol taraftaki
     yetenekler panelinin yerine uçar (panel sonunda bunlarla yanar) */
  const [orbs, setOrbs] = useState<Orb[]>([]);

  /* Bütün yetenekler toplandıktan sonra nehrin çıkışına gidiyoruz. */
  const [leaving, setLeaving] = useState(finished);

  /* Yetenek, kişi o durağa VARINCA alınmış sayılır */
  const allCollected = arrived >= NODES.length;

  /* Yetenekler paneli: kişi SON yeteneği de aldıktan sonra yanar. */
  const panelArmed = active && allCollected && !finished;
  const [panelDelayDone, setPanelDelayDone] = useState(false);
  const panelOn = finished || (panelArmed && panelDelayDone);

  if (!panelArmed && panelDelayDone) {
    setPanelDelayDone(false);
  }

  /* ==============================================================
     RESET
     active/finished ikisi de false olunca her şey başa döner.
     (render sırasında state ayarlama: effect içinde setState yok)
  ============================================================== */

  const mode = active ? 2 : finished ? 1 : 0;
  const [prevMode, setPrevMode] = useState(mode);

  if (prevMode !== mode) {
    setPrevMode(mode);

    if (mode === 0) {
      setStopIndex(0);
      setAvatarIndex(0);
      setLeaving(false);
      setArrived(-1);
      setMoving(false);
      setOrbs([]);
      setFacingLeft(false);
    }
  }

  /* Ref'ler render dışında sıfırlanır */
  useEffect(() => {
    if (active || finished) return;

    avatarRef.current = 0;
    completedRef.current = false;
  }, [active, finished]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  /* ==============================================================
     DİKEY EKRAN (telefon / dikey tablet): nehir YİNE SOLDAN SAĞA
     akar; ekran yüksekliğine göre ölçeklenir ve "kamera" avatarı
     takip ederek nehir boyunca sağa kayar.
  ============================================================== */

  const portrait = size.w > 0 && size.w < 900 && size.h > size.w * 1.15;

  /* telefon (dikey ya da yatay): yetenek paneli mobil hâliyle */
  const compactPanel = size.w > 0 && (size.w < 640 || size.h < 560);

  /* ==============================================================
     YETENEK IŞIK TOPLARI
     Karttan panele uçan top; ölçüm bir sonraki karede yapılır.
  ============================================================== */

  useEffect(() => {
    if (!active || arrived < 1 || arrived > NODES.length) return;

    let timer = 0;

    const frame = requestAnimationFrame(() => {
      const card = cardRefs.current[arrived - 1];
      const box = containerRef.current;
      if (!card || !box) return;

      const r = card.getBoundingClientRect();
      const b = box.getBoundingClientRect();

      const orb: Orb = {
        id: arrived,
        x: r.left + r.width / 2 - b.left,
        y: r.top + r.height / 2 - b.top,
        /* panelin kategori sütunu civarı */
        tx: b.width * 0.02 + 140,
        ty: b.height * (0.3 + arrived * 0.1),
      };

      setOrbs((o) => [...o.filter((x) => x.id !== orb.id), orb]);

      timer = window.setTimeout(
        () => setOrbs((o) => o.filter((x) => x.id !== orb.id)),
        ORB_MS + 150,
      );
    });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [active, arrived]);

  /* ==============================================================
     PANEL GECİKMESİ
  ============================================================== */

  useEffect(() => {
    if (!panelArmed) return;

    const timer = window.setTimeout(
      () => setPanelDelayDone(true),
      PANEL_ON_DELAY,
    );

    return () => window.clearTimeout(timer);
  }, [panelArmed]);

  /* ==============================================================
     RESPONSIVE
     ResizeObserver, gözlemlemeye başlayınca ilk ölçümü de verir.
  ============================================================== */

  useEffect(() => {
    const element = containerRef.current;

    if (!element) return;

    const observer = new ResizeObserver(() => {
      const w = element.clientWidth;
      const h = element.clientHeight;

      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  /* ==============================================================
     SCROLL DERİNLİK

     Scroll ilerlemesini React state yerine doğrudan
     --rm-p CSS değişkenine yazıyoruz. Böylece her scroll
     karesinde component yeniden render edilmiyor.

     --rm-p = 0 → section alttan ekrana giriyor
     --rm-p = 1 → section üstten ekrandan çıkıyor
  ============================================================== */

  useEffect(() => {
    const element = containerRef.current;

    if (!element) return;

    const scroller = getScrollParent(element);

    let frame = 0;

    const update = () => {
      const rect = element.getBoundingClientRect();

      const viewTop =
        scroller instanceof Window ? 0 : scroller.getBoundingClientRect().top;

      const viewHeight =
        scroller instanceof Window ? window.innerHeight : scroller.clientHeight;

      const progress =
        (viewHeight - (rect.top - viewTop)) / (viewHeight + rect.height);

      element.style.setProperty(
        "--rm-p",
        Math.min(1, Math.max(0, progress)).toFixed(4),
      );
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();

    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* ==============================================================
     NODE İLERLEMESİ
  ============================================================== */

  useEffect(() => {
    if (!active) return;

    /* Kişi bulunduğu durağa varmadan bir sonrakine geçme */
    if (arrived !== stopIndex) return;

    /*
     * Önce bütün yetenekleri sırayla topluyoruz:
     * durağa var → eğilip al (PICKUP_MS) → sonrakine geç
     */
    if (stopIndex < NODES.length) {
      const timer = window.setTimeout(
        () => setStopIndex((value) => value + 1),
        stopIndex === 0 ? 60 : PICKUP_MS,
      );

      return () => window.clearTimeout(timer);
    }

    /* Son yetenek alındı → nehrin sonuna doğru ilerle ve çık. */
    if (!leaving) {
      const timer = window.setTimeout(() => setLeaving(true), PICKUP_MS);

      return () => window.clearTimeout(timer);
    }
  }, [active, stopIndex, leaving, arrived]);

  /* ==============================================================
     IŞIK / KİŞİ HAREKETİ
  ============================================================== */

  useEffect(() => {
    if (!active) return;

    const stops = [0, ...GEO.nodeIndexes];

    const from = avatarRef.current;

    /* Normal: node'lara git. leaving: nehrin en sonuna git. */
    const to = leaving
      ? GEO.middle.length - 1
      : stops[Math.min(stopIndex, stops.length - 1)];

    /* Aynı noktadaysak yeni animasyon başlatmıyoruz. */
    if (Math.abs(from - to) < 0.001) {
      if (leaving) return;

      const frame = requestAnimationFrame(() => setArrived(stopIndex));

      return () => cancelAnimationFrame(frame);
    }

    /* Süre yola göre: sabit adımla ilerlesin (kayıyormuş gibi olmasın) */
    const sc = computeScale(size.w, size.h, portrait) || 1;

    let pathLen = 0;
    const lo = Math.floor(Math.min(from, to));
    const hi = Math.ceil(Math.max(from, to));

    for (let i = lo; i < hi && i + 1 < GEO.middle.length; i++) {
      pathLen += Math.hypot(
        GEO.middle[i + 1].x - GEO.middle[i].x,
        GEO.middle[i + 1].y - GEO.middle[i].y,
      );
    }

    pathLen *= sc;

    const start = performance.now();

    /* telefonda nehir küçük ölçekte: yürüyüş biraz yavaş, kamera rahat izlesin */
    const duration =
      Math.max(180, (pathLen / WALK_SPEED) * 1000) * (portrait ? 1.6 : 1);

    let lastLeft: boolean | null = null;
    let started = false;
    let frame = 0;

    const animate = (now: number) => {
      if (!started) {
        started = true;
        setMoving(true);
      }

      const progress = Math.min(1, (now - start) / duration);

      /* Sabit hız; sadece ilk/son %8'de yumuşak kalkış-duruş */
      const k = 0.08;
      const ease =
        progress < k
          ? (progress * progress) / (2 * k * (1 - k))
          : progress > 1 - k
            ? 1 - ((1 - progress) * (1 - progress)) / (2 * k * (1 - k))
            : (progress - k / 2) / (1 - k);

      const current = from + (to - from) * ease;

      /* Yön: nehir sola kıvrılınca kişi de sola döner */
      const a = pointAt(GEO.middle, current);
      const b = pointAt(GEO.middle, current + (to > from ? 0.6 : -0.6));

      if (Math.abs(b.x - a.x) > 0.4) {
        const left = b.x < a.x;

        if (left !== lastLeft) {
          lastLeft = left;
          setFacingLeft(left);
        }
      }

      avatarRef.current = current;
      setAvatarIndex(current);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
        return;
      }

      setMoving(false);

      if (!leaving) setArrived(stopIndex);

      /* Nehrin çıkışına ulaştık. */
      if (leaving && !completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current?.();
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [active, stopIndex, leaving, portrait, size.w, size.h]);

  /* ==============================================================
     KAMERA
  ============================================================== */

  const scale = computeScale(size.w, size.h, portrait);

  /* kamera: avatar ekranın ~%38'inde dursun; sona gelince nehrin ucu
     tam SAĞ ALT köşeden çıkacak şekilde durur */
  let panX = (size.w - W * scale) / 2;

  if (portrait) {
    const ax = pointAt(GEO.middle, avatarIndex).x * scale;
    const want = size.w * 0.38 - ax;
    const minPan = size.w - RIVER_END.x * scale + 24; // uç sağ kenarın biraz dışında

    panX = Math.min(0, Math.max(minPan, want));
  }

  /* nehrin ucu alt kenarın biraz dışında → sağ alt köşeden çıkar */
  const panY = portrait
    ? size.h - RIVER_END.y * scale + 24
    : (size.h - H * scale) / 2;

  const toPx = (pt: Pt) => ({
    left: panX + pt.x * scale,
    top: panY + pt.y * scale,
  });

  const nodePositions = NODES.map((_, i) =>
    toPx(GEO.middle[GEO.nodeIndexes[i]]),
  );

  return (
    <div
      ref={containerRef}
      className="relative size-full overflow-hidden rounded-2xl select-none"
      style={ROOT_VARS}
    >
      <style>{ROADMAP_CSS}</style>

      {/* ======================================================
          EN ARKA: BACKGROUND + CAM PANEL

          Bu katman sabit durur. Nehir bunun önünde
          ama ön plan kartlarının arkasında kalır.
      ====================================================== */}

      <SciFiBackground>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <defs>
            <filter
              id="rm-bg-soft"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          {/* CAM PANEL */}

          <rect
            x="68"
            y="55"
            width="2440"
            height="995"
            rx="28"
            fill={C.ice}
            fillOpacity=".015"
            stroke={C.edge}
            strokeOpacity=".16"
            strokeWidth="2"
          />

          <rect
            x="74"
            y="61"
            width="2428"
            height="983"
            rx="24"
            fill="none"
            stroke={C.ice}
            strokeOpacity=".05"
          />

          <polygon
            points="70,58 740,58 900,1048 70,1048"
            fill="#ffffff"
            opacity=".022"
          />

          {/* ARKA PLAN IŞIĞI */}

          <rect
            x="1510"
            y="238"
            width={W - 1510}
            height="40"
            rx="20"
            fill={C.edge}
            opacity=".07"
            filter="url(#rm-bg-soft)"
          />
        </svg>
      </SciFiBackground>

      {/* ======================================================
          ORTA KATMAN: NEHİR + CHIP + IŞIK

          Scroll ile ayrı hareket eden katman.
          Işık da bu katmanın içinde olduğu için
          eğim ne olursa olsun suyun üstünde kalır.
      ====================================================== */}

      <div className="rm-river-layer pointer-events-none absolute inset-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute"
          style={{
            /* nehir, node'larla aynı kamerada: toPx ile birebir hizalı */
            left: panX,
            top: panY,
            width: W * scale,
            height: H * scale,
          }}
        >
          <defs>
            {/* WATER */}

            <linearGradient
              id="rm-water"
              gradientUnits="userSpaceOnUse"
              x1="150"
              y1="0"
              x2={W}
              y2={H}
            >
              <stop offset="0" stopColor="#061f3a" />
              <stop offset=".22" stopColor="#0a2c52" />
              <stop offset=".46" stopColor="#0e3b6b" />
              <stop offset=".66" stopColor="#0b3058" />
              <stop offset=".84" stopColor="#072444" />
              <stop offset="1" stopColor="#04162e" />
            </linearGradient>

            {/* CORE */}

            <linearGradient
              id="rm-core"
              gradientUnits="userSpaceOnUse"
              x1="150"
              y1="0"
              x2={W}
              y2={H}
            >
              <stop offset="0" stopColor={C.steel} stopOpacity=".08" />
              <stop offset=".38" stopColor={C.edge} stopOpacity=".2" />
              <stop offset=".55" stopColor={C.ice} stopOpacity=".26" />
              <stop offset=".74" stopColor={C.steel} stopOpacity=".12" />
              <stop offset="1" stopColor="#0f2f58" stopOpacity=".03" />
            </linearGradient>

            {/* DEPTH */}

            <linearGradient id="rm-depth" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0a2240" />
              <stop offset=".55" stopColor="#081c36" />
              <stop offset="1" stopColor="#051328" />
            </linearGradient>

            {/* BINARY FADE */}

            <linearGradient id="rm-fade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset=".2" stopColor="white" stopOpacity=".8" />
              <stop offset=".85" stopColor="white" stopOpacity=".9" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>

            <mask id="rm-mask" maskUnits="userSpaceOnUse">
              <rect width={W} height={H} fill="url(#rm-fade)" />
            </mask>

            {/* RIVER CLIP */}

            <clipPath id="rm-clip">
              <path d={GEO.river} />
            </clipPath>

            {/* WATER WAVE */}

            <filter id="rm-wave" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.002 0.009"
                numOctaves="1"
                seed="4"
              />
              <feDisplacementMap in="SourceGraphic" scale="12" />
            </filter>

            {/* GLOW */}

            <filter id="rm-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="rm-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          {/* DERE TABANI */}

          <path d={GEO.river} fill="url(#rm-depth)" />

          {/* SU */}

          <g clipPath="url(#rm-clip)">
            <path d={GEO.surface} fill="url(#rm-water)" />

            {/* KOYU DERİNLİK BANTLARI */}

            {DARK_BANDS.map((ratio) => (
              <path
                key={ratio}
                d={GEO.lane(ratio)}
                fill="none"
                stroke="#04142b"
                strokeWidth="34"
                opacity=".28"
                filter="url(#rm-soft)"
              />
            ))}

            {/* İÇ CAM */}

            <path d={GEO.core} fill="url(#rm-core)" opacity=".75" />

            {/* AKIŞ ÇİZGİLERİ

                PERFORMANS: akan çizgiler hareketli olduğu için üzerlerinde
                SVG filtresi (bulanıklık / dalga) YOK — filtre her karede
                yeniden hesaplanıp ekranı yavaşlatıyordu. Parlaklık, çizgi
                kalınlığı ve opaklığıyla veriliyor. */}

            {/* SOFT STREAMS */}

            {SOFT_STREAMS.map((ratio, i) => (
              <path
                key={ratio}
                d={GEO.lane(ratio)}
                fill="none"
                stroke={C.edge}
                strokeWidth="5"
                strokeOpacity=".25"
                strokeDasharray={`${320 + i * 100} ${280 + i * 70}`}
                strokeLinecap="round"
                className="rm-flow"
                style={flowVars(`${7 + i}s`)}
              />
            ))}

            {/* FINE STREAMS */}

            <g mask="url(#rm-mask)">
              {FINE_STREAMS.map((stream, i) => (
                <path
                  key={`${stream.f}-${i}`}
                  d={GEO.lane(stream.f)}
                  fill="none"
                  stroke={C.iceSoft}
                  strokeWidth={stream.width}
                  strokeOpacity={stream.opacity}
                  strokeDasharray={stream.dash}
                  strokeLinecap="round"
                  className="rm-flow"
                  style={flowVars(`${stream.duration}s`)}
                />
              ))}
            </g>

            {/* HIGHLIGHTS */}

            {HIGHLIGHTS.map((ratio, i) => (
              <path
                key={ratio}
                d={GEO.lane(ratio)}
                fill="none"
                stroke={C.ice}
                strokeWidth="1.2"
                strokeOpacity=".62"
                strokeDasharray={`${500 + i * 150} ${380 + i * 100}`}
                strokeLinecap="round"
                className="rm-flow"
                style={flowVars(`${6 + i}s`)}
              />
            ))}

            {/* MAIN STREAMS */}

            {STREAMS.map((stream, i) => (
              <path
                key={`${stream.f}-${i}`}
                d={GEO.lane(stream.f)}
                fill="none"
                stroke={i % 3 === 0 ? C.edge : C.steel}
                strokeWidth={stream.width}
                strokeOpacity={stream.opacity}
                strokeDasharray={stream.dash}
                strokeLinecap="round"
                className="rm-flow"
                style={flowVars(`${stream.duration}s`)}
              />
            ))}

            {/* BINARY */}

            {BINARY_LANES.map(
              ([ratio, fontSize, spacing, opacity, offset], i) => (
                <g key={ratio}>
                  <path id={`rm-lane-${i}`} d={GEO.lane(ratio)} fill="none" />

                  <text
                    fontFamily={MONO}
                    fontSize={fontSize}
                    letterSpacing={spacing}
                    fill={C.ice}
                    opacity={opacity}
                  >
                    <textPath href={`#rm-lane-${i}`} startOffset={offset}>
                      {BINARY[i]}
                    </textPath>
                  </text>
                </g>
              ),
            )}

            {/* BÜYÜK BINARY */}

            {GEO.digits.map((digit, i) => (
              <text
                key={i}
                x={digit.x}
                y={digit.y}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={digit.fontSize}
                fill={C.ice}
                opacity=".68"
              >
                {digit.char}
              </text>
            ))}
          </g>

          {/* DERE KENARLARI */}

          <path
            d={GEO.top}
            fill="none"
            stroke={C.steel}
            strokeWidth="1"
            opacity=".35"
          />

          <path
            d={GEO.bottom}
            fill="none"
            stroke={C.steelDim}
            strokeWidth="1"
            opacity=".3"
          />

          {/* CHIP */}

          <g className="rm-pulse">
            <polygon
              points="1005,780 1065,812 1005,845 945,812"
              fill={C.gold}
              opacity=".3"
              filter="url(#rm-soft)"
            />

            <polygon
              points="1005,784 1060,812 1005,840 950,812"
              fill="#0a2446"
              stroke={C.edge}
              strokeWidth="1.5"
            />

            <polygon
              points="1005,796 1036,812 1005,828 974,812"
              fill={C.gold}
              opacity=".55"
            />

            <path
              d="M1062 830 L1110 830 L1135 818 L1185 818"
              fill="none"
              stroke={C.gold}
              strokeWidth="1"
              opacity=".6"
            />

            {CHIP_DOTS.map(([x, y]) => (
              <circle
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                r="2"
                fill={C.goldLight}
                opacity=".7"
              />
            ))}

            <text
              x="1003"
              y="772"
              textAnchor="middle"
              fontFamily={MONO}
              fontSize="16"
              fill={C.goldLight}
            >
              1 0 1
            </text>
          </g>
        </svg>

        {/* ====================================================
            NEHİRDEKİ KİŞİ / IŞIK

            Node'ları topladıktan sonra aynı nehir üzerinde
            devam ederek ekranın sağ-alt çıkışına gidiyor.
        ==================================================== */}

        {size.w > 0 &&
          arrived >= 0 &&
          !finished &&
          !((compactPanel || portrait) && panelOn) && (
            <WalkingAvatar
              pos={toPx(pointAt(GEO.middle, avatarIndex))}
              moving={moving}
              facingLeft={facingLeft}
              collecting={
                !moving &&
                !leaving &&
                arrived === stopIndex &&
                stopIndex >= 1 &&
                stopIndex <= NODES.length
              }
              pickKey={arrived}
            />
          )}
      </div>

      {/* ========================================================
          ÖN KATMAN: SKILLS PANEL + ROADMAP NODE'LARI
      ======================================================== */}

      <div className="rm-front-layer pointer-events-none absolute inset-0 z-10">
        {/* Panelin arkasında hafif karartma: yoğun nehir üzerinde
            yazılar okunabilsin diye (çerçevesiz, sağa doğru söner) */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 transition-opacity duration-700"
          style={{
            width: "min(58%, 900px)",
            opacity: panelOn ? 1 : 0,
            background:
              "linear-gradient(to right, rgba(3,11,26,.88) 0%, rgba(3,11,26,.78) 55%, rgba(3,11,26,0) 100%)",
          }}
        />

        {/* Yetenekler paneli — tüm yetenekler toplanınca yanar */}
        <div
          className={`rm-panel ${compactPanel ? "rm-panel--compact" : ""} ${panelOn ? "is-on" : ""}`}
          aria-hidden={!panelOn}
        >
          <CollectedSkillsPanel
            height={
              compactPanel
                ? Math.round(size.h * (portrait ? 0.88 : 0.9))
                : Math.min(Math.max(size.h * 0.86, 560), 820)
            }
            compact={compactPanel}
          />
        </div>

        {size.w > 0 &&
          NODES.map((node, i) => {
            const pos = nodePositions[i];
            const collected = arrived >= node.number;

            /* Panel yanınca, panelin altında kalan node'lar söner */
            const underPanel =
              panelOn &&
              (compactPanel ||
                cardLeft(pos.left, node.side, node.gap) < PANEL_AREA(size.w));

            return (
              <div
                key={node.number}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="pointer-events-auto absolute z-10 w-max"
                style={{
                  left: pos.left,
                  top: pos.top,
                  transform: sideTransform(
                    node.side,
                    portrait ? Math.round(node.gap * 0.5) : node.gap,
                    pos.left,
                    size.w,
                  ),
                  opacity: underPanel ? 0 : 1,
                  /* görünmez (panelin altında kalmış ya da toplanmış) node'lar
                     tıklamayı engellemesin: altındaki yetenek etiketleri seçilebilsin */
                  pointerEvents: collected || underPanel ? "none" : "auto",
                  transition: "opacity 600ms ease",
                }}
              >
                {/* Yetenek alınınca: kısa bir an altın yanar, sonra
                    küçülüp bulanıklaşarak ekrandan silinir */}
                <div
                  className="hover:scale-105"
                  style={{
                    opacity: collected ? 0 : 1,
                    transform: collected
                      ? "scale(.3) translateY(18px)"
                      : "scale(1)",
                    filter: collected ? "blur(6px) brightness(1.8)" : "none",
                    pointerEvents: collected ? "none" : undefined,
                    transition: collected
                      ? "opacity 260ms ease-in 120ms, transform 260ms cubic-bezier(.5,0,.8,.4) 120ms, filter 260ms ease-in 120ms"
                      : "transform 300ms",
                  }}
                >
                  <RoadmapNode
                    nodeNumber={node.number}
                    icon={node.icon}
                    title={node.title}
                    tags={node.tags}
                    collected={collected}
                    compact={portrait}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {/* ======================================================
          YETENEK IŞIK TOPLARI — karttan panele uçuş
      ====================================================== */}
      {orbs.map((o) => {
        const orbVars: CSSVars = {
          left: o.x,
          top: o.y,
          "--tx": `${o.tx - o.x}px`,
          "--ty": `${o.ty - o.y}px`,
          animation: `rmOrbX ${ORB_MS}ms cubic-bezier(.55,0,.35,1) both`,
        };

        return (
          <span
            key={o.id}
            className="pointer-events-none absolute z-30"
            style={orbVars}
          >
            <span
              className="absolute block size-4 rounded-full"
              style={{
                marginLeft: -8,
                marginTop: -8,
                background: `radial-gradient(circle, #fff 0%, ${C.goldLight} 35%, ${C.gold} 65%, transparent 72%)`,
                boxShadow: `0 0 14px ${C.goldLight}, 0 0 30px rgba(${C.goldRGB},.8), 0 0 60px rgba(${C.goldRGB},.35)`,
                animation: `rmOrbY ${ORB_MS}ms cubic-bezier(.2,.6,.4,1) both`,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}

/* ================================================================
   NEHİRDE KAYAN KİŞİ
   - Hareket ederken: oturur pozla kayar, gidiş yönüne bakar
   - Durakta: altın halka + yükselen kıvılcımlar
================================================================ */

function WalkingAvatar({
  pos,
  moving,
  facingLeft,
  collecting,
  pickKey,
}: {
  pos: { left: number; top: number };
  moving: boolean;
  facingLeft: boolean;
  collecting: boolean;
  pickKey: number;
}) {
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: pos.left,
        top: pos.top,
        width: AV_W,
        height: AV_H,
        /* ayaklar nehrin orta çizgisinde */
        transform: "translate(-50%, -96%)",
      }}
      aria-hidden
    >
      <style>{AVATAR_CSS}</style>

      {/* Altındaki ışıklı su lekesi + açılan halkalar */}
      <div
        className="absolute left-1/2 rounded-full"
        style={{
          bottom: -4,
          width: AV_W * 1.3,
          height: 8,
          transform: "translateX(-50%)",
          background: `radial-gradient(closest-side, rgba(${C.edgeRGB},.55), rgba(${C.edgeRGB},.15) 60%, transparent)`,
        }}
      />
      {[0, 1].map((k) => (
        <span
          key={k}
          className="absolute left-1/2 rounded-[50%]"
          style={{
            bottom: -6,
            width: AV_W * 1.2,
            height: 12,
            border: `1.5px solid rgba(${C.edgeRGB},.8)`,
            animation: `rmAvWake 700ms ease-out ${k * 350}ms infinite`,
            opacity: 0,
          }}
        />
      ))}

      <div
        className="absolute inset-0"
        style={{
          transform: facingLeft ? "scaleX(-1)" : "none",
          transition: "transform 220ms",
        }}
      >
        {/* Hız izi: kayarken arkasında buz mavisi ışık çizgileri */}
        <div
          className="absolute"
          style={{
            right: AV_W * 0.55,
            top: AV_H * 0.3,
            width: 60,
            height: AV_H * 0.6,
            opacity: moving ? 1 : 0,
            transition: "opacity 150ms",
          }}
        >
          {TRAIL_LINES.map(([y, len, op, d], i) => (
            <span
              key={i}
              className="absolute right-0 rounded-full"
              style={{
                top: `${y * 100}%`,
                width: len,
                height: 2,
                background: `linear-gradient(90deg, transparent, rgba(${C.edgeRGB},${op}) 70%, rgba(255,255,255,${op}))`,
                boxShadow: `0 0 6px rgba(${C.edgeRGB},${op * 0.8})`,
                transformOrigin: "100% 50%",
                animation: `rmAvTrail ${d}ms ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>

        {/* Oturmuş kişi (fotoğraf): eller ve dizler suyun üstünde */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SIT_SRC}
          alt=""
          draggable={false}
          className="absolute left-0 max-w-none"
          style={{
            width: AV_W,
            height: AV_H,
            top: AV_H * (1 - SIT_LEDGE),
            transformOrigin: `50% ${SIT_LEDGE * 100}%`,
            animation: "rmAvBob .9s ease-in-out infinite",
          }}
        />
      </div>

      {/* Yetenek alınınca: altın halka + yükselen kıvılcımlar */}
      {collecting && (
        <div
          key={`p${pickKey}`}
          className="absolute left-1/2"
          style={{ top: AV_H - 6 }}
        >
          <span
            className="absolute rounded-full"
            style={{
              width: 46,
              height: 46,
              border: `2px solid ${C.goldLight}`,
              boxShadow: `0 0 12px rgba(${C.goldRGB},.9)`,
              animation: "rmAvRing .4s ease-out both",
            }}
          />
          {PICK_SPARKS.map(([dx, dy], i) => {
            const sparkStyle: CSSVars = {
              background: C.goldLight,
              boxShadow: `0 0 6px rgba(${C.goldRGB},1)`,
              "--dx": `${dx}px`,
              "--dy": `${dy}px`,
              animation: `rmAvSpark ${360 + (i % 3) * 80}ms ease-out ${40 + i * 18}ms both`,
            };

            return (
              <span
                key={i}
                className="absolute size-1 rounded-full"
                style={sparkStyle}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
