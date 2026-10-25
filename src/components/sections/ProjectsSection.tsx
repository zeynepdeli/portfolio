"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import SciFiBackground from "@/components/ui/ScifiBackground";
import { useViewport } from "@/components/ui/ChipLayout";
import { IMG } from "@/components/ui/assets";

/** CSS özel değişkenleri (--d gibi) için tip */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/* Aktif proje / seçim vurgusu: çip çizgileri ve aktif menüyle aynı altın */
const GOLD_LIGHT = "#ffe4aa";

export type Project = {
  id: number;
  title: string;
  images: string[];
  /** resmin üstünde, başlığın altında görünen kısa açıklama */
  description?: string;
  /** kullanılan teknolojiler (küçük etiketler) */
  tags?: string[];
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
  /** true: sayfa ekrana yükselirken nehir ve kişi girişte HAZIR
   *  görünür; `active` olunca oradan akmaya başlar */
  staged?: boolean;
};

type FanProps = {
  /** oynamadan önce (sayfa yükselirken) giriş karesini göster */
  staged?: boolean;
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
  /** nehrin girişini ekranın üstüne kadar uzatma payı (fan birimi;
      dikeyde sahne ekranın altında olduğu için gerekli) */
  entryExtra?: number;
  /** kartın sağ köşe yarıçapı (viewBox birimi) — panelinkiyle aynı */
  rightR?: number;
};

export const PROJECTS: Project[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  title: `Proje ${i + 1}`,
  description:
    "Proje açıklaması burada yer alacak — ne yaptığı, senin rolün ve öne çıkan özellikleri.",
  tags: ["Next.js", "TypeScript", "Tailwind CSS"],
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
const VIEW_PAD_Y = 0; // kartın üst/alt kenarı = cam panelin üst/alt kenarı
const VIEW_LEFT = SHROUD_LEFT - 30;
// Sağ kenar: orta göbeğin (koyu dış halkası dahil) bittiği yer — fanın
// sağ yarısı YOK, kart ve fan burada (ekranın sağ kenarında) biter
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
const STAGE_INSET_RIGHT = 21; // (yalnızca fan genişliği hesabında)
/* CAM PANELİN YERİ — ScifiBackground'daki varsayılan panelInset ile AYNI:
   sol/sağ %1, üst/alt %1.5. Kart bu kenarlarda biter. */
const PANEL_SIDE = 0.01; // genişliğe oran
const PANEL_TOPBOT = 0.015; // yüksekliğe oran
/** cam panelin köşe yuvarlaklığı (px) — Theme.tsx'teki --glass-radius ile aynı */
const PANEL_RADIUS = 14;

// Tüm animasyon hızı: küçüldükçe hızlanır (1 = orijinal)
const SPEED = 0.65; // nehir + avatar + fan oluşumu (küçük = hızlı; eskiden 0.5)
/** animasyon saati bir karede en fazla bu kadar ilerler (ms) */
const MAX_FRAME_MS = 100;
const ms = (v: number) => v * SPEED;

/* ZAMAN ÇİZELGESİ (ms)
   1) nehir bir üst sayfadan (ekranın üstünden) akarak gelir, kişi suyun
      ucunda oturmuş halde kayar            0 → ARRIVE
   2) göbeğin kenarından yumuşak bir yayla ortasına süzülüp oturur
   3) kişi oturduktan SONRA fan yaprakları, ardından kart gövdesi oluşur */
const ARRIVE = 3300; // kişinin göbeğin kenarına vardığı an (eskiden 2600: avatar daha yavaş kayar)
const SPIRAL_DUR = 560; // kenardan göbeğin ortasına ZIPLAMA süresi (eskiden 1050: ağır kalıyordu)
/** zıplamanın yüksekliği (fan birimi, ekranda yukarı doğru) */
const JUMP_H = 230;
const SEATED = ARRIVE + SPIRAL_DUR + 120; // yere inip oturma anı
const STREAM_TAIL_DUR = 500; // kişi varınca suyun göbeğe dolması
const HUB_START = ARRIVE - 500;
const HUB_DUR = 700;

/* DONMA — kişi oturunca su göbekten fan yuvasına yayılır, sonra buz
   cephesi göbekten dışa doğru ilerleyip suyu yaprak yaprak dondurur;
   buz kararıp koyu cama döner, fotoğraflar belirir; en son kart gövdesi
   aynı şekilde donarak oluşur */
const FILL_START = SEATED - 250; // su fan yuvasına yayılır
const FILL_DUR = 650;
const FREEZE_START = SEATED + 300; // yapraklar donar (göbekten dışa)
const FREEZE_DUR = 1100;
const THAW_START = FREEZE_START + FREEZE_DUR * 0.55; // buz → koyu cam
const THAW_DUR = 900;
const BODY_FREEZE_START = FREEZE_START + FREEZE_DUR * 0.7; // kart gövdesi
const BODY_FREEZE_DUR = 1000;
const BODY_THAW_DUR = 900;
/** gövde donma cephesinin ulaşacağı yarıçap (kartın en uzak köşesi) */
const BODY_REACH = 1700;
const PHOTO_STAGGER = 70;
const PHOTO_DUR = 420;

// Fan dönmez: oluşunca yalnızca bir yaprak kadar kayar
const STEP_DELAY = 150;
const STEP_DUR = 550;
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
/** hafifçe ileri taşıp yerine oturan yumuşak bitiş */
const easeOutBack = (t: number, s = 1.25) => {
  const v = clamp(t) - 1;
  return 1 + (s + 1) * v * v * v + s * v * v;
};

/* YELPAZE AÇILIŞI: yapraklar önce üst üste katlı durur, su yuvaya
   yayılırken bir el yelpazesi gibi sırayla açılıp yerlerine oturur */
const UNFOLD_START = 450; // FILL_START'a göre (ms): buz yayılırken açılır
const UNFOLD_STAGGER = 70; // yapraklar arası gecikme
const UNFOLD_DUR = 900;

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

/* =========================================================
   NEHİR — YOL HARİTASIYLA BİREBİR AYNI GÖRÜNÜM
   Aynı renkler, aynı akış çizgileri (yumuşak / ince / parlak / ana),
   aynı koyu derinlik bantları ve aynı boyutta 0/1 yazıları.
   RM_K: yol haritası nehri ekranda bu kadar büyük çizildiği için fan
   birimine çevirme katsayısı (ekranda aynı boyutta görünsün diye).
========================================================= */
const RM_K = 1.4;
const RM = {
  edge: "#46beff",
  ice: "#cfe6ff",
  iceSoft: "#a9cdf5",
  steel: "#5b8fc9",
  steelDim: "#3d6fa8",
};

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
    width: (width + ((i * 7) % 5) * width * 0.5) * RM_K,
    opacity: opacity + ((i * 3) % 4) * 0.09,
    dash: `${(dash + ((i * 37) % 5) * dash * 0.22) * RM_K} ${
      (gap + ((i * 13) % 4) * gap * 0.45) * RM_K
    }`,
    duration: 4 + ((i * 5) % 4),
  }));

const RM_STREAMS = makeStreams(7, 0.1, 0.8, 0.8, 0.22, 700, 220);
const RM_FINE_STREAMS = makeStreams(10, 0.05, 0.9, 0.6, 0.2, 200, 80);
const RM_SOFT_STREAMS = [0.15, 0.35, 0.55, 0.75];
const RM_HIGHLIGHTS = [0.28, 0.5, 0.68];
const RM_DARK_BANDS = [0.3, 0.62, 0.85];

const RM_MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
/** 0/1 yazı boyu ve harf aralığı (yol haritasıyla aynı görünür boyut) */
const RM_BINARY_SIZE = 11 * RM_K;
const RM_BINARY_SPACING = 1.1 * RM_K;
/** [nehir genişliğine oran, opaklık, başlangıç kayması] */
const RM_BINARY_LANES: [number, number, string][] = [
  [0.14, 0.3, "0%"],
  [0.26, 0.36, "3%"],
  [0.38, 0.4, "1%"],
  [0.5, 0.44, "4%"],
  [0.62, 0.4, "2%"],
  [0.74, 0.34, "0%"],
  [0.86, 0.28, "3%"],
];
function seededBinary(length: number, seed: number): string {
  let s = Math.imul(seed + 1, 2654435761) >>> 0;
  let out = "";
  for (let i = 0; i < length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out += (s >>> 16) & 1 ? "1" : "0";
  }
  return out;
}
const RM_BINARY = RM_BINARY_LANES.map((_, i) => seededBinary(1600, i + 3));

/** nehrin bir kenarından (0) diğerine (1) şerit yolu — LUT noktalarından */
function laneFromLut(lut: LutPoint[], ratio: number, width: number) {
  const off = (ratio - 0.5) * width;
  const pts: string[] = [];
  const step = 2;
  for (let i = 0; i < lut.length; i += step) {
    const a = lut[Math.max(0, i - 1)];
    const b = lut[Math.min(lut.length - 1, i + 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const l = Math.hypot(tx, ty) || 1;
    const p = lut[i];
    pts.push(
      `${(p.x - (ty / l) * off).toFixed(1)} ${(p.y + (tx / l) * off).toFixed(1)}`,
    );
  }
  return `M ${pts.join(" L ")}`;
}

const BLADE_CENTER = polar((INNER_R + OUTER_R) / 2 + 20, -TWIST * 0.6);

/* Yaprağın içindeki buz kristali çizgileri: yaprak boyunca uzanan bir
   omurga ve ondan iki yana açılan dallar (deterministik, bir kez üretilir) */
const FROST_PATH = (() => {
  const parts: string[] = [];
  const spine = (k: number) =>
    polar(lerp(INNER_R + 30, OUTER_R - 40, k), -TWIST * (0.25 + k * 0.6));
  const pts = Array.from({ length: 9 }, (_, i) => spine(i / 8));
  parts.push(
    `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`,
  );
  pts.slice(1, -1).forEach((p, i) => {
    const len = 34 + ((i * 37) % 4) * 14;
    const base = Math.atan2(p.y - CY, p.x - CX);
    [1, -1].forEach((side) => {
      const a = base + side * (0.75 + ((i * 13) % 3) * 0.12);
      const q = { x: p.x + Math.cos(a) * len, y: p.y + Math.sin(a) * len };
      parts.push(
        `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${q.x.toFixed(1)} ${q.y.toFixed(1)}`,
      );
      /* dalın ucunda küçük çatal */
      const b = a + side * 0.6;
      const r = {
        x: q.x - Math.cos(a) * len * 0.45,
        y: q.y - Math.sin(a) * len * 0.45,
      };
      parts.push(
        `M ${r.x.toFixed(1)} ${r.y.toFixed(1)} L ${(r.x + Math.cos(b) * len * 0.35).toFixed(1)} ${(r.y + Math.sin(b) * len * 0.35).toFixed(1)}`,
      );
    });
  });
  return parts.join(" ");
})();

/* =========================================================
   NEHİR YOLU — bir üst sayfadan gelir
   Rota EKRAN yönünde (sağ = +x, aşağı = +y) ve göbeğe göre tanımlıdır;
   dikey ekranda fan 90° döndüğü için fan koordinatına çevrilir.
   Nehir ekranın ÜSTÜNDEN girer, S çizerek göbeğe akar.
   Bézier parçaları sayı olarak tutulur: hem SVG yolu hem de
   "kişi nehirde nerede?" hesabı aynı veriden üretilir.
========================================================= */
type Seg = [number, number, number, number, number, number];
type StreamGeo = {
  start: [number, number];
  curves: Seg[];
  /** ekran dışındaki giriş payının uzunluğu (fan birimi; köşeden girişte) */
  lead?: number;
};

/** ölçüm işaretlerinin arası (fan birimi) */
const PROBE = 100;

/** ekranın sağ üst köşesi, fan (SVG) koordinatında — ölçülür */
type Corner = {
  /** köşe noktası */
  k: [number, number];
  /** ekrandan dışarı (sağ-yukarı) birim yön */
  out: [number, number];
  /** ekranda aşağı (biraz sola) birim yön */
  down: [number, number];
};

/** Masaüstü (fan sağda): ekranın SAĞ ÜST köşesinden (yol haritasındaki
    nehrin bittiği köşe) girer, sola-aşağı iner, kıvrılıp soldan göbeğe akar */
const ROUTE_WIDE: StreamGeo = {
  start: [200, -820],
  curves: [
    [200, -600, -40, -560, -240, -380],
    [-420, -220, -390, -40, -210, -12],
    [-120, 0, -55, 0, 0, 0],
  ],
};
/** Dikey (fan altta): ekranın SAĞ üst köşesinden iner, sola kıvrılıp
    soldan göbeğe girer */
const ROUTE_TALL: StreamGeo = {
  start: [470, -1150],
  curves: [
    [470, -760, 160, -600, -60, -420],
    [-280, -250, -270, -50, -130, -12],
    [-80, 0, -35, 0, 0, 0],
  ],
};

/** Ekran yönündeki rotayı fan koordinatına çevirir ve ekranın üst
    kenarının dışına kadar düz bir girişle uzatır */
function buildStreamGeo(
  upright: boolean,
  viewTop: number,
  viewLeft: number,
  extra = 0,
  corner: Corner | null = null,
): StreamGeo {
  const route = upright ? ROUTE_TALL : ROUTE_WIDE;
  /* ekran ofseti (dx, dy) → fan noktası (dikeyde fan 90° dönük) */
  const map = (dx: number, dy: number): [number, number] =>
    upright ? [CX + dy, CY - dx] : [CX + dx, CY + dy];
  const curves = route.curves.map(
    ([a, b, c, d, e, f]) => [...map(a, b), ...map(c, d), ...map(e, f)] as Seg,
  );
  /* EKRANIN TAM SAĞ ÜST KÖŞESİNDEN GİRİŞ (yol haritasındaki nehrin
     bittiği köşe): köşenin biraz dışından başlar, köşeden içeri girip
     rotanın ilk kıvrımına bağlanır */
  if (corner) {
    const [kx, ky] = corner.k;
    const [, , c2x, c2y, ex, ey] = curves[0];
    const span = Math.hypot(ex - kx, ey - ky);
    const lead = 90;
    const entry: [number, number] = [
      kx + corner.out[0] * lead,
      ky + corner.out[1] * lead,
    ];
    const c1: [number, number] = [
      kx + corner.down[0] * span * 0.45,
      ky + corner.down[1] * span * 0.45,
    ];
    return {
      start: entry,
      lead,
      curves: [
        [...entry, kx, ky, kx, ky] as Seg,
        [...c1, c2x, c2y, ex, ey] as Seg,
        ...curves.slice(1),
      ],
    };
  }
  const [sdx, sdy] = route.start;
  const first = map(sdx, sdy);
  const reach =
    (upright
      ? Math.max(0, first[0] - (viewLeft - 200))
      : Math.max(0, first[1] - (viewTop - 200))) + extra;
  const entry = map(sdx, sdy - reach);
  return {
    start: entry,
    curves: [[...entry, ...first, ...first] as Seg, ...curves],
  };
}

function buildStreamPath(g: StreamGeo) {
  const segs = g.curves.map((c) => `C ${c.join(" ")}`).join(" ");
  return `M ${g.start[0]} ${g.start[1]} ${segs}`;
}

type LutPoint = { x: number; y: number; len: number };

/** Yol uzunluğu tablosu: yolun %f noktasındaki koordinatı saf matematikle verir */
function buildStreamLut(g: StreamGeo): LutPoint[] {
  const SAMPLES = 80;
  const [sx, sy] = g.start;
  const pts: LutPoint[] = [{ x: sx, y: sy, len: 0 }];
  let acc = 0;
  let px = sx;
  let py = sy;

  for (const [x1, y1, x2, y2, x3, y3] of g.curves) {
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

/** kişinin akıntıda kaydığı son nokta: göbeğin kenarına ulaştığı yer (oran) */
function rideEndOf(lut: LutPoint[], edge: number) {
  const total = lut[lut.length - 1].len || 1;
  const hit = lut.find((p) => Math.hypot(p.x - CX, p.y - CY) <= edge);
  return hit ? hit.len / total : 0.9;
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

function buildCard(
  cover: number,
  hubK = 1,
  tall = 1,
  upright = false,
  entryExtra = 0,
  rightR = CORNER_R_RIGHT,
  corner: Corner | null = null,
) {
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
    rightR,
    rightR,
    CORNER_R_CHAMFER,
    CORNER_R_CHAMFER,
  ];
  const outer = roundedPath(pts, R, true);

  /* fan deliği: daire ∩ (kartın COVER_LIP kadar içeri alınmış hali).
     Kapak kenarı fana girmediyse tam daire kalır. */
  let hole: string;
  if (cover > 0) {
    /* yalnızca SOL (pahlı) kapak ve üst/alt kenar fan deliğini keser;
       sağda delik kartın kenarına kadar açık kalır (fan orada biter) —
       aksi halde sağda fazladan düz bir mavi halka çizgisi oluşuyordu */
    const far: Pt[] = pts.map(([x, y]) => [x >= SR ? SR + 4000 : x, y] as Pt);
    const inner = insetConvex(far, COVER_LIP);
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
      [0, CORNER_R_CHAMFER, CORNER_R_CHAMFER, rightR, 0],
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
  const stream = buildStreamGeo(upright, viewTop, viewLeft, entryExtra, corner);

  return {
    viewTop,
    viewH,
    stream,
    streamPath: buildStreamPath(stream),
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
   Görsel: public/images/zeynep-comelme.webp */

/* GÖBEKTE OTURAN KİŞİ — public/images/zeynep-oturma.webp
   Görselin piksel boyutu ve kişinin görsel içindeki yeri (ölçüldü).
   Görselin boyutu farklıysa SIT_W / SIT_H'yi gerçek boyutla değiştir. */
const SIT_SRC = IMG.sit;
const SIT_W = 1584;
const SIT_H = 672;
/** kişinin görseldeki yatay ortası, tepesi ve boyu (px) */
const SIT_CX = 795;
const SIT_TOP = 28;
const SIT_PERSON_H = 632;
/* NEHİRDE KAYAN AVATAR — yol haritasındakiyle AYNI: yandan oturup kayan
   kişi (zeynep-kayma.png), nehir aşağı (izleyiciye) akarken ekrana dönük
   poz (zeynep-kayma-on.png). Göbeğe varınca oturan kişiye dönüşür. */
const RIDE_SRC = "/images/zeynep-kayma.webp";
const RIDE_LEDGE = 0.95; // zemin çizgisi (kalça / eller = su yüzeyi)
const RIDE_SEAT_X = 0.4; // kalçanın yatay yeri (genişliğe oran)
const RIDE_TILT = 22; // kaydırak eğimi (derece) — yol haritasıyla aynı
/** akıntıdaki kişinin boyu (viewBox birimi) */
const RIDE_S = 190; // eskiden 150: avatar daha büyük
const RIDE_W = (RIDE_S * 680) / 364;
const RIDE_FRONT_SRC = "/images/zeynep-kayma-on.webp";
const RIDE_FRONT_LEDGE = 0.91;
const RIDE_FRONT_S = 228;
const RIDE_FRONT_W = (RIDE_FRONT_S * 360) / 457;
/** ekrana dönme: ekranda aşağı eğim / yatay oranı bu aralıkta 0 → 1 */
const RIDE_FRONT_FROM = 0.6;
const RIDE_FRONT_RANGE = 0.8;

/** nehrin genişliği (fan birimi) — yol haritasındaki nehirle ekranda
    aynı genişlikte görünür */
const RIVER_W = 250;

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
  staged = false,
}: Props) {
  const active = activeProp || finished;
  const [activeIndex, setActiveIndex] = useState(0);
  const [landed, setLanded] = useState(false);
  const [prevActive, setPrevActive] = useState(active);

  /* section pasife dönünce her şeyi sıfırla (effect yerine render sırasında) */
  if (prevActive !== active) {
    setPrevActive(active);
    if (!active) {
      setLanded(false);
      setActiveIndex(0);
    }
  }

  /* soldaki proje ekranı, fan dönüp seçili yaprağa OTURDUKTAN sonra açılır */
  const screenIndex = landed ? activeIndex : null;

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
  /* DİKEY: sahne ekranın altında; nehir ekranın EN ÜSTÜNDEN gelsin diye
     girişi, sahnenin üstünde kalan ekran yüksekliği kadar uzat */
  const stagePx = Math.min(
    vh * (PORTRAIT_FAN_MAX_H / 100),
    (vw * (1 - 2 * PANEL_SIDE) * fitW) / VIEW_H,
  );
  /* kartın viewBox yüksekliği ve ekrandaki boyu → sağ köşe yarıçapı
     (px cinsinden panelinkiyle aynı olsun diye birime çevrilir) */
  const cardViewH = (VIEW_H - 2 * VIEW_PAD_Y) * fit.tall;
  const cardPxH = portrait
    ? (stagePx * VIEW_H) / fitW // dikeyde kartın boyu = panelin genişliği
    : vh * (1 - 2 * PANEL_TOPBOT);
  const rightR = cardPxH > 0 ? (PANEL_RADIUS * cardViewH) / cardPxH : 40;
  /* proje ekranı kartın altına girmesin (kart artık şeffaf) */
  const screenRight = portrait
    ? 14
    : vw * PANEL_SIDE + (fitW - 30) * (cardPxH / cardViewH) + 16;
  const screenBottom = portrait ? vh * PANEL_TOPBOT + stagePx + 8 : 28;
  const entryExtra =
    portrait && stagePx > 0
      ? Math.max(0, (vh - stagePx - 12) / (stagePx / fitW))
      : 0;
  /* dikeyde fan yatay yarım daire olarak altta: ekran genişliğinden
     biraz taşar (yanlardaki köşeler kırpılır), fan büyük görünür.
     Sahne bir "size container": içindeki fan 100cqh ile ölçeklenir. */
  const stageStyle: CSSProperties = portrait
    ? {
        containerType: "size",
        top: "auto",
        /* kartın sağ kenarı (dikeyde alt) = cam panelin alt kenarı;
           kartın boyu (dikeyde genişlik) = panelin genişliği */
        bottom: `${PANEL_TOPBOT * 100}%`,
        height: `min(${PORTRAIT_FAN_MAX_H}svh, calc(${(1 - 2 * PANEL_SIDE) * 100}vw * ${(fitW / VIEW_H).toFixed(4)}))`,
      }
    : {
        containerType: "size",
        /* kartın üst/alt kenarı = cam panelin üst/alt kenarı */
        top: `${PANEL_TOPBOT * 100}%`,
        height: `${(1 - 2 * PANEL_TOPBOT) * 100}%`,
      };

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
            insetRight={screenRight}
            insetBottom={screenBottom}
          />
        )}
      </SciFiBackground>

      {/* Sahne: section yüksekliği, ama görünür ekran yüksekliğini asla aşmaz */}
      <div className="absolute inset-x-0 z-20" style={stageStyle}>
        <ProjectFan
          projects={PROJECTS}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onLand={(index) => {
            setActiveIndex(index);
            setLanded(true);
            onComplete?.();
          }}
          play={active}
          staged={staged}
          finished={finished}
          riderHidden={riderHidden}
          upright={portrait}
          cover={fit.cover}
          tall={fit.tall}
          hubK={fit.hubK}
          entryExtra={entryExtra}
          rightR={rightR}
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
  staged = false,
  finished = false,
  riderHidden = false,
  upright = false,
  cover = 0,
  hubK = 1,
  tall = 1,
  entryExtra = 0,
  rightR = CORNER_R_RIGHT,
}: FanProps) {
  /* ekranın sağ üst köşesi fan koordinatında: nehir tam oradan girer.
     Sayfanın geçiş dönüşümü (transform) ölçüm anında kaldırılır —
     sayfa yerindeyken köşe nerede olacaksa orası. */
  const svgRef = useRef<SVGSVGElement>(null);
  const [corner, setCorner] = useState<Corner | null>(null);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      /* Ekran ↔ fan dönüşümü, SVG'deki üç küçük işaretin ekrandaki
         yerinden çıkarılır. (getScreenCTM iPhone Safari'de üst
         kutulardaki CSS döndürmesini — dikey ekranda fan 90° dönük —
         hesaba katmıyordu: telefonda nehir köşeden gelmiyordu.) */
      const probes = svg.querySelectorAll<SVGRectElement>("[data-probe]");
      if (probes.length < 3) return;
      const sec = svg.closest<HTMLElement>(".flow-sec");
      const prev = sec?.style.transform ?? "";
      if (sec) sec.style.transform = "none";
      const c = Array.from(probes).map((p) => {
        const r = p.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      });
      if (sec) sec.style.transform = prev;
      /* fan (CX,CY) → c0, (CX+100,CY) → c1, (CX,CY+100) → c2 */
      const a = (c[1][0] - c[0][0]) / PROBE;
      const b = (c[1][1] - c[0][1]) / PROBE;
      const cc = (c[2][0] - c[0][0]) / PROBE;
      const d = (c[2][1] - c[0][1]) / PROBE;
      const det = a * d - b * cc;
      if (!det || !Number.isFinite(det)) return;
      const ia = d / det;
      const ib = -b / det;
      const ic = -cc / det;
      const id = a / det;
      const inv = {
        a: ia,
        b: ib,
        c: ic,
        d: id,
        e: CX - (ia * c[0][0] + ic * c[0][1]),
        f: CY - (ib * c[0][0] + id * c[0][1]),
      };
      const pt = (x: number, y: number): [number, number] => [
        inv.a * x + inv.c * y + inv.e,
        inv.b * x + inv.d * y + inv.f,
      ];
      const dir = (x: number, y: number): [number, number] => {
        const v = [inv.a * x + inv.c * y, inv.b * x + inv.d * y];
        const l = Math.hypot(v[0], v[1]) || 1;
        return [v[0] / l, v[1] / l];
      };
      const k = pt(window.innerWidth, 0);
      const next: Corner = { k, out: dir(1, -1), down: dir(-0.35, 1) };
      setCorner((c) =>
        c && Math.abs(c.k[0] - k[0]) < 0.5 && Math.abs(c.k[1] - k[1]) < 0.5
          ? c
          : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  /* kart geometrisi; aşağıdaki JSX bu isimleri kullanır */
  const card = useMemo(
    () => buildCard(cover, hubK, tall, upright, entryExtra, rightR, corner),
    [cover, hubK, tall, upright, entryExtra, rightR, corner],
  );
  const {
    shroudLeft,
    shroudOuter,
    shroudPath,
    fanHole,
    ledPath,
    viewLeft,
    viewW,
    viewRight,
    viewTop,
    viewH,
    streamPath,
    stream,
  } = card;
  /* kişinin nehirdeki konumu: yol uzunluğu tablosundan (DOM'a bakmadan) */
  const streamLut = useMemo(() => buildStreamLut(stream), [stream]);
  /* yol haritasındaki gibi şeritler: kenarlar, bantlar, akışlar, 0/1 */
  const rmLanes = useMemo(() => {
    const lane = (r: number) => laneFromLut(streamLut, r, RIVER_W);
    return {
      top: lane(0),
      bottom: lane(1),
      core: lane(0.375),
      dark: RM_DARK_BANDS.map(lane),
      soft: RM_SOFT_STREAMS.map(lane),
      fine: RM_FINE_STREAMS.map((st) => lane(st.f)),
      highlight: RM_HIGHLIGHTS.map(lane),
      main: RM_STREAMS.map((st) => lane(st.f)),
      binary: RM_BINARY_LANES.map(([r]) => lane(r)),
    };
  }, [streamLut]);
  /* nehrin ucunun sivrilme boyu (yol oranı) — su ince bir uçla akar */
  const streamTotal = streamLut[streamLut.length - 1].len || 1;
  const TAPER = Math.min(0.08, (RIVER_W * 1.6) / streamTotal);
  /* kişi göbeğin kenarına kadar suyun ucunda kayar */
  const rideEnd = useMemo(
    () => rideEndOf(streamLut, HUB_R * hubK + 40),
    [streamLut, hubK],
  );

  const hubT = `translate(${CX} ${CY}) scale(${hubK}) translate(${-CX} ${-CY})`;
  /* dikeyde tüm sahne 90° döner; avatar ve fotoğraflar ters dönerek dik kalır */
  const rot = upright ? 90 : 0;
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  const count = Math.max(projects.length, 1);
  const step = 360 / count;
  const bladePath = useMemo(() => createBladePath(count), [count]);

  /* fotoğraflar buz kararırken yaprak yaprak belirir */
  const lastPhotoEnd = THAW_START + (count - 1) * PHOTO_STAGGER + PHOTO_DUR;

  const spinStart =
    Math.max(
      lastPhotoEnd,
      THAW_START + THAW_DUR,
      BODY_FREEZE_START + BODY_FREEZE_DUR * 0.5 + BODY_THAW_DUR,
    ) + STEP_DELAY;
  const spinEnd = spinStart + STEP_DUR;
  const buildEnd = spinEnd + 50;

  /* SAYFA YÜKSELİRKEN (staged): fan kartı görünür ama nehir ve kişi
     henüz gelmemiştir. Oynamaya başlayınca kişi bir önceki sayfadan
     (ekranın üstünden) suyla birlikte akarak gelir.
     enterT: nehrin ekran DIŞINDA kalan uzun girişi atlanır — saat,
     kişinin ekranın üst kenarından girmek üzere olduğu andan başlar
     (yoksa sayfa boş bekliyor, kişi çok sonra beliriyordu). */
  const enterT = useMemo(() => {
    const margin = RIDE_S * 0.15;
    for (let s = 0; s < ARRIVE * 0.7; s += 20) {
      const p = pointOnLut(
        streamLut,
        rideEnd * easeInOutCubic(phase(s, 0, ARRIVE)),
      );
      const inside =
        stream.lead !== undefined
          ? rideEnd * easeInOutCubic(phase(s, 0, ARRIVE)) * streamTotal >=
            stream.lead
          : upright
            ? p.x >= viewLeft - entryExtra + margin
            : p.y >= viewTop + margin;
      if (inside) return Math.max(0, s - 60);
    }
    return 0;
  }, [
    streamLut,
    rideEnd,
    upright,
    viewLeft,
    viewTop,
    entryExtra,
    stream.lead,
    streamTotal,
  ]);
  const [tState, setT] = useState(() => (finished ? buildEnd : 0));
  const [fanRot, setFanRot] = useState(FACE_ANGLE - activeIndex * step);
  const [prevPlay, setPrevPlay] = useState(play);

  /* play kapanınca sahneyi başa al; açılınca giriş karesinden başla
     (effect yerine render sırasında: ilk karede boş sahne görünmez) */
  if (prevPlay !== play) {
    setPrevPlay(play);
    if (!play) {
      setT(0);
      setFanRot(FACE_ANGLE - activeIndex * step);
    } else {
      setT(finished ? buildEnd : enterT);
    }
  }

  const t = play ? tState : 0;
  const visible = play || staged;

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

    /* finished: zaman çizelgesinin sonundan başla → ilk karede son hal.
       Kendi saati: bir karede en fazla MAX_FRAME_MS ilerler (telefon bir
       an takılırsa kişi nehirde ileri ışınlanmaz). */
    let clock = finished ? buildEnd : enterT;
    let last = performance.now();
    let raf = 0;
    let spinStarted = false;
    let landed = false;
    let readyFired = false;
    let spinFrom = fanRotRef.current;
    let landTarget = 0;

    const tick = (now: number) => {
      clock += Math.min(MAX_FRAME_MS, Math.max(0, now - last));
      last = now;
      const elapsed = clock;
      setT(Math.min(elapsed, buildEnd));

      // Proje fotoğrafı, avatar göbeğe oturduktan sonra açılsın
      if (!readyFired && elapsed >= SEATED) {
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
    // enterT yalnızca başlangıçta okunur (oynarken değişirse sahne baştan başlamasın)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, finished, buildEnd, spinStart, spinEnd, count, step]);

  /* kişi suyun ucunda: su kişinin hemen önünde akar; kişi göbeğe
     varınca su da göbeğe dolar */
  const rideP = rideEnd * easeInOutCubic(phase(t, 0, ARRIVE));
  const streamP =
    t < ARRIVE
      ? Math.min(1, rideP + 0.012)
      : lerp(
          rideEnd + 0.012,
          1,
          easeOutCubic(phase(t, ARRIVE, STREAM_TAIL_DUR)),
        );
  /* kişi göbeğe varınca nehrin kuyruğu da göbeğe çekilir (su fana dolar) */
  const streamTail = easeInOutCubic(phase(t, ARRIVE + 200, 1000));
  const streamOpacity = 1 - phase(t, ARRIVE + 1000, 250);
  /* maskede görünen parça: kuyruk → baş */
  const streamDash = `${Math.max(0, streamP - streamTail)} 3`;
  const streamOffset = -streamTail;

  /* ==============================================================
     KİŞİ — suyla kayarak gelir, girdapta bir tur dönüp merkeze iner,
     aynı fotoğraf etrafında halka kapanarak göbekte portreye oturur
  ============================================================== */
  const pointOn = (f: number) => pointOnLut(streamLut, f);

  /* 1) akıntıda kayma: göbeğin kenarına kadar (rideP yukarıda) */
  /* 2) ZIPLAMA: suyun ucundan sıçrar, yay çizerek göbeğin ortasına iner.
     Önce hafifçe çöker (hazırlık), havada süzülür, inince yaylanır. */
  const spiralP = phase(t, ARRIVE, SPIRAL_DUR);
  const jumpE = easeInOutCubic(spiralP);
  const p0 = pointOn(rideEnd);
  /* ekranda "yukarı" yönü: masaüstünde -y, dikeyde (fan 90° dönük) -x */
  const upX = upright ? -1 : 0;
  const upY = upright ? 0 : -1;
  const jumpAt = (e: number, raw: number) => {
    const lift = Math.sin(Math.PI * clamp(raw)) * JUMP_H;
    return {
      x: lerp(p0.x, CX, e) + upX * lift,
      y: lerp(p0.y, CY, e) + upY * lift,
    };
  };
  const personPos = spiralP > 0 ? jumpAt(jumpE, spiralP) : pointOn(rideP);
  const ahead =
    spiralP > 0
      ? jumpAt(Math.min(1, jumpE + 0.04), Math.min(1, spiralP + 0.04))
      : pointOn(rideP + 0.02);
  const headDx = ahead.x - personPos.x;
  const headDy = ahead.y - personPos.y;
  /* köpük fan koordinatında; bakış yönü ve eğim EKRANA göre */
  const headAngle = Math.atan2(headDy, headDx);
  const screenDx = upright ? -headDy : headDx;
  const screenDy = upright ? headDx : headDy;
  /* nehir ekranda aşağı (izleyiciye) akarken ekrana dönük poz (0..1);
     zıplarken yandan poza döner */
  const frontRatio = screenDy / (Math.abs(screenDx) || 0.001);
  const facing =
    clamp((frontRatio - RIDE_FRONT_FROM) / RIDE_FRONT_RANGE) *
    (1 - Math.min(1, spiralP * 3));

  /* kişi ekranın üstünden girerken zaten tam görünür (soluklaşma yok) */
  const personIn = t > 0 ? 1 : 0;
  /* 3) iniş: havadaki kayan avatar, yere değdiği an oturan kişiye döner */
  const settleP = easeInOutCubic(phase(t, ARRIVE + SPIRAL_DUR * 0.82, 220));
  /* sıçramadan önce çökme, inince yaylanma (dikey ölçek) */
  const crouch = bump(phase(t, ARRIVE - 160, 220)) * 0.14;
  const landSquash = bump(phase(t, ARRIVE + SPIRAL_DUR * 0.95, 320)) * 0.12;
  /* 4) oturma anı: halka kapanır, ışık dalgası yayılır */
  const seatT = SEATED;
  const landPulse = phase(t, seatT, ms(900));

  /* akıntıda sallanma (zıplarken ve oturunca durur) ve gidiş yönüne eğilme */
  const bob = Math.sin(t / 90) * 7 * (1 - Math.min(1, spiralP * 4));
  const ripple = (t % 520) / 520;

  const PF = PERSON_FINAL_SCALE;

  /* göbekteki oturan kişi: portre dairesinin içinde */
  const clipR = AVATAR_R * PF;
  const clipCy = 0;
  const sitH = AVATAR_R * PF * 2 * 0.9;

  const hubP = easeOutCubic(phase(t, HUB_START, HUB_DUR));
  const hubFlash = bump(phase(t, FREEZE_START - 150, 500));

  /* su göbekten fan yuvasına yayılır */
  const fillP = easeOutCubic(phase(t, FILL_START, FILL_DUR));
  const waterR = lerp(HUB_R * hubK, CUT_R, fillP);
  /* buz cephesi: göbekten dışa — arkasında kalan yapraklar donmuştur */
  const iceP = easeInOutCubic(phase(t, FREEZE_START, FREEZE_DUR));
  const iceR = lerp(HUB_R * hubK * 0.8, CUT_R + 30, iceP);
  /* buz kararıp koyu cama/metale döner */
  const thawP = easeInOutCubic(phase(t, THAW_START, THAW_DUR));
  const materialP = thawP;
  /* kart gövdesi: aynı donma, fan deliğinin kenarından dışa */
  const bodyIceP = easeInOutCubic(phase(t, BODY_FREEZE_START, BODY_FREEZE_DUR));
  const bodyR = lerp(CUT_R, BODY_REACH, bodyIceP);
  const bodyThaw = easeInOutCubic(
    phase(t, BODY_FREEZE_START + BODY_FREEZE_DUR * 0.5, BODY_THAW_DUR),
  );
  /* donma cephelerinin parlaklığı (ortada en güçlü) */
  const iceFront = bump(iceP);
  const bodyFront = bump(bodyIceP);

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
      className="pointer-events-none absolute"
      style={
        upright
          ? {
              /* döndürülmeden önceki kutu: genişliği sahnenin yüksekliği.
                 90° dönünce yatay yarım fan olur, alt kenara oturur */
              left: "50%",
              top: "50%",
              width: "100cqh",
              aspectRatio: `${viewW} / ${viewH}`,
              transform: "translate(-50%, -50%) rotate(90deg)",
              visibility: visible ? "visible" : "hidden",
            }
          : {
              top: 0,
              height: "100%",
              /* kartın sağ kenarı = cam panelin sağ kenarı */
              right: `${PANEL_SIDE * 100}%`,
              width: `calc(100cqh * ${(viewW / viewH).toFixed(4)})`,
              visibility: visible ? "visible" : "hidden",
            }
      }
    >
      <svg
        ref={svgRef}
        viewBox={`${viewLeft} ${viewTop} ${viewW} ${viewH}`}
        className="size-full overflow-visible"
      >
        {/* ölçüm işaretleri (görünmez): ekran ↔ fan dönüşümü için */}
        {[
          [0, 0],
          [PROBE, 0],
          [0, PROBE],
        ].map(([dx, dy]) => (
          <rect
            key={`${dx}-${dy}`}
            data-probe
            x={CX + dx - 1}
            y={CY + dy - 1}
            width={2}
            height={2}
            fill="none"
            aria-hidden
          />
        ))}
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
            x={-6000}
            y={-6000}
            width={12000}
            height={12000}
          >
            {/* gövde: uçtan biraz geride tam genişlik */}
            <path
              d={streamPath}
              fill="none"
              stroke="#fff"
              strokeWidth={RIVER_W + 14}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${Math.max(0, streamP - streamTail - (streamP < 1 ? TAPER : 0))} 3`}
              strokeDashoffset={streamOffset}
            />
            {/* uç: su öne doğru incelerek akar (sivri, yuvarlak burun) */}
            {streamP < 1 &&
              [0.78, 0.55, 0.32].map((w, k) => {
                const a = Math.max(streamTail, streamP - TAPER * (1 - k / 3));
                const b = Math.max(a, streamP - TAPER * (1 - (k + 1) / 3));
                return (
                  <path
                    key={k}
                    d={streamPath}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={(RIVER_W + 14) * w}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={`${b - a + 0.004} 3`}
                    strokeDashoffset={-a}
                  />
                );
              })}
          </mask>

          {/* yol haritası nehrinin renkleri */}
          <linearGradient id={id("rmWater")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#061f3a" />
            <stop offset=".22" stopColor="#0a2c52" />
            <stop offset=".46" stopColor="#0e3b6b" />
            <stop offset=".66" stopColor="#0b3058" />
            <stop offset=".84" stopColor="#072444" />
            <stop offset="1" stopColor="#04162e" />
          </linearGradient>
          <linearGradient id={id("rmCore")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={RM.steel} stopOpacity=".08" />
            <stop offset=".38" stopColor={RM.edge} stopOpacity=".2" />
            <stop offset=".55" stopColor={RM.ice} stopOpacity=".26" />
            <stop offset=".74" stopColor={RM.steel} stopOpacity=".12" />
            <stop offset="1" stopColor="#0f2f58" stopOpacity=".03" />
          </linearGradient>

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

          {/* kartın sağ kenarı: fanın sağ yarısı burada biter */}
          <clipPath id={id("cardRight")}>
            <rect x={-6000} y={-6000} width={6000 + viewRight} height={12000} />
          </clipPath>

          {/* donma cepheleri: göbekten dışa büyüyen daireler */}
          <clipPath id={id("freeze")}>
            <circle cx={CX} cy={CY} r={iceR} />
          </clipPath>
          <clipPath id={id("bodyFreeze")}>
            <circle cx={CX} cy={CY} r={bodyR} />
          </clipPath>

          {/* buz: açık buz mavisi, yarı saydam */}
          <linearGradient id={id("ice")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f2f8ff" stopOpacity=".85" />
            <stop offset=".45" stopColor="#bcdcf6" stopOpacity=".6" />
            <stop offset="1" stopColor="#5f9fd6" stopOpacity=".55" />
          </linearGradient>

          <clipPath id={id("shroudClip")}>
            <path d={shroudPath} fillRule="evenodd" clipRule="evenodd" />
          </clipPath>

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

          {/* hero cam panelinin dolgusu (--panel-fill) — kartın kendi
              ortasına göre: koyu orta → açık lacivert kenar */}
          <radialGradient
            id={id("panelFill")}
            cx=".58"
            cy=".5"
            r=".72"
            gradientTransform="translate(.58 .5) scale(1 .9) translate(-.58 -.5)"
          >
            <stop offset="0" stopColor="rgb(var(--c-010612,2,4,18))" />
            <stop offset=".4" stopColor="rgb(var(--c-04142a,6,10,28))" />
            <stop offset=".7" stopColor="rgb(var(--panel-3,14,24,48))" />
            <stop offset=".9" stopColor="rgb(var(--panel-2,28,48,82))" />
            <stop offset="1" stopColor="rgb(var(--panel-glow-1,48,80,120))" />
          </radialGradient>

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

        {/* NEHİR — yol haritasındakiyle aynı: koyu taban, mavi su, iç cam,
            akan ışık çizgileri ve küçük 0/1 yazıları; ucu sivri ve köpüklü */}
        {streamOpacity > 0 && (
          <g opacity={streamOpacity}>
            {/* suyun çevresindeki hafif ışık */}
            <path
              d={streamPath}
              fill="none"
              stroke="#2f8fe0"
              strokeWidth={RIVER_W + 90}
              strokeOpacity=".05"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={streamDash}
              strokeDashoffset={streamOffset}
            />

            <g mask={url("streamMask")}>
              {/* dere tabanı + su */}
              <path
                d={streamPath}
                fill="none"
                stroke="#081c36"
                strokeWidth={RIVER_W + 12}
                strokeLinecap="round"
              />
              <path
                d={streamPath}
                fill="none"
                stroke={url("rmWater")}
                strokeWidth={RIVER_W}
                strokeLinecap="round"
              />

              {/* koyu derinlik bantları */}
              {rmLanes.dark.map((d, i) => (
                <path
                  key={`d${i}`}
                  d={d}
                  fill="none"
                  stroke="#04142b"
                  strokeWidth={34 * RM_K}
                  strokeOpacity=".2"
                />
              ))}

              {/* iç cam */}
              <path
                d={rmLanes.core}
                fill="none"
                stroke={url("rmCore")}
                strokeWidth={RIVER_W * 0.45}
                strokeOpacity=".75"
              />

              {/* yumuşak akışlar */}
              {rmLanes.soft.map((d, i) => {
                const st: CSSVars = { "--d": `${7 + i}s` };
                return (
                  <path
                    key={`s${i}`}
                    d={d}
                    fill="none"
                    stroke={RM.edge}
                    strokeWidth={5 * RM_K}
                    strokeOpacity=".25"
                    strokeDasharray={`${(320 + i * 100) * RM_K} ${(280 + i * 70) * RM_K}`}
                    strokeLinecap="round"
                    className="pf-flow"
                    style={st}
                  />
                );
              })}

              {/* ince akışlar */}
              {rmLanes.fine.map((d, i) => {
                const f = RM_FINE_STREAMS[i];
                const st: CSSVars = { "--d": `${f.duration}s` };
                return (
                  <path
                    key={`f${i}`}
                    d={d}
                    fill="none"
                    stroke={RM.iceSoft}
                    strokeWidth={f.width}
                    strokeOpacity={f.opacity}
                    strokeDasharray={f.dash}
                    strokeLinecap="round"
                    className="pf-flow"
                    style={st}
                  />
                );
              })}

              {/* parlak çizgiler */}
              {rmLanes.highlight.map((d, i) => {
                const st: CSSVars = { "--d": `${6 + i}s` };
                return (
                  <path
                    key={`h${i}`}
                    d={d}
                    fill="none"
                    stroke={RM.ice}
                    strokeWidth={1.2 * RM_K}
                    strokeOpacity=".62"
                    strokeDasharray={`${(500 + i * 150) * RM_K} ${(380 + i * 100) * RM_K}`}
                    strokeLinecap="round"
                    className="pf-flow"
                    style={st}
                  />
                );
              })}

              {/* ana akışlar */}
              {rmLanes.main.map((d, i) => {
                const m = RM_STREAMS[i];
                const st: CSSVars = { "--d": `${m.duration}s` };
                return (
                  <path
                    key={`m${i}`}
                    d={d}
                    fill="none"
                    stroke={i % 3 === 0 ? RM.edge : RM.steel}
                    strokeWidth={m.width}
                    strokeOpacity={m.opacity}
                    strokeDasharray={m.dash}
                    strokeLinecap="round"
                    className="pf-flow"
                    style={st}
                  />
                );
              })}

              {/* 0/1 — yol haritasıyla aynı boyut ve renk */}
              {rmLanes.binary.map((d, i) => (
                <g key={`b${i}`}>
                  <path id={id(`rmLane${i}`)} d={d} fill="none" />
                  <text
                    fontFamily={RM_MONO}
                    fontSize={RM_BINARY_SIZE}
                    letterSpacing={RM_BINARY_SPACING}
                    fill={RM.ice}
                    opacity={RM_BINARY_LANES[i][1]}
                  >
                    <textPath
                      href={`#${id(`rmLane${i}`)}`}
                      startOffset={RM_BINARY_LANES[i][2]}
                    >
                      {RM_BINARY[i]}
                    </textPath>
                  </text>
                </g>
              ))}

              {/* dere kenarları */}
              <path
                d={rmLanes.top}
                fill="none"
                stroke={RM.steel}
                strokeWidth="1.4"
                strokeOpacity=".35"
              />
              <path
                d={rmLanes.bottom}
                fill="none"
                stroke={RM.steelDim}
                strokeWidth="1.4"
                strokeOpacity=".3"
              />
            </g>

            {/* akan ucun köpüğü: suyun önünde yumuşak ışık */}
            {streamP < 1 &&
              (() => {
                const hp = pointOn(Math.max(0, streamP - TAPER * 0.15));
                return (
                  <g pointerEvents="none">
                    <circle
                      cx={hp.x}
                      cy={hp.y}
                      r={RIVER_W * 0.42}
                      fill={RM.ice}
                      opacity=".1"
                    />
                    <circle
                      cx={hp.x}
                      cy={hp.y}
                      r={RIVER_W * 0.2}
                      fill={RM.ice}
                      opacity=".18"
                    />
                  </g>
                );
              })()}
          </g>
        )}

        {/* NEHİR DIŞINDAKİ HER ŞEY kartın sağ kenarında kırpılır */}
        <g clipPath={url("cardRight")}>
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

          {/* FAN YUVASI — su göbekten yayılıp yuvayı doldurur; donunca
            koyu zemine döner (arkadaki proje fotoğrafı görünmez) */}
          {fillP > 0 && (
            <g clipPath={cover > 0 ? url("fanHole") : undefined}>
              <circle cx={CX} cy={CY} r={waterR} fill="#061f3a" />
              <circle
                cx={CX}
                cy={CY}
                r={waterR}
                fill={url("water")}
                opacity={0.9 * (1 - thawP)}
              />
              {/* suyun kenarı + yayılan halkalar */}
              {iceP < 1 && (
                <>
                  <circle
                    cx={CX}
                    cy={CY}
                    r={waterR}
                    fill="none"
                    stroke="#8cc4f2"
                    strokeWidth="3"
                    strokeOpacity={0.55 * (1 - iceP)}
                  />
                  {[0, 0.5].map((o) => {
                    const q = (t / 900 + o) % 1;
                    return (
                      <circle
                        key={o}
                        cx={CX}
                        cy={CY}
                        r={lerp(HUB_R * hubK, waterR, q)}
                        fill="none"
                        stroke="#cfe6ff"
                        strokeWidth="1.5"
                        strokeOpacity={(1 - q) * 0.35 * (1 - iceP)}
                      />
                    );
                  })}
                </>
              )}

              {/* FAN YAPRAKLARI — buz cephesinin arkasında donmuş halde belirir */}
              <g clipPath={url("freeze")}>
                <g style={fanStyle}>
                  {projects.map((project, i) => {
                    /* yelpaze gibi açılır: katlı halden kendi açısına */
                    const unfold =
                      i === 0
                        ? 1
                        : easeOutBack(
                            phase(
                              t,
                              FILL_START + UNFOLD_START + i * UNFOLD_STAGGER,
                              UNFOLD_DUR,
                            ),
                          );
                    const angle = i * step * unfold;
                    const photoP = easeInOutCubic(
                      phase(t, THAW_START + i * PHOTO_STAGGER, PHOTO_DUR),
                    );
                    const isActive = done && i === activeIndex;
                    const imgRotation = -fanRotation - angle - rot;

                    return (
                      <g
                        key={project.id}
                        transform={`rotate(${angle} ${CX} ${CY})`}
                        className={
                          done ? "pointer-events-auto cursor-pointer" : ""
                        }
                        /* tıklayınca tarayıcının mavi odak çerçevesi çıkmasın
                           (seçili yaprak zaten altın kenarla belli oluyor) */
                        style={{ outline: "none" }}
                        role="button"
                        tabIndex={done ? 0 : -1}
                        aria-label={project.title}
                        aria-pressed={isActive}
                        onClick={() => {
                          if (done) onSelect(i);
                        }}
                        onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
                          if (!done || !["Enter", " "].includes(event.key))
                            return;
                          event.preventDefault();
                          onSelect(i);
                        }}
                      >
                        {/* koyu cam (buz karardıkça) */}
                        <path
                          d={bladePath}
                          fill={url("blade")}
                          opacity={thawP}
                        />

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

                        {/* BUZ: açık mavi kristal + çatlak çizgileri, kararınca söner */}
                        {thawP < 1 && (
                          <>
                            <path
                              d={bladePath}
                              fill={url("ice")}
                              opacity={1 - thawP}
                            />
                            <g clipPath={url(`blade-${i}`)}>
                              <path
                                d={FROST_PATH}
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeOpacity={0.75 * (1 - thawP)}
                              />
                            </g>
                            <path
                              d={bladePath}
                              fill="none"
                              stroke="#eef5ff"
                              strokeWidth="1.6"
                              strokeOpacity={0.8 * (1 - thawP)}
                            />
                          </>
                        )}

                        <path
                          d={bladePath}
                          fill={url("glass")}
                          opacity={materialP * (isActive ? 0.05 : 0.42)}
                        />
                        {/* pasif yapraklar karartılır → aktif olan öne çıkar */}
                        {!isActive && (
                          <path
                            d={bladePath}
                            fill="#020a18"
                            opacity={materialP * (done ? 0.28 : 0)}
                            style={{ transition: "opacity 400ms" }}
                          />
                        )}

                        {/* aktif yaprak: altın parıltılı kalın kenar */}
                        {isActive && (
                          <path
                            d={bladePath}
                            fill="none"
                            stroke={GOLD_LIGHT}
                            strokeWidth="14"
                            strokeOpacity=".35"
                            strokeLinejoin="round"
                            filter={url("soft")}
                          />
                        )}
                        <path
                          d={bladePath}
                          fill="none"
                          stroke={isActive ? GOLD_LIGHT : "#7fb6e8"}
                          strokeWidth={isActive ? 4 : 1}
                          strokeLinejoin="round"
                          strokeOpacity={materialP * (isActive ? 1 : 0.2)}
                        />
                      </g>
                    );
                  })}
                </g>
              </g>

              {/* buz cephesi: kristal dişli parlak halka */}
              {iceP > 0 && iceP < 1 && (
                <>
                  <circle
                    cx={CX}
                    cy={CY}
                    r={iceR}
                    fill="none"
                    stroke="#eef5ff"
                    strokeWidth="26"
                    strokeOpacity={0.4 * iceFront}
                    strokeDasharray="2 9"
                  />
                  <circle
                    cx={CX}
                    cy={CY}
                    r={iceR}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeOpacity={0.9 * iceFront}
                  />
                </>
              )}
            </g>
          )}

          {/* FAN METAL MERKEZİ */}
          {materialP > 0 && (
            <g opacity={materialP} transform={hubT}>
              <circle
                cx={CX}
                cy={CY}
                r={HUB_R + 8}
                fill="#010910"
                opacity=".8"
              />

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

              {/* KAYAN AVATAR — yol haritasındakiyle aynı; göbekte söner */}
              {settleP < 1 && (
                <g opacity={1 - settleP} transform={`rotate(${-rot})`}>
                  <g transform={`scale(1 ${1 - crouch})`}>
                    {/* yandan: kaydırakta kayar gibi eğik, hep ileri bakar;
                        ekrana dönerken daralarak söner */}
                    <g
                      opacity={1 - facing}
                      transform={`rotate(${RIDE_TILT}) scale(${1 - 0.65 * facing} 1)`}
                    >
                      <image
                        href={RIDE_SRC}
                        x={-RIDE_W * RIDE_SEAT_X}
                        y={-RIDE_S * RIDE_LEDGE}
                        width={RIDE_W}
                        height={RIDE_S}
                        preserveAspectRatio="none"
                      />
                    </g>
                    {/* ekrana dönük: genişleyerek belirir */}
                    {facing > 0 && (
                      <g
                        opacity={facing}
                        transform={`scale(${0.35 + 0.65 * facing} 1)`}
                      >
                        <image
                          href={RIDE_FRONT_SRC}
                          x={-RIDE_FRONT_W / 2}
                          y={-RIDE_FRONT_S * RIDE_FRONT_LEDGE}
                          width={RIDE_FRONT_W}
                          height={RIDE_FRONT_S}
                          preserveAspectRatio="none"
                        />
                      </g>
                    )}
                  </g>
                </g>
              )}

              {/* OTURAN KİŞİ — göbeğin ortasında belirir, ayak sallar */}
              {settleP > 0 && (
                <g
                  opacity={settleP}
                  transform={`rotate(${-rot}) translate(0 ${AVATAR_R * PF * 0.9}) scale(${1 + landSquash * 0.6} ${1 - landSquash}) translate(0 ${-AVATAR_R * PF * 0.9})`}
                >
                  <g clipPath={url("riderClip")}>
                    <SwingingLegs personH={sitH} cy={0} uid={id("legs")} />
                    <rect
                      x={-AVATAR_R}
                      y={-AVATAR_R}
                      width={AVATAR_R * 2}
                      height={AVATAR_R * 2}
                      fill={url("scan")}
                    />
                  </g>
                </g>
              )}

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

          {/* EKRAN KARTI GÖVDESİ — fan deliğinin kenarından dışa doğru donarak
            oluşur: önce buz, sonra koyu lacivert metale döner */}
          {bodyIceP > 0 && (
            <g clipPath={url("bodyFreeze")}>
              {/* GÖVDE — hero'daki cam panelin dolgusunun aynısı: ortası
                  koyu, kenarlara doğru açılan lacivert (paletin --panel-*
                  tonları), kartın kendi ortasına göre */}
              <path d={shroudPath} fillRule="evenodd" fill={url("panelFill")} />

              {/* panel kenarı: ince açık çizgi + içe doğru hafif ışık
                  (hero panelindeki --panel-rim gibi) */}
              <g clipPath={url("shroudClip")}>
                <path
                  d={shroudOuter}
                  fill="none"
                  stroke="rgb(var(--c-5fb8d0,161,196,217))"
                  strokeWidth="46"
                  strokeOpacity=".16"
                  filter={url("soft")}
                />
              </g>
              <path
                d={shroudOuter}
                fill="none"
                stroke="rgb(var(--c-cfe6ff,200,226,240))"
                strokeWidth="1.6"
                strokeOpacity=".45"
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
                    stroke="rgb(var(--metal-1,44,72,112))"
                    strokeWidth="8"
                  />
                  <path
                    d={fanHole}
                    fill="none"
                    stroke="rgb(var(--c-46beff,70,190,255))"
                    strokeWidth="1.2"
                    strokeOpacity=".3"
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
                    stroke="rgb(var(--metal-1,44,72,112))"
                    strokeWidth="18"
                  />

                  <circle
                    cx={CX}
                    cy={CY}
                    r={CUT_R + 4}
                    fill="none"
                    stroke="rgb(var(--c-46beff,70,190,255))"
                    strokeWidth="1.2"
                    strokeOpacity=".3"
                  />
                </>
              )}

              {SCREW_ANGLES.map((angle) => {
                const p = polar(CUT_R + 46, angle);
                /* kapak kenarının dışında kalan vida çizilmez */
                if (p.x < shroudLeft + 40) return null;

                return (
                  <g key={angle} transform={`translate(${p.x} ${p.y})`}>
                    <circle r="15" fill="rgb(var(--c-04142a,6,12,30))" />
                    <circle
                      r="10"
                      fill="rgb(var(--metal-1,44,72,112))"
                      stroke="rgb(var(--c-46beff,70,190,255))"
                      strokeOpacity=".35"
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
                stroke="rgb(var(--c-46beff,70,190,255))"
                strokeWidth="1.5"
                strokeOpacity=".3"
              />
            </g>
          )}
          {/* gövdenin buz katmanı + donma cephesi */}
          {bodyIceP > 0 && bodyThaw < 1 && (
            <g clipPath={url("shroudClip")}>
              <g clipPath={url("bodyFreeze")}>
                <path
                  d={shroudPath}
                  fillRule="evenodd"
                  fill={url("ice")}
                  opacity={0.9 * (1 - bodyThaw)}
                />
              </g>
              {bodyIceP < 1 && (
                <>
                  <circle
                    cx={CX}
                    cy={CY}
                    r={bodyR}
                    fill="none"
                    stroke="#eef5ff"
                    strokeWidth="30"
                    strokeOpacity={0.35 * bodyFront}
                    strokeDasharray="2 10"
                  />
                  <circle
                    cx={CX}
                    cy={CY}
                    r={bodyR}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeOpacity={0.85 * bodyFront}
                  />
                </>
              )}
            </g>
          )}
        </g>
      </svg>

      <style>{`
        @keyframes pfFlow { to { stroke-dashoffset: -1000; } }
        .pf-flow { animation: pfFlow var(--d) linear infinite; }
        @media (prefers-reduced-motion: reduce) { .pf-flow { animation: none; } }
      `}</style>
    </div>
  );
}

/* Proje ekranı: cam panelin kenarlarından boşluk (px) — üstte port için
   biraz daha fazla. Telefonda daha dar. */
const SCREEN_GAP = "0 32px 28px 32px";
const SCREEN_GAP_MOBILE = "0 14px 14px 14px";
/** proje bilgisinin başladığı yer (px); fotoğraf bilginin hemen altından
    başlayıp kalan alanı doldurur */
const INFO_TOP = 24;
const INFO_TOP_MOBILE = 44;
const SCREEN_RADIUS = 18;

function ProjectScreen({
  project,
  index,
  total,
  portrait = false,
  insetRight,
  insetBottom,
}: {
  project: Project;
  index: number;
  total: number;
  portrait?: boolean;
  /** ekranın sağ / alt kenarı (px) — fan kartının altına girmesin */
  insetRight?: number;
  insetBottom?: number;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const [main] = project.images;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* EKRAN ALANI: cam panelin içinde, kenarlardan boşluklu bir ekran
          (fan sağda bunun önünde durur) */}
      {/* PROJE BİLGİSİ (üstte) + FOTOĞRAF EKRANI (altında, kalan tüm alan) */}
      <div
        className="absolute flex flex-col"
        style={{
          inset: portrait ? SCREEN_GAP_MOBILE : SCREEN_GAP,
          top: portrait ? INFO_TOP_MOBILE : INFO_TOP,
          ...(insetRight !== undefined && { right: insetRight }),
          ...(insetBottom !== undefined && { bottom: insetBottom }),
        }}
      >
        <div
          key={`t-${project.id}`}
          className="shrink-0"
          style={{ maxWidth: portrait ? "100%" : "min(46vw, 640px)" }}
        >
          <div
            className="ps-line font-mono text-xs tracking-[.14em] text-[#a8eef6]"
            /* telefonda sol üstteki menü düğmesinin yanından başlar */
            style={{ "--i": 0, paddingLeft: portrait ? 56 : 0 } as CSSVars}
          >
            [ PROJE {pad(index + 1)} / {pad(total)} ]
          </div>
          <h2
            className={`ps-line mt-1 font-semibold text-[#c4f7fb] ${portrait ? "text-xl" : "text-[28px] leading-tight"}`}
            style={
              {
                fontFamily: "var(--font-display), ui-sans-serif",
                "--i": 1,
              } as CSSVars
            }
          >
            {project.title}
          </h2>
          {project.description && (
            <p
              className={`ps-line mt-1 line-clamp-2 text-[#a8eef6]/75 ${portrait ? "text-xs" : "text-sm"}`}
              style={{ "--i": 2 } as CSSVars}
            >
              {project.description}
            </p>
          )}
          {project.tags && project.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {project.tags.map((tag, ti) => (
                <span
                  key={tag}
                  style={{ "--i": 3 + ti * 0.5 } as CSSVars}
                  className="ps-line rounded-full border border-[#a8eef6]/25 bg-[#a8eef6]/5 px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-[#a8eef6]/85"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          className="ps-screen relative mt-3 min-h-0 flex-1 overflow-hidden"
          style={{
            borderRadius: SCREEN_RADIUS,
            border: "1px solid rgba(var(--c-cfe6ff,207,230,255),.22)",
            boxShadow: "0 18px 50px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.35)",
          }}
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

          {/* camın içinde: kenarlardan hafif koyulaşma */}
          <div
            className="absolute inset-0"
            style={{
              borderRadius: "inherit",
              boxShadow: "inset 0 0 50px rgba(3,11,26,.45)",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes beam {
          from { transform: translateY(-50%) scaleX(0); opacity: 1; }
          to   { transform: translateY(-50%) scaleX(1); opacity: .25; }
        }

        /* Ekran açılışı: yumuşak — ortadan dikeyde açılır, hafif parlar,
           ani parlama / titreşim yok */
        .ps-screen {
          animation: ps-on 1.1s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes ps-on {
          0%   { clip-path: inset(46% 6% 46% 6% round 18px); opacity: 0; filter: brightness(1.5); }
          35%  { opacity: 1; }
          100% { clip-path: inset(0 0 0 0 round 18px); opacity: 1; filter: brightness(1); }
        }

        /* Proje değişimi: yumuşak belirme + hafif yakınlaşma */
        .ps-img {
          animation: ps-img .9s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes ps-img {
          0%   { opacity: 0; transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        /* eski glitch şeritleri yerine tek, yumuşak ışık süzmesi */
        .ps-glitch {
          background: linear-gradient(105deg, transparent 30%, rgba(207,230,255,.18) 48%, rgba(70,190,255,.12) 52%, transparent 70%);
          mix-blend-mode: screen;
          animation: ps-glitch 1.2s cubic-bezier(.4,0,.2,1) .15s both;
        }
        @keyframes ps-glitch {
          from { opacity: 1; transform: translateX(-60%); }
          to   { opacity: 0; transform: translateX(60%); }
        }

        /* Tarama ışığı üstten alta bir kez, yavaşça geçer */
        .ps-scan {
          top: -20%;
          background: linear-gradient(to bottom, transparent, rgba(207,230,255,.1) 60%, rgba(207,230,255,.22) 92%, transparent);
          animation: ps-scan 1.4s cubic-bezier(.4,0,.2,1) .3s both;
        }
        @keyframes ps-scan {
          from { transform: translateY(0); opacity: 1; }
          to   { transform: translateY(650%); opacity: 0; }
        }

        /* Başlık, açıklama, etiketler sırayla, yumuşakça yerine oturur */
        .ps-line {
          animation: ps-title .7s cubic-bezier(.22,1,.36,1) both;
          animation-delay: calc(80ms + var(--i, 0) * 110ms);
        }
        @keyframes ps-title {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ps-screen, .ps-img, .ps-glitch, .ps-scan, .ps-line { animation: none; }
        }
      `}</style>
    </div>
  );
}

/* ================================================================
   OTURAN KİŞİ — AYAK SALLAMA (zeynep-oturma.png)
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
        /* SVG <animateTransform> yerine CSS animasyonu: gizli bölümde
           durabilir (SMIL hiç durmuyordu) */
        const swing = {
          transformBox: "view-box",
          transformOrigin: `${px}px ${py}px`,
          "--a0": `${-l.amp}deg`,
          "--a1": `${l.amp}deg`,
          animation: `svgLegSwing ${LEG_SWING_S / 2}s cubic-bezier(.45,0,.55,1) ${l.delay} infinite alternate`,
        } as CSSProperties;
        return (
          <g key={i} style={swing}>
            <g clipPath={`url(#${uid}-leg${i})`}>{img}</g>
          </g>
        );
      })}
    </>
  );
}
