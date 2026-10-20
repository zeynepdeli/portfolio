"use client";

import { useSyncExternalStore } from "react";

/* =====================================================
   ÇİP YERLEŞİMİ + DEVRE ÇİZGİSİ GEOMETRİSİ
   Çip, profil maskesi, cam panel ve devre çizgileri AYNI ekran
   koordinatlarını kullansın diye her şey burada hesaplanır.
   ChipPlatform da ölçülerini buradaki CHIP sabitlerinden alır.
===================================================== */

export type Pt = [number, number];

/** ChipPlatform ile ortak 3D ölçüler */
export const CHIP = {
  perspective: 1400,
  /** plaka kenarı = size × plateRatio */
  plateRatio: 1 / 1.55,
  /** cam gövde kalınlığı (px, 1440×900'deki çipte) — gerçek değer çip
   *  boyutuyla orantılı: chipThick(size) */
  thick: 30,
  /** pinlerin dışarı uzunluğu (px, referans çipte) — gerçek değer
   *  chipLead(size); çip küçülünce pinler de orantılı kısalır */
  lead: 20,
  /** iç yükseltilmiş plakanın cam yüzeyden yüksekliği (px) */
  innerZ: 6,
  /** soket halkasının (orta dairenin) iç yarıçapı / plaka kenarı */
  ringRatio: 0.27,
};

/* =====================================================
   PİNLER — SocialChip'teki pinlerin BİREBİR aynısı:
   2px bacak, 3px boşluk (5px adım), 7px boy. Çipin her kenarı
   boyunca (kenarın %7–%93'ü) dizilirler.
   Gövde kalınlığı ise çip boyutuyla ORANTILI (küçük ekranda
   kalınlık çipe göre kocaman kalmasın).
===================================================== */
/** Referans çip boyutu (1440×900 ekranda) */
const REF_CHIP = 960;
/** Sosyal pin ölçüleri × PIN_SCALE (px). Şekil/renk sosyal pinlerle
 *  aynı; çip çok büyük ve soluk (0.55) çizildiği için 1× ölçüde kenarda
 *  görünmez bir saçağa dönüşüyordu → 2× */
const PIN_SCALE = 2;
export const PIN_W = 2 * PIN_SCALE;
export const PIN_GAP = 3 * PIN_SCALE;
export const PIN_LEN = 7 * PIN_SCALE;
/** Pin sırasının kenar üzerindeki yeri (plaka kenarına oran) */
export const PIN_FROM = 0.07;
export const PIN_TO = 0.93;

export const chipLead = (_size?: number) => PIN_LEN;
export const chipThick = (size: number) =>
  Math.max(8, Math.round((CHIP.thick * size) / REF_CHIP / 2) * 2);

/** Pin sırasının kenar üzerindeki yeri (plaka kenarına oran, 0→1) */
export const pinSpan = () => ({ from: PIN_FROM, to: PIN_TO });

/** Cam panelin ekran oranları — neredeyse tam genişlik (orijinal tasarım) */
export const PANEL = { left: 0.01, top: 0, right: 0.01, bottom: 0.015 };
/** Panelin üst kenarı en az bu kadar aşağıda (px) — avatar bu kenarın
 *  üstüne tırmanıp üzerinde yürüyor, sığması için yer gerekiyor.
 *  SiteAvatar.tsx'teki PANEL_TOP_CSS = "26px" ile aynı olmalı. */
export const PANEL_TOP_MIN_PX = 26; // avatar kenarda küçültülmüş (EDGE_SCALE) olarak sığıyor

export type ChipLayout = {
  /** masaüstü tasarım ölçeği (1440×900 = 1) */
  scale: number;
  /** çipin (pinler dahil) ekrandaki sınırları */
  bounds: { top: number; bottom: number; left: number; right: number };
  vw: number;
  vh: number;
  size: number;
  tilt: number;
  /** Ekran düzleminde döndürme (derece) — çipin çapraz duruşu */
  spin: number;
  /** Dikey eksende çevirme (derece) — çipin yana dönük duruşu */
  turn: number;
  plate: number;
  /** ChipPlatform kutusu */
  box: { left: number; top: number; width: number; height: number };
  /** Plaka merkezi */
  cx: number;
  cy: number;
  /** Elmasın ekrandaki 4 köşesi */
  corners: { T: Pt; R: Pt; B: Pt; L: Pt };
  /** Soket halkasının iç kısmının ekrandaki elipsi (profil maskesi) */
  ring: { x: number; y: number; rx: number; ry: number };
  /** Cam panel (px) */
  panel: { left: number; top: number; right: number; bottom: number };
};

export type Trace = {
  d: string;
  start: Pt;
  end: Pt;
  pad: boolean;
  /** Akım darbesi bu çizgide de koşsun mu */
  pulse: boolean;
};

/* EKRAN BOYUTU — tüm bileşenler AYNI değeri okur.
   Eskiden her bileşen önce 1440×900 varsayıp, ilk çizimden SONRA gerçek
   boyuta geçiyordu: telefonda ilk karede masaüstü yerleşimi görünüp
   portre / avatar / çip yer değiştiriyordu (açılıştan açılışa farklı).
   Artık ilk istemci çiziminde gerçek boyut okunur; sunucu çizimi
   SiteFlow tarafından zaten gösterilmez (bkz. SiteFlow → ready). */
type Vp = { w: number; h: number };
const SERVER_VP: Vp = { w: 1440, h: 900 };
let vpCache: Vp = SERVER_VP;
const vpListeners = new Set<() => void>();
let vpRaf = 0;

function readVp(): Vp {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (vpCache.w !== w || vpCache.h !== h) vpCache = { w, h };
  return vpCache;
}

function onVpResize() {
  /* telefonda adres çubuğu açılıp kapanırken art arda gelen olaylar
     tek karede toplanır */
  cancelAnimationFrame(vpRaf);
  vpRaf = requestAnimationFrame(() => {
    const prev = vpCache;
    if (readVp() !== prev) vpListeners.forEach((fn) => fn());
  });
}

function subscribeVp(fn: () => void) {
  if (!vpListeners.size) {
    window.addEventListener("resize", onVpResize);
    window.addEventListener("orientationchange", onVpResize);
  }
  vpListeners.add(fn);
  return () => {
    vpListeners.delete(fn);
    if (!vpListeners.size) {
      window.removeEventListener("resize", onVpResize);
      window.removeEventListener("orientationchange", onVpResize);
    }
  };
}

export function useViewport(): Vp {
  return useSyncExternalStore(subscribeVp, readVp, () => SERVER_VP);
}

/** Plaka yerel koordinatındaki (u, v, z) bir noktayı, CSS'in
 *  rotateZ(spin) rotateX(tilt) rotateZ(45deg) + perspective dönüşümüyle
 *  ekrana izdüşürür. (0,0,0) = plaka merkezi. z pozitif = izleyiciye doğru. */
function projector(cx: number, cy: number, tilt: number, spin = 0, turn = 0) {
  const a = (tilt * Math.PI) / 180;
  const b = (spin * Math.PI) / 180;
  const t = (turn * Math.PI) / 180;
  const c = Math.SQRT1_2;
  return (u: number, v: number, z = 0): Pt => {
    const x = (u - v) * c;
    const y = (u + v) * c;
    const Y = y * Math.cos(a) - z * Math.sin(a);
    const Z = y * Math.sin(a) + z * Math.cos(a);
    // ekran düzleminde döndürme (z'yi değiştirmez)
    const X2 = x * Math.cos(b) - Y * Math.sin(b);
    const Y2 = x * Math.sin(b) + Y * Math.cos(b);
    // dikey eksende çevirme (rotateY)
    const X3 = X2 * Math.cos(t) + Z * Math.sin(t);
    const Z3 = -X2 * Math.sin(t) + Z * Math.cos(t);
    const s = CHIP.perspective / (CHIP.perspective - Z3);
    return [cx + X3 * s, cy + Y2 * s];
  };
}

/** Mobil / dikey ekran yerleşimi: çip ortada, verilen üst kenardan başlar
 *  ve en fazla `maxH` yüksekliğinde olur (ekrandan taşmaz). */
export type ChipStack = {
  top: number;
  maxH: number;
  maxW: number;
  /** çipin ekrandaki yatay merkezi (verilmezse ekranın ortası) */
  centerX?: number;
};

export function computeChipLayout(
  vw: number,
  vh: number,
  tilt = 0,
  spin = -8,
  turn = 0,
  stack?: ChipStack,
): ChipLayout {
  const panel = stack
    ? { left: 8, top: PANEL_TOP_MIN_PX, right: 8, bottom: 8 }
    : {
        left: vw * PANEL.left,
        top: Math.max(vh * PANEL.top, PANEL_TOP_MIN_PX),
        right: vw * PANEL.right,
        bottom: vh * PANEL.bottom,
      };

  /** Çipin (pinler dahil) merkezine göre ekrandaki sınırları */
  const extent = (size: number) => {
    const p = projector(0, 0, tilt, spin, turn);
    const o = (size * CHIP.plateRatio) / 2 + chipLead(size);
    const th = chipThick(size);
    const pts = [
      p(-o, -o, 0),
      p(o, -o, 0),
      p(o, o, 0),
      p(-o, o, 0),
      p(-o, -o, -th),
      p(o, -o, -th),
      p(o, o, -th),
      p(-o, o, -th),
    ];
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  };

  // Boyut: genişliğin ~%62'si (büyük, sahneye hâkim çip + fotoğraf);
  // yüksekliği ekranın %112'sini geçmesin (alt-sağ köşe zaten taşıyor)
  /* ekran daraldıkça çip ekrana ORANLA büyür (1600px'te %62, 1000px'te %82),
     böylece pencere küçülünce sayfaya göre fazla küçülmez */
  /* MASAÜSTÜ: sahne 1440×900 referansında tasarlandı; her ekranda aynı
     kompozisyon için her şey tek bir ölçekle (designScale) büyür/küçülür.
     Böylece çip ekrana oranla hep aynı büyüklükte ve aynı köşede durur. */
  const k = designScale(vw, vh);
  /* Çip (ve onunla orantılı portre) ekran YÜKSEKLİĞİNE göre ölçeklenir:
     pencere daraldığında çip kısalmaz, sağ kenardan biraz daha taşar.
     Çok dar/geniş oranlarda menüyle çakışmasın diye genişlik ölçeğinin
     en fazla 1.3 katına kadar büyür. */
  const chipK = Math.min(vh / REF_H, (vw / REF_W) * 1.3);
  let size = stack ? vw : REF_CHIP_SIZE * chipK;
  for (let i = 0; i < 4 && stack; i++) {
    const e = extent(size);
    if (stack) {
      /* mobil: hem genişliğe hem ayrılan yüksekliğe sığsın */
      const f = Math.min(
        stack.maxW / (e.maxX - e.minX),
        stack.maxH / (e.maxY - e.minY),
      );
      size *= f;
    }
  }
  size = Math.round(size);
  const e = extent(size);

  const plate = size * CHIP.plateRatio;
  const hs = plate / 2;

  // Konum: sağ alt köşede; sağ ve alt köşeleri cam panelden (ve biraz
  // ekrandan) taşar. OVERFLOW_X / OVERFLOW_Y ne kadar taşacağını belirler.
  /* dar ekranda çip büyüdüğü için biraz daha sağa taşar ki yazıya binmesin */
  /* sağdan taşma: daha az → fotoğraf daha solda/görünür. Çip sağ kenara
     yaslı olduğu için ekran daralınca SAĞA doğru küçülür */
  const OVERFLOW_X = 0.85 + 0.12 * Math.min(1, Math.max(0, (1440 - vw) / 420));
  const cx = stack
    ? (stack.centerX ?? vw / 2) - (e.minX + e.maxX) / 2
    : vw - panel.right - e.maxX * (1 - OVERFLOW_X);
  /* MASAÜSTÜ: çipin SOL (ortadaki) köşesi her ekranda menünün tam
     ortasıyla aynı hizada — menü dikeyde ekranın ortasında durur */
  const leftCorner = (() => {
    const p0 = projector(0, 0, tilt, spin, turn);
    const h0 = (size * CHIP.plateRatio) / 2;
    const cs = [p0(-h0, -h0), p0(h0, -h0), p0(h0, h0), p0(-h0, h0)];
    return cs.reduce((m, q) => (q[0] < m[0] ? q : m));
  })();
  const cy = stack
    ? stack.top - e.minY
    : vh * (MENU_CENTER_FRAC + CORNER_DROP) - leftCorner[1];

  const p = projector(cx, cy, tilt, spin, turn);

  const T = p(-hs, -hs);
  const R = p(hs, -hs);
  const B = p(hs, hs);
  const L = p(-hs, hs);

  const r = plate * CHIP.ringRatio;
  const d = Math.SQRT1_2;
  const ringPts = [
    p(-r * d, -r * d, CHIP.innerZ),
    p(r * d, r * d, CHIP.innerZ),
    p(-r * d, r * d, CHIP.innerZ),
    p(r * d, -r * d, CHIP.innerZ),
  ];

  const boxW = size;
  const boxH = size * 0.9;

  return {
    vw,
    vh,
    size,
    tilt,
    spin,
    turn,
    plate,
    box: { left: cx - boxW / 2, top: cy - boxH / 2, width: boxW, height: boxH },
    cx,
    cy,
    corners: { T, R, B, L },
    ring: {
      x: cx,
      y: cy,
      rx: Math.max(...ringPts.map((q) => Math.abs(q[0] - cx))),
      ry: Math.max(...ringPts.map((q) => Math.abs(q[1] - cy))),
    },
    panel,
    scale: k,
    bounds: {
      top: cy + e.minY,
      bottom: cy + e.maxY,
      left: cx + e.minX,
      right: cx + e.maxX,
    },
  };
}

/* =====================================================
   DEVRE ÇİZGİLERİ — PCB tarzı paralel demetler
===================================================== */

type Move =
  | ["d", number, 1 | -1, 1 | -1] // 45° çapraz, sabit uzunluk
  | ["dx", number, 1 | -1, 1 | -1] // 45° çapraz, hedef x'e kadar
  | ["dy", number, 1 | -1, 1 | -1] // 45° çapraz, hedef y'ye kadar
  | ["h", number] // yatay, hedef x
  | ["v", number]; // dikey, hedef y

function build(start: Pt, moves: Move[], pad = false, pulse = false): Trace {
  let [x, y] = start;
  const pts: Pt[] = [[x, y]];

  for (const m of moves) {
    if (m[0] === "d") {
      x += m[1] * m[2];
      y += m[1] * m[3];
    } else if (m[0] === "dx") {
      const len = Math.max(0, (m[1] - x) * m[2]);
      x += len * m[2];
      y += len * m[3];
    } else if (m[0] === "dy") {
      const len = Math.max(0, (m[1] - y) * m[3]);
      x += len * m[2];
      y += len * m[3];
    } else if (m[0] === "h") {
      x = m[1];
    } else {
      y = m[1];
    }
    pts.push([x, y]);
  }

  return {
    d: pts
      .map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`)
      .join(" "),
    start,
    end: [x, y],
    pad,
    pulse,
  };
}

type Side = "UL" | "UR" | "LR" | "LL";

/** Pin ucunun ekrandaki yeri. f: kenar boyunca 0→1
 *  UL: T→L, UR: T→R, LR: R→B, LL: L→B */
function pinFoot(l: ChipLayout, side: Side, f: number): Pt {
  const hs = l.plate / 2;
  const out = hs + chipLead(l.size);
  const z = -chipThick(l.size);
  const p = projector(l.cx, l.cy, l.tilt, l.spin, l.turn);
  /* çizgiler pin sırasının kapladığı aralıktan çıkar (kenarın ortası) */
  const { from, to } = pinSpan();
  const g = from + f * (to - from);
  const w = -hs + g * 2 * hs;

  switch (side) {
    case "UL": // plakanın sol kenarı (u = -hs), v: -hs(T) → +hs(L)
      return p(-out, w, z);
    case "UR": // üst kenar (v = -hs), u: -hs(T) → +hs(R)
      return p(w, -out, z);
    case "LR": // sağ kenar (u = +hs), v: -hs(R) → +hs(B)
      return p(out, w, z);
    case "LL": // alt kenar (v = +hs), u: -hs(L) → +hs(B)
      return p(w, out, z);
  }
}

/** Bir kenardan çıkan n paralel çizgi. route(k, start) her şerit için
 *  hareketleri döndürür (k = 0 başlangıç köşesine en yakın şerit). */
function bundle(
  l: ChipLayout,
  side: Side,
  f0: number,
  f1: number,
  n: number,
  route: (k: number, s: Pt) => Move[],
  opts: { pad?: (k: number) => boolean } = {},
): Trace[] {
  return Array.from({ length: n }, (_, k) => {
    const f = n === 1 ? f0 : f0 + ((f1 - f0) * k) / (n - 1);
    const s = pinFoot(l, side, f);
    return build(s, route(k, s), opts.pad?.(k) ?? false, k % 2 === 0);
  });
}

export function buildTraces(l: ChipLayout): Trace[] {
  const W = l.vw;
  const H = l.vh;
  const sp = Math.max(7, l.size / 80); // şerit aralığı
  const u = l.size / 100; // ölçek birimi

  // İlk şeridin başlangıcı (hedefleri buna göre kuruyoruz)
  const first = (side: Side, f: number) => pinFoot(l, side, f);

  const ul1 = first("UL", 0.06);
  const ul2 = first("UL", 0.36);
  const ul3 = first("UL", 0.72);
  const ur1 = first("UR", 0.08);
  const ur2 = first("UR", 0.46);
  const lr1 = first("LR", 0.12);
  const ll1 = first("LL", 0.1);
  const ll2 = first("LL", 0.6);

  return [
    // UL, T'ye yakın → çapraz sol-yukarı → dik yukarı
    ...bundle(l, "UL", 0.06, 0.26, 5, (k) => [
      ["dx", ul1[0] - 5 * u - k * sp, -1, -1],
      ["v", -20],
    ]),

    // UL orta → sola, cam panelin içinden geçip pedlerde biter
    ...bundle(
      l,
      "UL",
      0.36,
      0.64,
      7,
      (k) => [
        ["dy", ul2[1] - 7 * u + k * sp, -1, -1],
        ["h", W * 0.5 - k * sp],
        ["dy", ul2[1] - 16 * u + k * sp, -1, -1],
        ["h", W * (0.26 - k * 0.02)],
      ],
      { pad: () => true },
    ),

    // UL, L'ye yakın → sola, ekranın sol kenarına
    ...bundle(l, "UL", 0.72, 0.94, 6, (k) => [
      ["dy", ul3[1] - 3 * u + k * sp, -1, -1],
      ["h", W * 0.34 + k * sp],
      ["d", 6 * u, -1, 1],
      ["h", -20],
    ]),

    // UR, T'ye yakın → çapraz sağ-yukarı → dik yukarı
    ...bundle(l, "UR", 0.08, 0.3, 5, (k) => [
      ["dx", ur1[0] + 6 * u + k * sp, 1, -1],
      ["v", -20],
    ]),

    // UR orta → sağa, ekranın sağ kenarına
    ...bundle(l, "UR", 0.46, 0.9, 7, (k) => [
      ["dy", ur2[1] - 6 * u + k * sp, 1, -1],
      ["h", l.corners.R[0] + 4 * u + k * sp],
      ["d", 5 * u, 1, -1],
      ["h", W + 20],
    ]),

    // LR → sağ-aşağı → sağa
    ...bundle(l, "LR", 0.12, 0.5, 6, (k) => [
      ["dy", lr1[1] + 4 * u + k * sp, 1, 1],
      ["h", W + 20],
    ]),

    // LL, L'ye yakın → sol-aşağı → sola (panelin alt kenarı boyunca)
    ...bundle(l, "LL", 0.1, 0.42, 6, (k) => [
      ["dy", ll1[1] + 4 * u + k * sp, -1, 1],
      ["h", W * 0.42 - k * sp],
      ["dy", H * 0.935 + k * sp * 0.8, -1, 1],
      ["h", -20],
    ]),

    // LL, B'ye yakın → aşağı
    ...bundle(l, "LL", 0.6, 0.86, 4, (k) => [
      ["dx", ll2[0] - 3 * u + k * sp, -1, 1],
      ["v", H + 20],
    ]),
  ];
}

/** Masaüstü sahnesinin referans boyutu ve o boyuttaki çip */
export const REF_W = 1440;
export const REF_H = 900;
const REF_CHIP_SIZE = REF_CHIP;
/** menünün dikey ortası (ekran yüksekliğine oranı) — çipin sol köşesi buraya hizalanır */
const MENU_CENTER_FRAC = 0.5;
/** sol köşenin menü ortasından ne kadar aşağıda olacağı (ekran yüksekliğine oran) */
const CORNER_DROP = 0.2; // çip daha aşağıdan başlar (alt kısmı ekran dışında kalabilir) → önündeki portreye yer
/** Sahnenin ekrana ölçeği: hem genişliğe hem yüksekliğe sığar */
export function designScale(vw: number, vh: number) {
  return Math.min(vw / REF_W, vh / REF_H);
}

/** Dar / dikey ekranlarda (telefon, dikey tablet) alt alta "yığın" yerleşimi */
export function isStacked(vw: number, vh: number) {
  return vw < 640 || (vw < 1200 && vh > vw * 1.1);
}
