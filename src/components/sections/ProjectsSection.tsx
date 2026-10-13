"use client";

import { SparkleStroke } from "@/components/ui/Sparkle";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import SciFiBackground from "@/components/ui/ScifiBackground";
import { useViewport } from "@/components/ui/ChipLayout";

/** CSS özel değişkenleri (--d gibi) için tip */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/* Aktif proje / seçim vurgusu: çip çizgileri ve aktif menüyle aynı altın */
const GOLD_LIGHT = "#ffe4aa";

export type Project = {
  id: number;
  title: string;
  images: string[];
};

type Props = {
  active?: boolean;
  /** true: fan/ekran kartı oluşmuş, avatar oturmuş BİTMİŞ hal (animasyonsuz) */
  finished?: boolean;
  progress?: number;
  /** fan oluşup avatar göbeğe oturunca bir kez çağrılır */
  onComplete?: () => void;
  /** true: göbekteki avatar gizlenir (footer'a zıplayıp gitti) */
  riderHidden?: boolean;
};

type FanProps = {
  projects: Project[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onLand?: (index: number) => void;
  onReady?: (index: number) => void;
  play: boolean;
  /** animasyonu atla, doğrudan son kareyi göster */
  finished?: boolean;
  riderHidden?: boolean;
  /** dikey ekranda fan 90° döner: ekranın ALTINDAN yükselir (ekran kartı fanı gibi) */
  upright?: boolean;
  /** sol çerçevenin incelme miktarı (viewBox birimi) */
  cover?: number;
  /** orta göbeğin ölçeği (≤1) */
  hubK?: number;
  /** fanın kart içindeki küçülmesi (≥1) */
  tall?: number;
};

export const PROJECTS: Project[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  title: `Proje ${i + 1}`,
  // 1. görsel büyük panelde, 2. ve 3. görsel küçük panellerde
  images: [
    `https://picsum.photos/seed/proje${i + 1}/1200/800`,
    `https://picsum.photos/seed/proje${i + 1}-b/700/500`,
    `https://picsum.photos/seed/proje${i + 1}-c/700/500`,
  ],
}));

const CX = 600;
const CY = 600;

const INNER_R = 140; // yaprakların göbek altından başladığı yer
const OUTER_R = 655;
const HUB_R = 205; // orta göbek yarıçapı
const METAL_R = Math.round(HUB_R * 0.85);
const CUT_R = OUTER_R + 30;
const TWIST = 16;
const FACE_ANGLE = 180 + TWIST / 2;

// Ekran kartı gövdesi (kordon yok, üst/alt kenar ekran kenarı)
const SHROUD_LEFT = -190;
const CARD_HALF = CUT_R + 42; // ince çerçeve
const SHROUD_TOP = CY - CARD_HALF;
const SHROUD_BOTTOM = CY + CARD_HALF;
const CHAMFER_X = 210;
const CHAMFER_Y = 455;

// Görünür alan: kart üstten alta tam, sağda göbek tamamen içeride.
// VIEW_PAD_Y: kartın üst/alt kenar çizgisi ekranda görünsün diye bırakılan pay
// (0 yaparsan kenar tam ekran sınırına oturur, büyütürsen kart küçülür)
const VIEW_PAD_Y = 22;
const VIEW_LEFT = SHROUD_LEFT - 30;
// Sağ kenar: orta göbeğin (koyu dış halkası dahil) bittiği yer
const VIEW_RIGHT = CX + HUB_R + 8;
const VIEW_W = VIEW_RIGHT - VIEW_LEFT;
const VIEW_H = SHROUD_BOTTOM - SHROUD_TOP + VIEW_PAD_Y * 2;

// KÖŞE YUVARLAKLIĞI (viewBox birimi; ~1554 birim = sahne yüksekliği,
// yani 900px yüksek ekranda 1 birim ≈ 0.58px)
// Sağ üst ve sağ alt köşe (arka plan kartının köşesiyle aynı olsun diye)
const CORNER_R_RIGHT = 40;
// Sol taraftaki pah (eğik kenar) köşeleri: üstte/altta ve sol kenarda
const CORNER_R_CHAMFER = 40;

// Arka plan kartı ekranın sağ kenarından içeride bitiyorsa aradaki boşluk (px)
const STAGE_INSET_RIGHT = 21;

// Üstte sabit bir navbar varsa yüksekliğini buraya yaz (px)
const STAGE_INSET_TOP = 0;
const STAGE_INSET_BOTTOM = 0;

// Sahne yüksekliği: section yüksekliği ama asla görünür ekran yüksekliğinden
// fazla değil (svh = mobilde adres çubuğu açıkken bile görünen en küçük alan)
const STAGE_INSETS = STAGE_INSET_TOP + STAGE_INSET_BOTTOM;
const STAGE_H = `min(calc(100% - ${STAGE_INSETS}px), calc(100svh - ${STAGE_INSETS}px))`;

// Tüm animasyon hızı: küçüldükçe hızlanır (1 = orijinal)
const SPEED = 0.6; // nehir + avatar + fan oluşumu (küçük = hızlı)
const ms = (v: number) => v * SPEED;

const STREAM_START = 0;
const STREAM_DUR = ms(2200);
const HUB_START = ms(1100);
const HUB_DUR = ms(950);
const BLADE_START = ms(1950);
const BLADE_STAGGER = ms(150);
const BLADE_DUR = ms(700);
const BODY_START = ms(4050);
const BODY_DUR = ms(1100);
const MATERIAL_START = ms(5050);
const MATERIAL_DUR = ms(1250);
const PHOTO_STAGGER = ms(120);
const PHOTO_DUR = ms(650);

// Fan dönmez: oluşunca yalnızca bir yaprak kadar kayar
const STEP_DELAY = ms(250);
const STEP_DUR = 550;

// Kişi: akımın başında gelir, göbeğe oturur ve büyür
/* Kişinin yolculuğu: akıntıda kayma → girdapta sarmal → göbeğe oturma */
const RIDE_END = 0.86; // akımın neresine kadar kayar (göbeğin kenarı)
/* nehrin ucu (easeInOutCubic) %86'ya bu oranda varır → kişi suyun ucunda kalır */
const RIDE_TRAVEL = STREAM_DUR * 0.673;
const SPIRAL_DUR = ms(1500);
const AVATAR_R = 170;
// Kişi göbeğe oturduğunda göbeğin içinde kalacak boyut
const PERSON_FINAL_SCALE = (HUB_R - 40) / AVATAR_R;

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const phase = (t: number, start: number, duration: number) =>
  clamp((t - start) / duration);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const bump = (t: number) => Math.sin(Math.PI * clamp(t));

/** İki açı arasındaki en kısa fark (-180…180) */
const shortestDelta = (from: number, to: number) =>
  ((((to - from) % 360) + 540) % 360) - 180;

function polar(radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

// Yaprağın doldurduğu açı oranı: 1'e yaklaştıkça yapraklar genişler,
// aralarındaki boşluk incelir (0.95 = her yaprak açısının %95'i dolu)
const BLADE_FILL = 0.95;

function createBladePath(count: number) {
  const step = 360 / count;
  // İç ve dış kenar aynı açıyla açılır; iki kenar aynı eğriyi izlediği için
  // komşu yapraklar arasındaki boşluk baştan sona eşit ve ince kalır
  const half = (step * BLADE_FILL) / 2;

  const a = polar(INNER_R, -half);
  const b = polar(OUTER_R, -half - TWIST);
  const c = polar(OUTER_R, half - TWIST);
  const d = polar(INNER_R, half);
  const MID_R = (INNER_R + OUTER_R) / 2;
  const c1 = polar(MID_R, -half - TWIST * 0.35);
  const c2 = polar(MID_R, half - TWIST * 0.35);
  const tip = polar(OUTER_R + 18, -TWIST);

  return `
    M ${a.x} ${a.y}
    Q ${c1.x} ${c1.y} ${b.x} ${b.y}
    Q ${tip.x} ${tip.y} ${c.x} ${c.y}
    Q ${c2.x} ${c2.y} ${d.x} ${d.y}
    Q ${CX} ${CY} ${a.x} ${a.y}
    Z
  `;
}

type Pt = [number, number];

// Köşeli bir çizgiyi, her köşesi verilen yarıçapla yuvarlatılmış bir yola çevirir.
// radii[i] = i. noktadaki köşenin yarıçapı (0 = sivri köşe).
function roundedPath(points: Pt[], radii: number[], closed: boolean) {
  const n = points.length;
  const corner = (i: number) => {
    const [x, y] = points[i];
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const r = radii[i] ?? 0;

    const d1 = Math.hypot(prev[0] - x, prev[1] - y);
    const d2 = Math.hypot(next[0] - x, next[1] - y);
    const rr = Math.min(r, d1 / 2, d2 / 2);

    const a: Pt = [
      x + ((prev[0] - x) / d1) * rr,
      y + ((prev[1] - y) / d1) * rr,
    ];
    const b: Pt = [
      x + ((next[0] - x) / d2) * rr,
      y + ((next[1] - y) / d2) * rr,
    ];
    return { a, b, x, y };
  };

  let d = "";

  if (closed) {
    const first = corner(0);
    d += `M ${first.b[0]} ${first.b[1]} `;
    for (let i = 1; i <= n; i++) {
      const c = corner(i % n);
      d += `L ${c.a[0]} ${c.a[1]} Q ${c.x} ${c.y} ${c.b[0]} ${c.b[1]} `;
    }
    return d + "Z";
  }

  d += `M ${points[0][0]} ${points[0][1]} `;
  for (let i = 1; i < n - 1; i++) {
    const c = corner(i);
    d += `L ${c.a[0]} ${c.a[1]} Q ${c.x} ${c.y} ${c.b[0]} ${c.b[1]} `;
  }
  return d + `L ${points[n - 1][0]} ${points[n - 1][1]}`;
}

// Deterministik 0/1 dizisi (SSR ve client aynı sonucu üretir)
function binaryString(seed: number, length: number) {
  let s = seed >>> 0;
  let out = "";

  for (let i = 0; i < length; i++) {
    if (i % 9 === 8) {
      out += " ";
      continue;
    }
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    out += (s >>> 16) & 1 ? "1" : "0";
  }

  return out;
}

const LANE_DY = [-48, -32, -16, 0, 16, 32, 48];

const BINARY_LANES = LANE_DY.map((dy, i) => {
  const edge = Math.abs(dy) / 48;

  return {
    dy,
    bits: binaryString(i * 7919 + 13, 260),
    speed: 0.85 + ((i * 37) % 7) / 20,
    shift: -((i * 53) % 90),
    opacity: 0.95 - edge * 0.55,
    color: edge < 0.4 ? "#e6f0ff" : edge < 0.8 ? "#8cc4f2" : "#3d7fc4",
  };
});

const BLADE_CENTER = polar((INNER_R + OUTER_R) / 2 + 20, -TWIST * 0.6);

/* =========================================================
   NEHİR YOLU
   Bézier parçaları sayı olarak tutulur: hem SVG yolu hem de
   "kişi nehirde nerede?" hesabı aynı veriden (DOM'a bakmadan) üretilir.
========================================================= */
const STREAM_START_POINT = { x: 560, y: -360 };

/** Kübik Bézier parçaları: [c1x, c1y, c2x, c2y, x, y] */
const STREAM_CURVES: [number, number, number, number, number, number][] = [
  [525, -180, 390, -80, 300, 45],
  [205, 175, 95, 300, 112, 465],
  [130, 625, 300, 720, 445, 665],
  [520, 635, 565, 612, 600, 600],
];

const STREAM_CURVES_D = STREAM_CURVES.map((c) => `C ${c.join(" ")}`).join(" ");

/** Akış, görünür alanın üstünden (topY) başlar; gerekirse düz bir çizgiyle uzatılır */
function buildStreamPath(topY: number) {
  const { x, y } = STREAM_START_POINT;
  return topY < y
    ? `M ${x} ${topY} L ${x} ${y} ${STREAM_CURVES_D}`
    : `M ${x} ${y} ${STREAM_CURVES_D}`;
}

type LutPoint = { x: number; y: number; len: number };

/** Yol uzunluğu tablosu: yolun %f noktasındaki koordinatı saf matematikle verir */
function buildStreamLut(topY: number): LutPoint[] {
  const SAMPLES = 80;
  const { x: sx, y: sy } = STREAM_START_POINT;

  const pts: LutPoint[] = [];
  let acc = 0;

  if (topY < sy) {
    pts.push({ x: sx, y: topY, len: 0 });
    acc = sy - topY;
    pts.push({ x: sx, y: sy, len: acc });
  } else {
    pts.push({ x: sx, y: sy, len: 0 });
  }

  let px = sx;
  let py = sy;

  for (const [x1, y1, x2, y2, x3, y3] of STREAM_CURVES) {
    for (let k = 1; k <= SAMPLES; k++) {
      const t = k / SAMPLES;
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
}

function pointOnLut(lut: LutPoint[], frac: number) {
  const target = clamp(frac) * lut[lut.length - 1].len;

  let lo = 0;
  let hi = lut.length - 1;

  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;

    if (lut[mid].len <= target) lo = mid;
    else hi = mid;
  }

  const a = lut[lo];
  const b = lut[hi];
  const f = (target - a.len) / (b.len - a.len || 1);

  return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) };
}

/* Fan halkası boyunca su: veri hattının geçtiği sol noktadan üstten
   ve alttan sağa doğru iki kol */
const RING_UP = `M ${CX - CUT_R} ${CY} A ${CUT_R} ${CUT_R} 0 0 1 ${CX + CUT_R} ${CY}`;
const RING_DOWN = `M ${CX - CUT_R} ${CY} A ${CUT_R} ${CUT_R} 0 0 0 ${CX + CUT_R} ${CY}`;

/* =========================================================
   KART GEOMETRİSİ — "cover" (≥0, viewBox birimi)
   Kart her zaman TAM BOY ve İNCE çerçeveli kalır. Küçük ekranlarda
   kartı daraltmak için kartın sol (pahlı) kenarı sağa kayar ve fanın
   sol kısmının ÜSTÜNDEN geçer: fan kapağın altına girmiş gibi görünür.
   Göbek ve avatar her zaman tamamen görünür. cover = 0 → orijinal.
========================================================= */
/** kapak kenarının fan deliğini örttüğü pay (metal şerit) */
const COVER_LIP = 46;
/** sol çerçeve en fazla bu kadar incelir (yapraklar kısalmaz) */
const COVER_MAX = 62;
/** göbek en fazla bu orana kadar küçülür */
const HUB_MIN = 0.62;

/** en son çare: fanın kart içinde küçülme sınırı */
const TALL_MAX = 1.45;

/** kartı (tam boyda) en fazla maxW px genişliğe sığdırır:
    1) sol çerçeve incelir  2) göbek küçülür  3) fan kartın içinde küçülür */
function fitCard(maxW: number, vh: number) {
  if (!(maxW > 0 && vh > 0)) return { cover: 0, hubK: 1, tall: 1 };
  const unitPx = vh / VIEW_H;
  const shrink = Math.max(0, VIEW_W - maxW / unitPx);
  const cover = Math.min(COVER_MAX, shrink);
  const rest = Math.max(0, shrink - cover);
  const hubK = Math.max(HUB_MIN, 1 - rest / HUB_R);
  const w = VIEW_W - cover - HUB_R * (1 - hubK); // birim
  /* genişlik_px = vh * w / (VIEW_H * tall) ≤ maxW */
  const tall = Math.min(TALL_MAX, Math.max(1, (vh * w) / (VIEW_H * maxW)));
  return { cover, hubK, tall };
}

/* dışbükey çokgeni her kenarından d kadar içeri alır (saat yönü) */
function insetConvex(pts: Pt[], d: number): Pt[] {
  const n = pts.length;
  const lines = pts.map((a, i) => {
    const b = pts[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    /* ekran koordinatında (y aşağı) saat yönü çokgen: iç normal (-dy, dx) */
    return {
      p: [a[0] - (dy / len) * d, a[1] + (dx / len) * d] as Pt,
      v: [dx, dy] as Pt,
    };
  });
  return lines.map((l1, i) => {
    const l0 = lines[(i - 1 + n) % n];
    const cross = l0.v[0] * l1.v[1] - l0.v[1] * l1.v[0];
    if (Math.abs(cross) < 1e-9) return l1.p;
    const t =
      ((l1.p[0] - l0.p[0]) * l1.v[1] - (l1.p[1] - l0.p[1]) * l1.v[0]) / cross;
    return [l0.p[0] + l0.v[0] * t, l0.p[1] + l0.v[1] * t] as Pt;
  });
}

/* Sutherland–Hodgman: subject çokgenini dışbükey clip çokgenine kırpar */
function clipConvex(subject: Pt[], clip: Pt[]): Pt[] {
  let out = subject;
  const n = clip.length;
  for (let i = 0; i < n && out.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % n];
    const side = (p: Pt) =>
      (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const inp = out;
    out = [];
    for (let j = 0; j < inp.length; j++) {
      const cur = inp[j];
      const prev = inp[(j - 1 + inp.length) % inp.length];
      const sc = side(cur);
      const sp = side(prev);
      if (sc >= 0 !== sp >= 0) {
        const t = sp / (sp - sc);
        out.push([
          prev[0] + (cur[0] - prev[0]) * t,
          prev[1] + (cur[1] - prev[1]) * t,
        ]);
      }
      if (sc >= 0) out.push(cur);
    }
  }
  return out;
}

function buildCard(cover: number, hubK = 1, tall = 1) {
  const L = SHROUD_LEFT + cover;
  /* sağ kenar: (küçültülmüş) göbeğin bittiği yer */
  const SR = CX + HUB_R * hubK + 8;
  /* tall > 1: kart yine tam boy, fan kartın içinde biraz küçülür
     (yalnızca çerçeve + göbek yetmediğinde, çok dar/kare ekranlarda) */
  const top = CY - CARD_HALF * tall;
  const bottom = CY + CARD_HALF * tall;
  const pts: Pt[] = [
    [L, top + CHAMFER_Y],
    [L + CHAMFER_X, top],
    [SR, top],
    [SR, bottom],
    [L + CHAMFER_X, bottom],
    [L, bottom - CHAMFER_Y],
  ];
  const R = [
    CORNER_R_CHAMFER,
    CORNER_R_CHAMFER,
    CORNER_R_RIGHT,
    CORNER_R_RIGHT,
    CORNER_R_CHAMFER,
    CORNER_R_CHAMFER,
  ];
  const outer = roundedPath(pts, R, true);

  /* fan deliği: daire ∩ (kartın COVER_LIP kadar içeri alınmış hali).
     Kapak kenarı fana girmediyse tam daire kalır. */
  let hole: string;
  if (cover > 0) {
    const inner = insetConvex(pts, COVER_LIP);
    const circle: Pt[] = Array.from({ length: 160 }, (_, i) => {
      const a = (i / 160) * Math.PI * 2;
      return [CX + Math.cos(a) * CUT_R, CY + Math.sin(a) * CUT_R];
    });
    const poly = clipConvex(circle, inner);
    hole =
      "M " +
      poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ") +
      " Z";
  } else {
    hole = `M ${CX - CUT_R} ${CY}
      A ${CUT_R} ${CUT_R} 0 1 0 ${CX + CUT_R} ${CY}
      A ${CUT_R} ${CUT_R} 0 1 0 ${CX - CUT_R} ${CY} Z`;
  }
  const shroud = `${outer} ${hole}`;

  const edge = (y: number, ch: number): string =>
    roundedPath(
      [
        [L, CY],
        [L, ch],
        [L + CHAMFER_X, y],
        [SR, y],
        [SR, CY],
      ],
      [0, CORNER_R_CHAMFER, CORNER_R_CHAMFER, CORNER_R_RIGHT, 0],
      false,
    );
  const edgeUp = edge(top, top + CHAMFER_Y);
  const edgeDown = edge(bottom, bottom - CHAMFER_Y);
  const led = roundedPath(
    [
      [L + CHAMFER_X + 7, top + 14],
      [L + 14, top + CHAMFER_Y],
      [L + 14, bottom - CHAMFER_Y],
      [L + CHAMFER_X + 7, bottom - 14],
    ],
    [0, CORNER_R_CHAMFER, CORNER_R_CHAMFER, 0],
    false,
  );
  const bus = `M ${CX - HUB_R - 20} ${CY} L ${L} ${CY}`;
  const viewLeft = L - 30;
  const padY = VIEW_PAD_Y * tall;
  const viewTop = top - padY;
  const viewH = bottom - top + padY * 2;
  /* akış her zaman görünür alanın ÜSTÜNDEN başlasın */
  const streamTop = Math.min(STREAM_START_POINT.y, viewTop - 200);

  return {
    viewTop,
    viewH,
    streamTop,
    streamPath: buildStreamPath(streamTop),
    shroudLeft: L,
    shroudOuter: outer,
    shroudPath: shroud,
    fanHole: hole,
    edgeUp,
    edgeDown,
    ledPath: led,
    cardWater: [bus, edgeUp, edgeDown, RING_UP, RING_DOWN],
    viewLeft,
    viewW: SR - viewLeft,
    viewRight: SR,
  };
}

/* AVATAR — önceki sayfadaki nehirle birlikte akıp gelir: suyun üstünde
   çömelmiş (fotoğraftaki poz), akıntıyla sallanarak göbeğe varır ve
   aynı fotoğraf yuvarlak portre olarak fanın ortasına oturur.
   Görsel: public/images/zeynep-comelme.png */

/* GÖBEKTE OTURAN KİŞİ — public/images/zeynepOturma.png
   Görselin piksel boyutu ve kişinin görsel içindeki yeri (ölçüldü).
   Görselin boyutu farklıysa SIT_W / SIT_H'yi gerçek boyutla değiştir. */
const SIT_SRC = "/images/zeynepOturma.png";
const SIT_W = 1584;
const SIT_H = 672;
/** kişinin görseldeki yatay ortası, tepesi ve boyu (px) */
const SIT_CX = 795;
const SIT_TOP = 28;
const SIT_PERSON_H = 632;
/** oturma çizgisi (uyluk / eller) kişinin boyuna oranla */
const SIT_SEAT = (410 - SIT_TOP) / SIT_PERSON_H;
/** suda kayarken kişinin boyu (svg birimi) */
const SIT_RIDE_H = 300; // suda kayarken de göbekteki boyunda: büyük ve net
/** Akıntıdaki kişinin boyu (viewBox birimi) ve fotoğraftaki zemin çizgisi */
const RIDE_S = 165;

/* NEHİR — yol haritasındaki suyla aynı dil: koyu taban, mavi su,
   üstünde farklı hız ve kalınlıkta akan ışık çizgileri */
const RIVER_W = 150;
const RIVER_LANES = [
  { dx: -42, dy: 10, w: 3, o: 0.35, dash: "260 180", dur: 2.2, c: "#46beff" },
  { dx: -24, dy: 4, w: 1.4, o: 0.6, dash: "120 90", dur: 1.4, c: "#cfe6ff" },
  { dx: -8, dy: 0, w: 5, o: 0.22, dash: "420 260", dur: 2.8, c: "#46beff" },
  { dx: 8, dy: -2, w: 1.2, o: 0.7, dash: "80 120", dur: 1.1, c: "#eef5ff" },
  { dx: 24, dy: -6, w: 2.4, o: 0.4, dash: "300 160", dur: 1.8, c: "#8cc4f2" },
  { dx: 40, dy: -10, w: 1.6, o: 0.45, dash: "160 140", dur: 1.5, c: "#a9cdf5" },
];

const SCREW_ANGLES = [150, 210, 128, 232];

/** dikey ekranda alttaki fanın en fazla yüksekliği (svh) */
const PORTRAIT_FAN_MAX_H = 46;
/** ortadaki üst portun yarı genişliği + boşluk (px) */
const PORT_CLEAR = 48 + 24;

export default function ProjectsSection({
  active: activeProp = false,
  finished = false,
  onComplete,
  riderHidden = false,
}: Props) {
  const active = activeProp || finished;
  const [activeIndex, setActiveIndex] = useState(0);
  const [landed, setLanded] = useState(false);
  // Fan oluşurken gösterilecek proje (fanın duracağı proje)
  const [readyIndex, setReadyIndex] = useState<number | null>(null);
  const [prevActive, setPrevActive] = useState(active);

  /* section pasife dönünce her şeyi sıfırla (effect yerine render sırasında) */
  if (prevActive !== active) {
    setPrevActive(active);
    if (!active) {
      setLanded(false);
      setReadyIndex(null);
      setActiveIndex(0);
    }
  }

  const screenIndex = landed ? activeIndex : readyIndex;

  /* DİKEY EKRAN (telefon / dikey tablet): ekran kartı alt yarıya iner,
     proje ekranı üst yarıda görünür kalır */
  const { w: vw, h: vh } = useViewport();
  /* fan ALTTA: 1000px'ten dar her ekran (telefon, tablet); 1000px ve
     üzerinde fan SAĞDA */
  const portrait = vw > 0 && vw < 1000;
  /* küçük web ekranlarında fan ekranın çok büyük kısmını kaplamasın:
     1024px'te genişliğin %40'ı, 1440px ve üstünde %42'si */
  /* üstteki port (orta) hiçbir ekranda kapanmasın: kart ekranın
     ortasından port genişliğinin yarısı + pay kadar sağda kalır */
  const fanMaxW = Math.min(
    vw * (0.4 + 0.02 * Math.min(1, Math.max(0, (vw - 1024) / 416))),
    vw / 2 - PORT_CLEAR - STAGE_INSET_RIGHT,
  );
  /* tam boyda kart bu genişliği aşıyorsa: boy aynı, kartın sol kenarı
     fanın üstüne kayar (kart daralır, çerçeve ince kalır) */
  const deskFit = fitCard(fanMaxW, vh);
  /* telefonda: ince çerçeve + küçük göbek → fan alçak kalır */
  const fit = portrait ? { cover: COVER_MAX, hubK: 0.85, tall: 1 } : deskFit;
  /* seçilen geometride kartın viewBox genişliği */
  const fitW = VIEW_W - fit.cover - HUB_R * (1 - fit.hubK);
  /* dikeyde fan yatay yarım daire olarak altta: ekran genişliğinden
     biraz taşar (yanlardaki köşeler kırpılır), fan büyük görünür.
     Sahne bir "size container": içindeki fan 100cqh ile ölçeklenir. */
  const stageStyle: CSSProperties = portrait
    ? {
        containerType: "size",
        top: "auto",
        bottom: 12, // alttaki kasa çerçevesi görünür kalsın
        /* kartın sağ-sol kenarı ekran kenarına SIFIR: kartın boyu
           (üst/alt boşluk hariç) = ekran genişliği */
        height: `min(${PORTRAIT_FAN_MAX_H}svh, calc(100vw * ${(fitW / (VIEW_H - 2 * VIEW_PAD_Y)).toFixed(4)}))`,
      }
    : { containerType: "size", top: STAGE_INSET_TOP, height: STAGE_H };

  return (
    <section className="relative size-full overflow-hidden">
      {/* Proje fotoğrafı cam panelin İÇİNDE, panelin tamamını kaplar
          (camın kenarları, parlaması ve HUD yazıları üstünde kalır) */}
      <SciFiBackground>
        {active && screenIndex !== null && (
          <ProjectScreen
            project={PROJECTS[screenIndex]}
            index={screenIndex}
            total={PROJECTS.length}
            portrait={portrait}
          />
        )}
      </SciFiBackground>

      {/* Sahne: section yüksekliği, ama görünür ekran yüksekliğini asla aşmaz */}
      <div
        className="absolute inset-x-0 z-20 overflow-hidden"
        style={stageStyle}
      >
        <ProjectFan
          projects={PROJECTS}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onLand={(index) => {
            setActiveIndex(index);
            setLanded(true);
            onComplete?.();
          }}
          onReady={setReadyIndex}
          play={active}
          finished={finished}
          riderHidden={riderHidden}
          upright={portrait}
          cover={fit.cover}
          tall={fit.tall}
          hubK={fit.hubK}
        />
      </div>
    </section>
  );
}

function ProjectFan({
  projects,
  activeIndex,
  onSelect,
  onLand,
  onReady,
  play,
  finished = false,
  riderHidden = false,
  upright = false,
  cover = 0,
  hubK = 1,
  tall = 1,
}: FanProps) {
  /* kart geometrisi; aşağıdaki JSX bu isimleri kullanır */
  const card = useMemo(() => buildCard(cover, hubK, tall), [cover, hubK, tall]);
  const {
    shroudLeft,
    shroudOuter,
    shroudPath,
    fanHole,
    edgeUp,
    edgeDown,
    ledPath,
    cardWater,
    viewLeft,
    viewW,
    viewRight,
    viewTop,
    viewH,
    streamPath,
    streamTop,
  } = card;
  /* kişinin nehirdeki konumu: yol uzunluğu tablosundan (DOM'a bakmadan) */
  const streamLut = useMemo(() => buildStreamLut(streamTop), [streamTop]);

  const hubT = `translate(${CX} ${CY}) scale(${hubK}) translate(${-CX} ${-CY})`;
  /* dikeyde tüm sahne 90° döner; avatar ve fotoğraflar ters dönerek dik kalır */
  const rot = upright ? 90 : 0;
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  const count = Math.max(projects.length, 1);
  const step = 360 / count;
  const bladePath = useMemo(() => createBladePath(count), [count]);

  const lastBladeEnd = BLADE_START + (count - 1) * BLADE_STAGGER + BLADE_DUR;

  const realBodyStart = Math.max(BODY_START, lastBladeEnd - ms(200));
  const realMaterialStart = Math.max(
    MATERIAL_START,
    realBodyStart + BODY_DUR - ms(200),
  );
  // Fotoğraflar yaprak çıkarken hemen belirir
  const realPhotoStart = BLADE_START + BLADE_DUR * 0.35;

  const lastPhotoEnd = realPhotoStart + (count - 1) * PHOTO_STAGGER + PHOTO_DUR;

  const spinStart =
    Math.max(lastPhotoEnd, realMaterialStart + MATERIAL_DUR) + STEP_DELAY;
  const spinEnd = spinStart + STEP_DUR;
  const buildEnd = spinEnd + 50;

  const [t, setT] = useState(0);
  const [fanRot, setFanRot] = useState(FACE_ANGLE - activeIndex * step);
  const [prevPlay, setPrevPlay] = useState(play);

  /* play kapanınca sahneyi başa al (effect yerine render sırasında) */
  if (prevPlay !== play) {
    setPrevPlay(play);
    if (!play) {
      setT(0);
      setFanRot(FACE_ANGLE - activeIndex * step);
    }
  }

  const done = t >= spinEnd;

  /* sahne bitince (ve seçim değiştikçe) fan en kısa yoldan seçili yaprağa döner */
  const syncRot = done ? FACE_ANGLE - activeIndex * step : null;
  const [prevSyncRot, setPrevSyncRot] = useState<number | null>(syncRot);

  if (prevSyncRot !== syncRot) {
    setPrevSyncRot(syncRot);
    if (syncRot !== null) {
      setFanRot((prev) => prev + shortestDelta(prev, syncRot));
    }
  }

  /* animasyon döngüsü bu güncel değerleri okur; render sırasında değil,
     commit'ten sonra (effect içinde) yazılır */
  const fanRotRef = useRef(fanRot);
  const activeIndexRef = useRef(activeIndex);
  const onLandRef = useRef(onLand);
  const onReadyRef = useRef(onReady);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    fanRotRef.current = fanRot;
    activeIndexRef.current = activeIndex;
    onLandRef.current = onLand;
    onReadyRef.current = onReady;
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    if (!play) return;

    /* finished: zaman çizelgesinin sonundan başla → ilk karede son hal */
    const start = performance.now() - (finished ? buildEnd : 0);
    let raf = 0;
    let spinStarted = false;
    let landed = false;
    let readyFired = false;
    let spinFrom = fanRotRef.current;
    let landTarget = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      setT(Math.min(elapsed, buildEnd));

      // Proje fotoğrafı, avatar göbeğe oturduktan sonra açılsın
      if (
        !readyFired &&
        elapsed >= Math.max(BLADE_START, RIDE_TRAVEL + SPIRAL_DUR * 1.2)
      ) {
        readyFired = true;
        onReadyRef.current?.((activeIndexRef.current + 1) % count);
      }

      if (!spinStarted && elapsed >= spinStart) {
        spinStarted = true;
        spinFrom = fanRotRef.current;

        // Sıradaki yaprak: fan yalnızca bir yaprak açısı kadar kayar
        landTarget = (activeIndexRef.current + 1) % count;

        onSelectRef.current(landTarget);
      }

      if (!landed && elapsed >= spinEnd) {
        landed = true;

        // Kaymanın bittiği açıyı kalıcı yap
        setFanRot(spinFrom - step);
        onLandRef.current?.(landTarget);
      }

      if (elapsed < buildEnd) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play, finished, buildEnd, spinStart, spinEnd, count, step]);

  const streamP = easeInOutCubic(phase(t, STREAM_START, STREAM_DUR));
  /* Nehir, ekran kartının metali belirene kadar akmaya devam eder */
  const streamOpacity = 1 - phase(t, realMaterialStart, MATERIAL_DUR * 0.8);

  /* ==============================================================
     KİŞİ — suyla kayarak gelir, girdapta bir tur dönüp merkeze iner,
     aynı fotoğraf etrafında halka kapanarak göbekte portreye oturur
  ============================================================== */
  const pointOn = (f: number) => pointOnLut(streamLut, f);

  /* 1) akıntıda kayma: yolun %86'sına kadar (göbeğin kenarı) */
  const rideP = Math.min(streamP, RIDE_END); // suyun tam ucunda
  /* 2) girdap: kenardan merkeze sarmal iniş */
  const spiralP = phase(t, RIDE_TRAVEL, SPIRAL_DUR);
  const spiralE = easeInOutCubic(spiralP);
  const p0 = pointOn(RIDE_END);
  const r0 = Math.hypot(p0.x - CX, p0.y - CY);
  /* GİRDAP YOK: suyun ucundan akış yönünde yumuşak bir yayla
     doğrudan göbeğin ortasına kayar */
  const pPrev = pointOn(RIDE_END - 0.03);
  const tx = p0.x - pPrev.x;
  const ty = p0.y - pPrev.y;
  const tl = Math.hypot(tx, ty) || 1;
  const ctrl = {
    x: p0.x + (tx / tl) * r0 * 0.55,
    y: p0.y + (ty / tl) * r0 * 0.55,
  };
  const spiralAt = (e: number) => {
    const u = 1 - e;
    return {
      x: u * u * p0.x + 2 * u * e * ctrl.x + e * e * CX,
      y: u * u * p0.y + 2 * u * e * ctrl.y + e * e * CY,
    };
  };
  const personPos = spiralP > 0 ? spiralAt(spiralE) : pointOn(rideP);
  const ahead =
    spiralP > 0 ? spiralAt(Math.min(1, spiralE + 0.04)) : pointOn(rideP + 0.02);
  const headDx = ahead.x - personPos.x;
  const headDy = ahead.y - personPos.y;
  const runLeft = headDx < -0.5;
  const headAngle = Math.atan2(headDy, headDx);

  const personIn = phase(t, STREAM_START, ms(300));
  /* 3) dönüşüm: kayan kişi → yuvarlak portre */
  const settleP = easeInOutCubic(
    phase(t, RIDE_TRAVEL + SPIRAL_DUR * 0.45, SPIRAL_DUR * 0.8),
  );
  /* 4) oturma anı: halka kapanır, ışık dalgası yayılır */
  const seatT = RIDE_TRAVEL + SPIRAL_DUR * 1.2;
  const landPulse = phase(t, seatT, ms(900));

  /* akıntıda sallanma ve gidiş yönüne eğilme (oturunca durur) */
  const bob = Math.sin(t / 90) * 7 * (1 - settleP);
  const tilt =
    Math.max(-16, Math.min(16, Math.sin(headAngle) * (runLeft ? 12 : -12))) *
    (1 - settleP);
  const ripple = (t % 520) / 520;

  const PF = PERSON_FINAL_SCALE;

  /* kırpma dairesi: önce yok (çok büyük), sonra portre dairesine kapanır */
  const clipR = lerp(SIT_RIDE_H * 1.4, AVATAR_R * PF, settleP);
  const clipCy = lerp(-RIDE_S * 0.2, 0, settleP);
  /* OTURAN KİŞİ: baştan sona aynı oturma pozu — suyun üstünde oturarak
     kayar (oturduğu yer su çizgisinde, baldırları suya sarkar), girdapta
     büyüyerek göbeğin ortasına yerleşir */
  const sitH = lerp(SIT_RIDE_H, AVATAR_R * PF * 2 * 0.9, settleP);
  const sitCy = lerp(-(SIT_SEAT - 0.5) * SIT_RIDE_H, 0, settleP);
  const flipX = runLeft && settleP < 0.5 ? -1 : 1;

  const hubP = easeOutCubic(phase(t, HUB_START, HUB_DUR));
  const hubFlash = bump(phase(t, BLADE_START - ms(250), ms(700)));

  const bodyP = easeInOutCubic(phase(t, realBodyStart, BODY_DUR));
  const materialP = easeInOutCubic(phase(t, realMaterialStart, MATERIAL_DUR));
  const binaryBodyOpacity = 1 - phase(t, realMaterialStart + ms(400), ms(800));

  /* Gövde sudan katılaşır: göbekten dışa yayılan dalga cephesi kartı
     açığa çıkarır, ardından metalin üstünden parlak bir ışık süzülür */
  const waveP = easeOutCubic(
    phase(t, realMaterialStart - ms(150), MATERIAL_DUR),
  );
  /* metal, su hatlarının etrafından dışa doğru büyür (hattın kalınlığı) */
  const revealW = lerp(70, 1400, waveP);
  const waveGlow = bump(waveP) * (1 - waveP * 0.3);
  const shimmerP = easeInOutCubic(
    phase(t, realMaterialStart + MATERIAL_DUR * 0.55, ms(1100)),
  );

  const spinP = phase(t, spinStart, STEP_DUR);
  const spinEase = easeInOutCubic(spinP);

  // Kayma bitince açı fanRot'a yazıldığı için burada ekstra açı kalmaz
  const spinRot = spinP > 0 && spinP < 1 ? -step * spinEase : 0;

  const fanRotation = fanRot + spinRot;

  const fanStyle: CSSProperties = {
    transform: `rotate(${fanRotation}deg)`,
    transformOrigin: `${CX}px ${CY}px`,
    transition: done ? "transform 500ms cubic-bezier(.22,.8,.3,1)" : "none",
  };

  return (
    <div
      className="pointer-events-none absolute overflow-hidden"
      style={
        upright
          ? {
              /* döndürülmeden önceki kutu: genişliği sahnenin yüksekliği.
                 90° dönünce yatay yarım fan olur, alt kenara oturur */
              left: "50%",
              top: "50%",
              width: "100cqh",
              aspectRatio: `${VIEW_W} / ${VIEW_H}`,
              transform: "translate(-50%, -50%) rotate(90deg)",
              visibility: play ? "visible" : "hidden",
            }
          : {
              top: 0,
              height: "100%",
              right: STAGE_INSET_RIGHT,
              /* kart her zaman tam boy; cover büyüdükçe daralır */
              width: `calc(100cqh * ${(VIEW_W / VIEW_H).toFixed(4)})`,
              visibility: play ? "visible" : "hidden",
            }
      }
    >
      <svg
        viewBox={`${viewLeft} ${viewTop} ${viewW} ${viewH}`}
        className="size-full overflow-visible"
      >
        <defs>
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
            <feGaussianBlur stdDeviation="16" />
          </filter>

          {/* fan deliği (kapak kenarı fanın üstüne kaydıysa kesik daire) */}
          <clipPath id={id("fanHole")}>
            <path d={fanHole} />
          </clipPath>

          <mask
            id={id("streamMask")}
            maskUnits="userSpaceOnUse"
            x={-2000}
            y={-2000}
            width={5000}
            height={5000}
          >
            <path
              d={streamPath}
              fill="none"
              stroke="#fff"
              strokeWidth={RIVER_W + 14}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${streamP} 2`}
            />
          </mask>

          <linearGradient
            id={id("water")}
            gradientUnits="userSpaceOnUse"
            x1="200"
            y1="-360"
            x2="600"
            y2="640"
          >
            <stop offset="0" stopColor="#061f3a" />
            <stop offset=".35" stopColor="#0a2c52" />
            <stop offset=".65" stopColor="#0e3b6b" />
            <stop offset="1" stopColor="#0b3058" />
          </linearGradient>

          <clipPath id={id("shroudClip")}>
            <path d={shroudPath} fillRule="evenodd" clipRule="evenodd" />
          </clipPath>

          <mask
            id={id("bodyReveal")}
            maskUnits="userSpaceOnUse"
            x={-2000}
            y={-2000}
            width={5000}
            height={5000}
          >
            {cardWater.map((d, k) => (
              <path
                key={k}
                d={d}
                fill="none"
                stroke="#fff"
                strokeWidth={revealW}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            <circle cx={CX} cy={CY} r={HUB_R + revealW / 2} fill="#fff" />
          </mask>

          {/* Büyüyen metalin ışıklı cephesi: biraz daha kalın hat − metal hattı */}
          <mask
            id={id("waveFront")}
            maskUnits="userSpaceOnUse"
            x={-2000}
            y={-2000}
            width={5000}
            height={5000}
          >
            {cardWater.map((d, k) => (
              <path
                key={k}
                d={d}
                fill="none"
                stroke="#fff"
                strokeWidth={revealW + 34}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {cardWater.map((d, k) => (
              <path
                key={`b${k}`}
                d={d}
                fill="none"
                stroke="#000"
                strokeWidth={Math.max(0, revealW - 6)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </mask>

          <linearGradient id={id("shimmer")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".45" stopColor="#eef5ff" stopOpacity=".05" />
            <stop offset=".5" stopColor="#ffffff" stopOpacity=".38" />
            <stop offset=".55" stopColor="#ffe4aa" stopOpacity=".12" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={id("holo")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef5ff" stopOpacity=".9" />
            <stop offset=".5" stopColor="#46beff" stopOpacity=".55" />
            <stop offset="1" stopColor="#0b3f78" stopOpacity=".15" />
          </linearGradient>

          <pattern
            id={id("scan")}
            width="4"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <rect width="4" height="1" fill="#fff" opacity=".12" />
          </pattern>

          <clipPath id={id("avatarClip")}>
            <circle cx="0" cy="0" r={AVATAR_R} />
          </clipPath>

          <clipPath id={id("riderClip")}>
            <circle cx="0" cy={clipCy} r={clipR} />
          </clipPath>

          <linearGradient id={id("gpuMetal")} x1="0" y1="0" x2="1" y2="1">
            {/* NEHİR RENKLERİ (RoadmapSection rm-water): derin su laciverti,
                aralarda nehrin camgöbeği ışığından parlak bantlar */}
            <stop offset="0" stopColor="#3f8fd0" />
            <stop offset=".12" stopColor="#0a2c52" />
            <stop offset=".28" stopColor="#1d5f9a" />
            <stop offset=".46" stopColor="#0b3058" />
            <stop offset=".62" stopColor="#16507f" />
            <stop offset=".8" stopColor="#072444" />
            <stop offset="1" stopColor="#04162e" />
          </linearGradient>

          <pattern
            id={id("brush")}
            width="7"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <rect width="7" height="1" fill="#fff" opacity=".055" />
            <rect y="2" width="7" height="1" fill="#000" opacity=".09" />
          </pattern>

          <linearGradient id={id("blade")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#16335a" />
            <stop offset=".25" stopColor="#0a2446" />
            <stop offset=".65" stopColor="#061730" />
            <stop offset="1" stopColor="#020a18" />
          </linearGradient>

          <linearGradient id={id("glass")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#eef5ff" stopOpacity=".17" />
            <stop offset=".45" stopColor="#8cc4f2" stopOpacity=".04" />
            <stop offset="1" stopColor="#000f20" stopOpacity=".35" />
          </linearGradient>

          <radialGradient id={id("hub")}>
            <stop offset="0" stopColor="#4f6a92" />
            <stop offset=".4" stopColor="#263e62" />
            <stop offset=".72" stopColor="#10284a" />
            <stop offset=".9" stopColor="#294770" />
            <stop offset="1" stopColor="#051328" />
          </radialGradient>

          {projects.map((project, i) => (
            <clipPath key={project.id} id={id(`blade-${i}`)}>
              <path d={bladePath} />
            </clipPath>
          ))}
        </defs>

        {/* Akım yolu (görünmez; 0/1 yazıları bunu takip eder) */}
        <path id={id("streamPath")} d={streamPath} fill="none" stroke="none" />

        {/* NEHİR: 0 ve 1'lerden oluşan akım */}
        {streamOpacity > 0 && (
          <g opacity={streamOpacity}>
            <path
              d={streamPath}
              fill="none"
              stroke="#2f8fe0"
              strokeWidth="170"
              strokeOpacity=".1"
              strokeLinecap="round"
              filter={url("soft")}
              pathLength={1}
              strokeDasharray={`${streamP} 2`}
            />

            {/* SU: koyu taban + mavi su + akan ışık çizgileri */}
            <g mask={url("streamMask")}>
              <path
                d={streamPath}
                fill="none"
                stroke="#04142b"
                strokeWidth={RIVER_W + 12}
                strokeLinecap="round"
              />
              <path
                d={streamPath}
                fill="none"
                stroke={url("water")}
                strokeWidth={RIVER_W}
                strokeLinecap="round"
              />
              <path
                d={streamPath}
                fill="none"
                stroke="#46beff"
                strokeWidth={RIVER_W * 0.45}
                strokeOpacity=".12"
                strokeLinecap="round"
                filter={url("soft")}
              />
              <g filter={url("glow")}>
                {RIVER_LANES.map((l, i) => {
                  const style: CSSVars = { "--d": `${l.dur}s` };

                  return (
                    <path
                      key={i}
                      d={streamPath}
                      transform={`translate(${l.dx} ${l.dy})`}
                      fill="none"
                      stroke={l.c}
                      strokeWidth={l.w}
                      strokeOpacity={l.o}
                      strokeDasharray={l.dash}
                      strokeLinecap="round"
                      className="pf-flow"
                      style={style}
                    />
                  );
                })}
              </g>
            </g>

            <g
              mask={url("streamMask")}
              filter={url("glow")}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="16"
              fontWeight="600"
            >
              {BINARY_LANES.map((lane, i) => (
                <text
                  key={i}
                  fill={lane.color}
                  fillOpacity={lane.opacity}
                  letterSpacing="2"
                >
                  <textPath
                    href={`#${id("streamPath")}`}
                    startOffset={
                      -1000 + (t / SPEED) * 0.25 * lane.speed + lane.shift
                    }
                  >
                    <tspan dy={lane.dy}>{lane.bits}</tspan>
                  </textPath>
                </text>
              ))}
            </g>
          </g>
        )}

        {/* MERKEZ / GİRDAP */}
        {hubP > 0 && (
          <g>
            <circle
              cx={CX}
              cy={CY}
              r={HUB_R * hubP * 1.15}
              fill="#46beff"
              opacity={0.08 + hubFlash * 0.16}
              filter={url("soft")}
            />

            <circle
              cx={CX}
              cy={CY}
              r={HUB_R * hubP}
              fill="#041a34"
              stroke="#46beff"
              strokeWidth="2"
              strokeOpacity=".5"
            />
          </g>
        )}

        {/* FAN YUVASININ ZEMİNİ — opak: arkadaki proje fotoğrafı yaprak
            aralıklarından görünmesin. Yapraklar çıkmaya başlarken belirir. */}
        <g clipPath={cover > 0 ? url("fanHole") : undefined}>
          <circle
            cx={CX}
            cy={CY}
            r={CUT_R}
            fill="#061f3a"
            opacity={easeOutCubic(phase(t, BLADE_START - ms(150), ms(300)))}
          />

          {/* FAN YAPRAKLARI */}
          <g style={fanStyle}>
            {projects.map((project, i) => {
              const bladeP = easeOutCubic(
                phase(t, BLADE_START + i * BLADE_STAGGER, BLADE_DUR),
              );

              if (bladeP <= 0) return null;

              const angle = i * step;

              const photoP = easeInOutCubic(
                phase(t, realPhotoStart + i * PHOTO_STAGGER, PHOTO_DUR),
              );

              const isActive = done && i === activeIndex;
              const radialR = lerp(INNER_R + 20, OUTER_R + 80, bladeP);
              const imgRotation = -fanRotation - angle - rot;

              return (
                <g
                  key={project.id}
                  transform={`rotate(${angle} ${CX} ${CY})`}
                  className={done ? "pointer-events-auto cursor-pointer" : ""}
                  role="button"
                  tabIndex={done ? 0 : -1}
                  aria-label={project.title}
                  aria-pressed={isActive}
                  onClick={() => {
                    if (done) onSelect(i);
                  }}
                  onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
                    if (!done || !["Enter", " "].includes(event.key)) return;
                    event.preventDefault();
                    onSelect(i);
                  }}
                >
                  <g clipPath={`circle(${radialR}px at ${CX}px ${CY}px)`}>
                    {/* yaprak önce suyla dolar, sonra koyu cama döner */}
                    <path
                      d={bladePath}
                      fill={url("water")}
                      opacity={0.85 * (1 - materialP)}
                    />
                    <path
                      d={bladePath}
                      fill={url("blade")}
                      opacity={materialP}
                    />

                    {/* suyun ilerleyen cephesi: yaprak boyunca dışa kayan ışık */}
                    {bladeP < 1 && (
                      <g clipPath={url(`blade-${i}`)}>
                        <circle
                          cx={CX}
                          cy={CY}
                          r={Math.max(0, radialR - 10)}
                          fill="none"
                          stroke="#cfe6ff"
                          strokeWidth="16"
                          strokeOpacity={(1 - bladeP) * 0.9}
                          filter={url("glow")}
                        />
                      </g>
                    )}

                    {materialP < 1 && (
                      <path
                        d={bladePath}
                        fill="none"
                        stroke="#8cc4f2"
                        strokeWidth="2"
                        strokeOpacity={(1 - materialP) * 0.75}
                        pathLength={1}
                        strokeDasharray={`${bladeP} 2`}
                        filter={url("glow")}
                      />
                    )}

                    {photoP > 0 && project.images[0] && (
                      <g clipPath={url(`blade-${i}`)}>
                        <image
                          href={project.images[0]}
                          x={BLADE_CENTER.x - 380}
                          y={BLADE_CENTER.y - 380}
                          width="760"
                          height="760"
                          preserveAspectRatio="xMidYMid slice"
                          opacity={photoP}
                          transform={`
                          translate(${BLADE_CENTER.x} ${BLADE_CENTER.y})
                          rotate(${imgRotation})
                          scale(${1.08 - photoP * 0.08})
                          translate(${-BLADE_CENTER.x} ${-BLADE_CENTER.y})
                        `}
                        />
                      </g>
                    )}

                    <path
                      d={bladePath}
                      fill={url("glass")}
                      opacity={materialP * (isActive ? 0.08 : 0.42)}
                    />

                    <path
                      d={bladePath}
                      fill="none"
                      stroke={isActive ? GOLD_LIGHT : "#7fb6e8"}
                      strokeWidth={isActive ? 2.5 : 1}
                      strokeOpacity={materialP * (isActive ? 0.95 : 0.2)}
                    />
                  </g>
                </g>
              );
            })}
          </g>
        </g>

        {/* FAN METAL MERKEZİ */}
        {materialP > 0 && (
          <g opacity={materialP} transform={hubT}>
            <circle cx={CX} cy={CY} r={HUB_R + 8} fill="#010910" opacity=".8" />

            <circle
              cx={CX}
              cy={CY}
              r={HUB_R}
              fill={url("hub")}
              stroke="#8cc4f2"
              strokeWidth="2"
              strokeOpacity=".45"
            />

            {[0.79, 0.68, 0.55, 0.4, 0.26]
              .map((k) => HUB_R * k)
              .map((r, i) => (
                <circle
                  key={r}
                  cx={CX}
                  cy={CY}
                  r={r}
                  fill="none"
                  stroke={i % 2 ? "#000" : "#fff"}
                  strokeWidth=".8"
                  strokeOpacity={i % 2 ? 0.15 : 0.08}
                />
              ))}

            <circle
              cx={CX}
              cy={CY}
              r={METAL_R}
              fill="none"
              stroke="#a9cdf5"
              strokeWidth="2"
              strokeOpacity=".35"
              pathLength={1}
              strokeDasharray=".07 .025"
            />
          </g>
        )}

        {/* SUDAN AYRILMA — kenara vardığı an suyun üstünde açılan halkalar */}
        {spiralP > 0 && spiralP < 0.6 && (
          <g transform={`translate(${p0.x} ${p0.y})`} pointerEvents="none">
            {[0, 0.18].map((d, k) => {
              const q = clamp((spiralP - d) / 0.42);
              return (
                <ellipse
                  key={k}
                  rx={30 + q * 120}
                  ry={10 + q * 40}
                  fill="none"
                  stroke="#cfe6ff"
                  strokeWidth={2.5 - q * 2}
                  strokeOpacity={(1 - q) * 0.8}
                  filter={url("glow")}
                />
              );
            })}
          </g>
        )}

        {/* KİŞİ: suyla kayar → yayla göbeğin ortasına süzülüp oturur */}
        {personIn > 0 && (
          <g
            transform={`translate(${personPos.x} ${personPos.y + bob}) scale(${lerp(1, hubK, settleP)})`}
            opacity={riderHidden ? 0 : personIn}
          >
            {/* arkasında köpük/sprey: gidişin tersine saçılan damlalar */}
            {settleP < 0.9 &&
              Array.from({ length: 9 }, (_, k) => {
                const back = 26 + k * 13 + ((t / 30 + k * 7) % 12);
                const side = Math.sin(t / 70 + k * 1.7) * (6 + k * 2.2);
                const bx =
                  -Math.cos(headAngle) * back - Math.sin(headAngle) * side;
                const by =
                  -Math.sin(headAngle) * back + Math.cos(headAngle) * side;
                return (
                  <circle
                    key={k}
                    cx={bx}
                    cy={by}
                    r={4.5 - k * 0.4}
                    fill={k % 3 ? "#cfe6ff" : "#ffffff"}
                    opacity={(1 - k / 9) * 0.85 * (1 - settleP)}
                    filter={url("glow")}
                  />
                );
              })}

            {/* su halkaları + altındaki köpük ışığı (oturunca söner) */}
            {settleP < 1 &&
              [0, 0.5].map((off) => {
                const r = (ripple + off) % 1;
                return (
                  <ellipse
                    key={off}
                    cx="0"
                    cy="4"
                    rx={30 + r * 70}
                    ry={8 + r * 16}
                    fill="none"
                    stroke="#cfe6ff"
                    strokeWidth="2"
                    strokeOpacity={(1 - r) * 0.7 * (1 - settleP)}
                    filter={url("glow")}
                  />
                );
              })}
            <ellipse
              cx="0"
              cy="2"
              rx="56"
              ry="11"
              fill="#cfe6ff"
              opacity={0.2 * (1 - settleP)}
              filter={url("soft")}
            />

            {/* oturma anı: dışa yayılan ışık dalgası */}
            {landPulse > 0 && landPulse < 1 && (
              <>
                <circle
                  r={AVATAR_R * PF + landPulse * 260}
                  fill="none"
                  stroke="#cfe6ff"
                  strokeWidth="3"
                  strokeOpacity={1 - landPulse}
                  filter={url("glow")}
                />
                <circle
                  r={AVATAR_R * PF + landPulse * 150}
                  fill="none"
                  stroke="#ffe4aa"
                  strokeWidth="2"
                  strokeOpacity={(1 - landPulse) * 0.8}
                  filter={url("glow")}
                />
              </>
            )}

            {/* portre zemini: halka kapanırken belirir */}
            <circle
              data-hub-rider=""
              r={AVATAR_R * PF + 6}
              fill="#02142c"
              opacity={0.85 * settleP}
            />
            <circle
              r={AVATAR_R * PF}
              fill={url("holo")}
              opacity={0.3 * settleP}
            />

            <g transform={`rotate(${tilt - rot})`}>
              <g clipPath={url("riderClip")}>
                <g transform={`scale(${flipX} 1)`}>
                  {/* suyla kayarken de, göbekte otururken de aynı oturma pozu;
                      ayaklar baştan sona sallanır */}
                  <SwingingLegs personH={sitH} cy={sitCy} uid={id("legs")} />
                </g>
                <rect
                  x={-AVATAR_R}
                  y={-AVATAR_R}
                  width={AVATAR_R * 2}
                  height={AVATAR_R * 2}
                  fill={url("scan")}
                  opacity={settleP}
                />
              </g>
            </g>

            {/* halka: kişi merkeze inerken etrafında çizilerek kapanır */}
            {settleP > 0 && (
              <>
                <circle
                  r={AVATAR_R * PF}
                  fill="none"
                  stroke="#46beff"
                  strokeWidth="10"
                  strokeOpacity={0.25 * settleP}
                  filter={url("soft")}
                />
                <circle
                  r={AVATAR_R * PF}
                  fill="none"
                  stroke={settleP < 1 ? "#ffe4aa" : "#cfe6ff"}
                  strokeWidth="2.5"
                  strokeOpacity={0.5 + settleP * 0.4}
                  pathLength={1}
                  strokeDasharray={`${settleP} 2`}
                  transform="rotate(-90)"
                  filter={url("glow")}
                />
              </>
            )}
          </g>
        )}

        {/* NEHİRDEN EKRAN KARTINA: su göbekten veri hattına, oradan kartın
            dış hattına akar; akış çizgileri yürüyerek kartı "çizer",
            sonra metal gövde belirince su çekilir */}

        {bodyP > 0 && binaryBodyOpacity > 0 && (
          <g>
            {[edgeUp, edgeDown, RING_UP, RING_DOWN].map((path, i) => (
              <RiverLine
                key={i}
                d={path}
                progress={bodyP}
                fade={binaryBodyOpacity}
                width={i < 2 ? 84 : 64}
                uid={id(`edge-${i}`)}
                url={url}
                t={t}
              />
            ))}

            <circle
              cx={CX}
              cy={CY}
              r={CUT_R}
              fill="none"
              stroke="#46beff"
              strokeWidth="22"
              strokeOpacity={0.14 * binaryBodyOpacity}
              pathLength={1}
              strokeDasharray={`${bodyP} 2`}
              filter={url("soft")}
            />
            <circle
              cx={CX}
              cy={CY}
              r={CUT_R}
              fill="none"
              stroke="#dbe9fb"
              strokeWidth="2"
              strokeOpacity={bodyP * binaryBodyOpacity}
              pathLength={1}
              strokeDasharray={`${bodyP} 2`}
              filter={url("glow")}
            />
          </g>
        )}

        {/* GERÇEK EKRAN KARTI GÖVDESİ — göbekten yayılan dalgayla açığa çıkar */}
        {waveP > 0 && (
          <g mask={url("bodyReveal")}>
            <path
              d={shroudPath}
              fillRule="evenodd"
              fill="#000811"
              opacity=".55"
              transform="translate(12 16)"
              filter={url("soft")}
            />

            <path d={shroudPath} fillRule="evenodd" fill={url("gpuMetal")} />

            <path d={shroudPath} fillRule="evenodd" fill={url("brush")} />

            <path
              d={shroudPath}
              fillRule="evenodd"
              fill="none"
              stroke="#46beff"
              strokeWidth="2"
              strokeOpacity=".55"
            />

            {/* parıltı: kartın dış kenarı boyunca turkuaz parçacıklar */}
            <SparkleStroke
              d={shroudOuter}
              spread={16}
              scale={2}
              density={1.7}
            />

            {cover > 0 ? (
              /* kapak fana kaydıysa halka, deliğin kesik hattını izler */
              <>
                <path
                  d={fanHole}
                  fill="none"
                  stroke="#010811"
                  strokeWidth="24"
                  strokeOpacity=".75"
                />
                <path
                  d={fanHole}
                  fill="none"
                  stroke="#0e3b6b"
                  strokeWidth="8"
                />
                <path
                  d={fanHole}
                  fill="none"
                  stroke="#46beff"
                  strokeWidth="1.5"
                  strokeOpacity=".7"
                />
              </>
            ) : (
              <>
                <circle
                  cx={CX}
                  cy={CY}
                  r={CUT_R - 8}
                  fill="none"
                  stroke="#010811"
                  strokeWidth="24"
                  strokeOpacity=".75"
                />

                <circle
                  cx={CX}
                  cy={CY}
                  r={CUT_R + 4}
                  fill="none"
                  stroke="#0e3b6b"
                  strokeWidth="18"
                />

                <circle
                  cx={CX}
                  cy={CY}
                  r={CUT_R + 4}
                  fill="none"
                  stroke="#46beff"
                  strokeWidth="1.5"
                  strokeOpacity=".7"
                />
              </>
            )}

            {SCREW_ANGLES.map((angle) => {
              const p = polar(CUT_R + 46, angle);
              /* kapak kenarının dışında kalan vida çizilmez */
              if (p.x < shroudLeft + 40) return null;

              return (
                <g key={angle} transform={`translate(${p.x} ${p.y})`}>
                  <circle r="15" fill="#061428" />
                  <circle
                    r="10"
                    fill="#7890b4"
                    stroke="#b5c8e0"
                    strokeWidth="1"
                  />
                  <path
                    d="M -5 0 L 5 0 M 0 -5 L 0 5"
                    stroke="#172f52"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            <path
              d={ledPath}
              fill="none"
              stroke="#46beff"
              strokeWidth="8"
              strokeOpacity=".18"
              filter={url("soft")}
            />

            <path
              d={ledPath}
              fill="none"
              stroke="#cfe6ff"
              strokeWidth="2"
              strokeOpacity=".8"
            />
          </g>
        )}
        {/* SU DONUYOR: metalin büyüyen kenarında parlak su cephesi */}
        {waveP > 0 && waveP < 1 && (
          <g clipPath={url("shroudClip")}>
            <rect
              x={viewLeft - 300}
              y={viewTop - 300}
              width={viewW + 600}
              height={viewH + 600}
              fill="#cfe6ff"
              opacity={0.55 * waveGlow}
              mask={url("waveFront")}
              filter={url("glow")}
            />
          </g>
        )}

        {/* METAL PARLAMASI: katılaşınca üstünden bir kez ışık süzülür */}
        {shimmerP > 0 && shimmerP < 1 && (
          <g clipPath={url("shroudClip")}>
            <rect
              x={lerp(viewLeft - 700, viewRight + 200, shimmerP)}
              y={viewTop - 200}
              width="520"
              height={viewH + 400}
              fill={url("shimmer")}
              transform={`rotate(18 ${CX} ${CY})`}
            />
          </g>
        )}
      </svg>

      <style>{`
        @keyframes pfFlow { to { stroke-dashoffset: -1000; } }
        .pf-flow { animation: pfFlow var(--d) linear infinite; }
        @media (prefers-reduced-motion: reduce) { .pf-flow { animation: none; } }
      `}</style>
    </div>
  );
}

/* KARTI OLUŞTURAN NEHİR KOLU — ana nehirle aynı görünüm:
   koyu taban, mavi su, akan ışık çizgileri ve 0/1 yazıları.
   progress: kolun ne kadar ilerlediği (0..1), fade: genel opaklık */
function RiverLine({
  d,
  progress,
  fade,
  width,
  uid,
  url,
  t,
}: {
  d: string;
  progress: number;
  fade: number;
  width: number;
  uid: string;
  url: (name: string) => string;
  t: number;
}) {
  const bits = useMemo(
    () => binaryString(width * 31 + d.length, 220),
    [width, d],
  );

  const flowLines = [
    {
      off: -width * 0.22,
      w: 1.4,
      o: ".7",
      dash: "90 70",
      dur: "0.9s",
      c: "#eef5ff",
    },
    { off: 0, w: 3.5, o: ".3", dash: "260 140", dur: "1.6s", c: "#46beff" },
    {
      off: width * 0.22,
      w: 1.2,
      o: ".6",
      dash: "50 90",
      dur: "0.7s",
      c: "#8cc4f2",
    },
  ];

  return (
    <g opacity={fade}>
      <defs>
        <path id={`${uid}-p`} d={d} />
        <mask
          id={`${uid}-m`}
          maskUnits="userSpaceOnUse"
          x={-2000}
          y={-2000}
          width={5000}
          height={5000}
        >
          <path
            d={d}
            fill="none"
            stroke="#fff"
            strokeWidth={width + 16}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${progress} 2`}
          />
        </mask>
      </defs>
      <g mask={`url(#${uid}-m)`}>
        <path
          d={d}
          fill="none"
          stroke="#04142b"
          strokeWidth={width + 10}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={d}
          fill="none"
          stroke={url("water")}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={d}
          fill="none"
          stroke="#46beff"
          strokeWidth={width * 0.5}
          strokeOpacity=".14"
          filter={url("soft")}
        />
        {/* parıltı: suyun üstüne serpilmiş turkuaz parçacıklar */}
        <SparkleStroke d={d} spread={width * 0.45} scale={1.8} density={1.8} />
        {/* hareketli akış: filtresiz (performans) */}
        <g>
          {flowLines.map((l, k) => {
            const style: CSSVars = { "--d": l.dur };

            return (
              <path
                key={k}
                d={d}
                transform={`translate(${l.off} ${l.off})`}
                fill="none"
                stroke={l.c}
                strokeWidth={l.w}
                strokeOpacity={l.o}
                strokeDasharray={l.dash}
                strokeLinecap="round"
                className="pf-flow"
                style={style}
              />
            );
          })}
        </g>
        <g
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="13"
          fontWeight="600"
        >
          {[-width * 0.18, width * 0.2].map((dy, k) => (
            <text
              key={k}
              fill={k ? "#8cc4f2" : "#e6f0ff"}
              fillOpacity={k ? 0.55 : 0.75}
              letterSpacing="2"
            >
              <textPath
                href={`#${uid}-p`}
                startOffset={-600 + (((t / SPEED) * (0.22 + k * 0.05)) % 600)}
              >
                <tspan dy={dy}>{bits}</tspan>
              </textPath>
            </text>
          ))}
        </g>
      </g>
    </g>
  );
}

/* ================================================================
   PROJE EKRANI — kart yok: proje fotoğrafı doğrudan arkadaki büyük cam
   ekranda gösterilir (fanın solundaki alanın tamamı).
   Açılış: ekran gibi "güç alır" — önce yatay ışık çizgisi, sonra dikey
   açılır, tarama çizgisi bir kez üstten alta geçer. Proje değişince
   görüntü kısa bir glitch ile yenisine geçer.
================================================================ */
function ProjectScreen({
  project,
  index,
  total,
  portrait = false,
}: {
  project: Project;
  index: number;
  total: number;
  portrait?: boolean;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const [main] = project.images;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* EKRAN ALANI: cam panelin TAMAMI (fan bunun önünde durur) */}
      <div
        className="ps-screen absolute inset-0 overflow-hidden"
        style={{ borderRadius: "inherit" }}
      >
        {/* Fotoğraf — proje değişince yeniden mount olur (glitch geçiş) */}
        <div
          key={project.id}
          className="ps-img absolute inset-0"
          style={
            portrait
              ? {
                  /* dikeyde fotoğraf üst yarıda; alt kenarı fana doğru söner */
                  bottom: "28%",
                  WebkitMaskImage:
                    "linear-gradient(180deg, #000 75%, transparent)",
                  maskImage: "linear-gradient(180deg, #000 75%, transparent)",
                }
              : undefined
          }
        >
          {main && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={main}
              alt={project.title}
              className="size-full object-cover"
            />
          )}
          {/* glitch dilimleri: geçişte kısa an kayan şeritler */}
          <div className="ps-glitch absolute inset-0" />
        </div>

        {/* Ekranın içine gömülü görünsün: kenarlar cama doğru söner */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 110% at 40% 50%, transparent 60%, rgba(3,11,26,.35) 88%, rgba(3,11,26,.6) 100%)",
          }}
        />
        {/* tarama çizgileri + mavi ekran tonu */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,.03)_0_1px,transparent_1px_4px)]" />
        <div
          className="absolute inset-0 mix-blend-soft-light"
          style={{
            background:
              "linear-gradient(160deg, rgba(70,190,255,.25), rgba(6,26,51,.35))",
          }}
        />
        {/* bir kez geçen parlak tarama */}
        <div
          key={`scan-${project.id}`}
          className="ps-scan absolute inset-x-0 h-[18%]"
        />

        {/* HUD: sol üst sayaç, sol alt başlık */}
        <div
          className={`absolute font-mono text-xs tracking-[.14em] text-[#a8eef6] [text-shadow:0_0_8px_rgba(79,216,255,.8)] ${portrait ? "top-12 left-8" : "top-16 left-12"}`}
        >
          [ PROJE {pad(index + 1)} / {pad(total)} ]
        </div>
        <div
          key={`t-${project.id}`}
          className={`ps-title absolute ${portrait ? "top-20 left-8" : "bottom-12 left-12"}`}
        >
          <span className="font-mono text-[10px] tracking-[.2em] text-[#5fb8d0]">
            SELECTED PROJECT
          </span>
          <h2 className="mt-1 text-2xl font-semibold text-[#c4f7fb] [text-shadow:0_2px_12px_rgba(0,0,0,.8)]">
            {project.title}
          </h2>
        </div>
        {/* camın içinde: kenarlardan hafif mavi ışık */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: "inherit",
            boxShadow: "inset 0 0 60px rgba(70,190,255,.18)",
          }}
        />
      </div>

      <style>{`
        @keyframes beam {
          from { transform: translateY(-50%) scaleX(0); opacity: 1; }
          to   { transform: translateY(-50%) scaleX(1); opacity: .25; }
        }

        /* Ekran gücü: önce yatay çizgi, sonra dikey açılış */
        .ps-screen {
          animation: ps-on .55s cubic-bezier(.2,.8,.2,1) both;
        }
        @keyframes ps-on {
          0%   { clip-path: inset(49.6% 50% 49.6% 50%); filter: brightness(3); }
          35%  { clip-path: inset(49.6% 0 49.6% 0);     filter: brightness(2.4); }
          100% { clip-path: inset(0 0 0 0);             filter: brightness(1); }
        }

        /* Proje değişimi: kısa glitch + netleşme */
        .ps-img {
          animation: ps-img .42s cubic-bezier(.2,.8,.2,1) both;
        }
        @keyframes ps-img {
          0%   { opacity: 0; transform: scale(1.06); filter: blur(8px) saturate(2) hue-rotate(-20deg); }
          30%  { opacity: 1; transform: scale(1.03) translateX(-6px); filter: blur(2px) saturate(1.6); }
          45%  { transform: scale(1.02) translateX(5px); }
          100% { opacity: 1; transform: scale(1); filter: none; }
        }
        .ps-glitch {
          background:
            linear-gradient(transparent 18%, rgba(70,190,255,.35) 18% 21%, transparent 21% 54%,
              rgba(217,183,119,.3) 54% 56%, transparent 56% 78%, rgba(207,230,255,.3) 78% 80%, transparent 80%);
          mix-blend-mode: screen;
          animation: ps-glitch .4s steps(4) both;
        }
        @keyframes ps-glitch {
          0%   { opacity: 1; transform: translateX(-12px); }
          50%  { opacity: .8; transform: translateX(10px); }
          100% { opacity: 0; transform: translateX(0); }
        }

        /* Tarama ışığı üstten alta bir kez geçer */
        .ps-scan {
          top: -20%;
          background: linear-gradient(to bottom, transparent, rgba(207,230,255,.16) 60%, rgba(207,230,255,.35) 92%, transparent);
          animation: ps-scan .7s ease-in .15s both;
        }
        @keyframes ps-scan {
          from { transform: translateY(0); opacity: 1; }
          to   { transform: translateY(650%); opacity: 0; }
        }

        .ps-title {
          animation: ps-title .4s cubic-bezier(.2,.8,.2,1) .1s both;
        }
        @keyframes ps-title {
          from { opacity: 0; transform: translateY(10px); letter-spacing: .3em; }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ps-screen, .ps-img, .ps-glitch, .ps-scan, .ps-title { animation: none; }
        }
      `}</style>
    </div>
  );
}

/* ================================================================
   OTURAN KİŞİ — AYAK SALLAMA (zeynepOturma.png)
   Görsel üç parçaya ayrılır: gövde + uyluklar (sabit) ve dizden
   aşağı iki baldır. Baldırlar dizden, birbirine ters zamanda
   ileri-geri sallanır — oturduğu yerden ayak sallıyormuş gibi.
   Koordinatlar görsel pikseli (SIT_W × SIT_H).
================================================================ */
const SIT_LEGS: {
  /** sallanan parça (üstü dizin biraz üstünden başlar, gövdeyle örtüşür) */
  poly: [number, number][];
  /** gövdeden çıkarılan kısım (dizin altından) */
  cut: [number, number][];
  pivot: [number, number];
  amp: number;
  delay: string;
}[] = [
  /* sol baldır */
  {
    poly: [
      [726, 415],
      [794, 415],
      [794, 580],
      [792, 664],
      [742, 664],
      [732, 580],
    ],
    cut: [
      [728, 440],
      [794, 440],
      [794, 580],
      [792, 664],
      [742, 664],
      [732, 580],
    ],
    pivot: [760, 428],
    amp: 13,
    delay: "0s",
  },
  /* sağ baldır */
  {
    poly: [
      [794, 415],
      [862, 415],
      [858, 580],
      [842, 664],
      [794, 664],
      [794, 580],
    ],
    cut: [
      [794, 440],
      [860, 440],
      [858, 580],
      [842, 664],
      [794, 664],
      [794, 580],
    ],
    pivot: [828, 428],
    amp: 13,
    delay: "-0.55s",
  },
];
const LEG_SWING_S = 1.1; // bir ileri-geri sallanma süresi (sn)

function SwingingLegs({
  personH,
  cy = 0,
  uid,
}: {
  personH: number;
  cy?: number;
  uid: string;
}) {
  /* kişi (0, cy) merkezli, boyu personH olacak şekilde görsel yerleşimi */
  const k = personH / SIT_PERSON_H;
  const ox = -SIT_CX * k;
  const oy = cy - personH / 2 - SIT_TOP * k;
  const P = ([x, y]: [number, number]) => `${ox + x * k},${oy + y * k}`;
  const img = (
    <image
      href={SIT_SRC}
      x={ox}
      y={oy}
      width={SIT_W * k}
      height={SIT_H * k}
      preserveAspectRatio="none"
    />
  );
  const big = {
    x: ox - 50,
    y: oy - 50,
    w: SIT_W * k + 100,
    h: SIT_H * k + 100,
  };
  return (
    <>
      <defs>
        <mask
          id={`${uid}-body`}
          maskUnits="userSpaceOnUse"
          x={big.x}
          y={big.y}
          width={big.w}
          height={big.h}
        >
          <rect x={big.x} y={big.y} width={big.w} height={big.h} fill="#fff" />
          {SIT_LEGS.map((l, i) => (
            <polygon key={i} points={l.cut.map(P).join(" ")} fill="#000" />
          ))}
        </mask>
        {SIT_LEGS.map((l, i) => (
          <clipPath key={i} id={`${uid}-leg${i}`}>
            <polygon points={l.poly.map(P).join(" ")} />
          </clipPath>
        ))}
      </defs>

      {/* gövde + uyluklar (sabit) */}
      <g mask={`url(#${uid}-body)`}>{img}</g>

      {/* baldırlar dizden sallanır */}
      {SIT_LEGS.map((l, i) => {
        const [px, py] = P(l.pivot).split(",");
        return (
          <g key={i}>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`${-l.amp} ${px} ${py}; ${l.amp} ${px} ${py}; ${-l.amp} ${px} ${py}`}
              keyTimes="0; .5; 1"
              calcMode="spline"
              keySplines=".45 0 .55 1; .45 0 .55 1"
              dur={`${LEG_SWING_S}s`}
              begin={l.delay}
              repeatCount="indefinite"
            />
            <g clipPath={`url(#${uid}-leg${i})`}>{img}</g>
          </g>
        );
      })}
    </>
  );
}
