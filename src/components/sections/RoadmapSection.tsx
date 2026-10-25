"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
  useSyncExternalStore,
} from "react";

import { MapPin } from "lucide-react";

import CollectedSkillsPanel, {
  DEFAULT_CATEGORIES,
} from "@/components/sections/CollectedSkillsPanel";
import RoadmapPerch, { PERCH_ASPECT } from "@/components/sections/RoadmapPerch";
import SciFiBackground from "../ui/ScifiBackground";

/* ================================================================
   AYARLAR
================================================================ */

const W = 2576;
const H = 1093;
const STEPS = 16;

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
   (public/images/zeynep-comelme.webp)
================================================================ */

/* Yürümez: fotoğraftaki çömelme pozuyla nehrin üstünde oturup kayar */
/* Oturup bacakları önde, nehirde kayan poz (public/images/zeynep-kayma.webp) */
const SIT_SRC = "/images/zeynep-kayma.webp";
const SIT_LEDGE = 0.95; // fotoğrafta zemin çizgisi (kalça / eller = su yüzeyi)
/** Kişinin boyu (ekran px) */
const AV_H = 74; // eskiden 58: avatar daha büyük
const AV_W = Math.round((AV_H * 680) / 364); // görselin oranı
/** kaydırak eğimi (derece): büyüdükçe ayaklar daha aşağı, gövde daha yukarı */
const SLIDE_TILT = 22;
/** görselde kalçanın yatay yeri (genişliğe oran) — eğim bu noktanın etrafında */
const SEAT_X = 0.4;
/** true: nehir sola kıvrılınca kişi de sola döner. false: hep sağa bakar */
const FLIP_ON_LEFT = false;
/** Hız (ekran px / sn) */
/* YOL HARİTASI HIZI — 1 = eski hız; büyüdükçe kayma, yetenek toplama,
   ışık topu ve panelin yanması aynı oranda YAVAŞLAR */
const RM_SLOW = 3; // eskiden 2.4
const WALK_SPEED = 1150 / RM_SLOW / 1.25; // avatar ayrıca %25 daha yavaş kayar
/** Her yetenekte eğilip alma süresi (ms) — kısa ve tok */
/* EKRANA DÖNÜK POZ — nehir aşağı (izleyiciye doğru) aktığı kıvrımlarda
   kişi ekrana döner (public/images/zeynep-kayma-on.webp) */
const FRONT_SRC = "/images/zeynep-kayma-on.webp";
const FRONT_LEDGE = 0.91; // fotoğrafta zemin çizgisi (eller)
const FRONT_H = 70;
const FRONT_W = Math.round((FRONT_H * 360) / 457);
/** ekrana dönme eşiği: nehrin aşağı eğimi / yatay hareket oranı
    (ENTER'ı geçince döner, EXIT'in altına inince yana döner) */
const FRONT_ENTER = 1.1;
const FRONT_EXIT = 0.6;
/** GİRİŞ: kişi ekrana ilk geldiğinde ÖNE DÖNÜK durur; nehir sağa
    kıvrılana kadar (bu nehir noktasına kadar) hep ekrana bakar,
    sonra kıvrımda yana döner */
const FRONT_INTRO_UNTIL = 8 * STEPS;

/** Kişi nehrin sonuna varınca, sayfa geçişinden önce bekleme (ms):
    panel yanmış haldeyken sayfa sakin biter */
/** yetenekler paneli tamamen açılıp liste görününce sayfa bu kadar
 *  bekler, sonra projelere geçer (ms) */
const END_HOLD_MS = 1600;
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
const ORB_MS = Math.round(620 * RM_SLOW);

/** Tüm yetenekler toplandıktan sonra panelin yanmasına kadar bekleme (ms) */
const PANEL_ON_DELAY = 700; // son yetenekten sonra panel (ms)
/** panelin açılış animasyonu + satırların sırayla gelmesi (ms) */
const PANEL_SHOW_MS = 1600;

/** Karttaki kişi: sağ kenardan boşluk (genişlik oranı) ve dikey ortası (yükseklik oranı)
    — daha sağa: PERCH_RIGHT'ı küçült, daha yukarı: PERCH_Y'yi küçült */
const PERCH_RIGHT = 0.05;
const PERCH_Y = 0.36;

/** Yetenekler panelinin kapladığı alanın sağ kenarı (px) */
const PANEL_AREA = (w: number) => w * 0.02 + 610 + 60;

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
  fade: 14, // üstteki sis az: nehrin sol üst köşedeki başlangıcı görünür
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

type RoadmapSectionProps = {
  active?: boolean;
  onComplete?: () => void;
  /** true: animasyon oynamaz, sayfa doğrudan BİTMİŞ haliyle açılır
   *  (tüm yetenekler toplanmış, panel yanık, avatar çıkmış).
   *  Header menüsünden /roadmap'e gidince kullanılır. */
  finished?: boolean;
  /** true: sayfa ekrana yükselirken avatar nehrin girişinde HAZIR
   *  bekler (görünür); `active` olunca oradan kaymaya başlar */
  staged?: boolean;
  /** true: kişi bir önceki sayfadan (yukarıdan) nehrin girişine düşer;
   *  suya inince `active` ise kaymaya başlar */
  entering?: boolean;
};


/** Avatar ana saatinde bir karede en fazla bu kadar ilerler (ms):
 *  telefon bir an takılırsa kişi nehirde ileri ışınlanmaz */
const MAX_FRAME_MS = 100;

/* ================================================================
   NEHİR NOKTALARI
================================================================ */

const SECTIONS: [P, P][] = [
  /* SOL ÜST KÖŞEDEN girer, çapraz inerek sağa döner */
  [
    [490, -80],
    [430, -80],
  ],
  [
    [515, 20],
    [462, 34],
  ],
  [
    [542, 108],
    [494, 126],
  ],
  [
    [572, 178],
    [530, 202],
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
  /* geniş / alçak ekranlarda da nehir SAĞ ALT köşeye kadar uzansın */
  [
    [3400, 1290],
    [2850, 1640],
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
   BINARY — nehrin içinde akan çok küçük ve sık 0/1 dizileri
   [nehir genişliğine oran, opaklık, başlangıç kayması]
================================================================ */

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
/** yazı boyu (nehir koordinatlarında; ekranda ~8px) */
const BINARY_SIZE = 11;
/** karakter arası boşluk */
const BINARY_SPACING = 1.1;

const BINARY_LANES: [number, number, string][] = [
  [0.14, 0.3, "0%"],
  [0.26, 0.36, "3%"],
  [0.38, 0.4, "1%"],
  [0.5, 0.44, "4%"],
  [0.62, 0.4, "2%"],
  [0.74, 0.34, "0%"],
  [0.86, 0.28, "3%"],
];

/*
 * Rastgele görünen ama her render'da (ve sunucu/istemcide) aynı çıkan
 * ikilik diziler (tohumlu üreteç: Math.random render'da saf değil).
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

/** nehir boyunca yetecek uzunlukta */
const BINARY = BINARY_LANES.map((_, i) => seededBinary(1200, i + 3));

/* ================================================================
   ROADMAP
================================================================ */

/** nehir katmanının düz olduğu ekranlar (RIVER_CSS ile aynı koşul) */
const FLAT_QUERY = "(max-width: 1023px), (hover: none)";
const subFlat = (cb: () => void) => {
  const mq = window.matchMedia(FLAT_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const readFlat = () => window.matchMedia(FLAT_QUERY).matches;

/* Nehir boyunca YETENEKLER — soldaki yetenekler panelindeki listenin
   TAMAMI, tek tek (CollectedSkillsPanel > DEFAULT_CATEGORIES). Nehrin iki
   kıyısına sırayla dizilir: bir üst kıyı, bir alt kıyı. Panelde yetenek
   eklenip çıkarılırsa yol da kendiliğinden güncellenir. */
const NODES = DEFAULT_CATEGORIES.flatMap((cat, ci) =>
  cat.techs.map((tech) => ({
    cat: ci,
    name: tech.name,
  })),
).map((n, i) => ({ ...n, number: i + 1 }));

/** yeteneklerin dizildiği bölüm (nehir koordinatında x aralığı) */
const SKILL_FROM_X = 470;
const SKILL_TO_X = 1880;
/** kıyıdan uzaklık (px) */
const BANK_GAP = 10;

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

type GeoOptions = {
  /** yeteneklerin dizildiği bölüm: middle noktalarının indeks aralığı */
  range: (middle: Pt[], acc: number[]) => [number, number];
  /** k. yeteneğin kıyısı: true = "top" kenar, false = "bottom" kenar */
  onTop: (k: number, m: Pt, top: Pt, bottom: Pt) => boolean;
  /** yetenek aralığı için yol parçasının ağırlığı (varsayılan: uzunluğu).
   *  Telefonda yalnızca yatay ilerleme sayılır: kıvrımlara etiket düşmez */
  weight?: (a: Pt, b: Pt) => number;
};

function buildGeometry(sections: [P, P][], opts: GeoOptions) {
  const top = spline(sections.map(([a]) => a));
  const bottom = spline(sections.map(([, b]) => b));

  const depth = top.map(
    (p, i) => 5 + Math.hypot(p.x - bottom[i].x, p.y - bottom[i].y) * 0.08,
  );

  const lane = (ratio: number, sunk = true): Pt[] =>
    top.map((p, i) => ({
      x: p.x + (bottom[i].x - p.x) * ratio,
      y: p.y + (bottom[i].y - p.y) * ratio + (sunk ? depth[i] : 0),
    }));

  const middle = lane(0.5, false);

  /* yetenekler: seçili bölümde yol uzunluğuna göre EŞİT aralıklı */
  const acc = [0];
  for (let i = 1; i < middle.length; i++)
    acc.push(
      acc[i - 1] +
        Math.hypot(
          middle[i].x - middle[i - 1].x,
          middle[i].y - middle[i - 1].y,
        ),
    );
  const [iFrom, iTo] = opts.range(middle, acc);
  /* yetenekler ağırlıklı uzunluğa göre eşit aralıklı */
  const wacc = opts.weight
    ? middle.reduce<number[]>((arr, p, i) => {
        arr.push(i ? arr[i - 1] + opts.weight!(middle[i - 1], p) : 0);
        return arr;
      }, [])
    : acc;
  const s0 = wacc[iFrom];
  const s1 = wacc[iTo];
  const nodeIndexes = NODES.map((_, k) => {
    const target = s0 + ((k + 0.5) / NODES.length) * (s1 - s0);
    let i = iFrom;
    while (i < iTo && wacc[i] < target) i++;
    return i;
  });
  /* her yeteneğin kıyı noktası ve kıyıdan dışa doğru yön */
  const banks = nodeIndexes.map((i, k) => {
    const edge = (opts.onTop(k, middle[i], top[i], bottom[i]) ? top : bottom)[
      i
    ];
    const m = middle[i];
    const len = Math.hypot(edge.x - m.x, edge.y - m.y) || 1;
    return { at: edge, nx: (edge.x - m.x) / len, ny: (edge.y - m.y) / len };
  });

  return {
    middle,
    river: polygon(top, bottom),
    surface: polygon(lane(0), lane(1)),
    core: polygon(lane(0.15), lane(0.6)),
    top: line(top),
    bottom: line(bottom),
    lane: (ratio: number) => line(lane(ratio)),
    nodeIndexes,
    banks,
  };
}

/* Geometri sabit veriden üretilir: modül yüklenirken bir kez hesaplanır */
const GEO = buildGeometry(SECTIONS, {
  range: (middle) => {
    const iFrom = Math.max(
      0,
      middle.findIndex((p) => p.x >= SKILL_FROM_X),
    );
    let iTo = middle.length - 1;
    while (iTo > iFrom && middle[iTo].x > SKILL_TO_X) iTo--;
    return [iFrom, iTo];
  },
  /* sırayla bir üst kıyı, bir alt kıyı */
  onTop: (k) => k % 2 === 0,
});

/* ================================================================
   TELEFON (DİKEY EKRAN) NEHRİ — KAYDIRAK: sol üst köşeden girer,
   hafif bir kavisle çapraz inerek sağ alt köşeden çıkar.
   Koordinatlar: genişlik TW (= lacivert panelin genişliği), yükseklik
   panelin oranına göre hesaplanır; nehir panelden DIŞARI taşmaz.
================================================================ */
const TW = 640;
/** nehrin yarı genişliği (koordinat birimi) */
const TALL_HALF = 40;
/** telefonda etiketin en fazla genişliği (px): sığmazsa iki satıra iner */
const CHIP_MAX_PHONE = 118;
const CHIP_FONT_PHONE = 10;
/** telefonda nehir kenarında her PHONE_EVERY yetenekten biri görünür
 *  (hepsi yine toplanır ve panelde listelenir; telefon kasmasın diye) */
const PHONE_EVERY = 2;
const phoneHidden = (portrait: boolean, i: number) =>
  portrait && i % PHONE_EVERY !== 0;
const CHIP_FONT = 11.5;
/** kaydırağın kavisi (koordinat birimi): 0 = dümdüz çapraz */
const SLIDE_BEND = 46;

/** panelin oranına göre (th = TW * panelH / panelW) kaydırak nehir */
function buildTall(th: number) {
  const N = 10;
  const middle: P[] = Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    /* köşeden köşeye; ortada hafif S kavisi (kaydırak) */
    const bend = Math.sin(t * Math.PI * 2) * SLIDE_BEND;
    return [-70 + (TW + 140) * t + bend * 0.6, -70 + (th + 140) * t - bend];
  });
  const sections: [P, P][] = middle.map(([x, y], i) => {
    const [px, py] = middle[Math.max(0, i - 1)];
    const [nx, ny] = middle[Math.min(middle.length - 1, i + 1)];
    const tx = nx - px;
    const ty = ny - py;
    const len = Math.hypot(tx, ty) || 1;
    /* akış yönüne dik birim vektör */
    const ox = (ty / len) * TALL_HALF;
    const oy = (-tx / len) * TALL_HALF;
    return [
      [x + ox, y + oy],
      [x - ox, y - oy],
    ];
  });
  return buildGeometry(sections, {
    /* panelin içinde kalan kısım (uçlar hariç) */
    range: (m) => {
      const iFrom = Math.max(
        0,
        m.findIndex((p) => p.x >= 30 && p.y >= th * 0.05),
      );
      let iTo = m.length - 1;
      while (iTo > iFrom && (m[iTo].x > TW - 30 || m[iTo].y > th * 0.95)) iTo--;
      return [iFrom, iTo];
    },
    /* telefonda her iki yetenekten biri görünür: görünenler sırayla
       bir sağ-üst, bir sol-alt kıyıda */
    onTop: (k) => Math.floor(k / PHONE_EVERY) % 2 === 0,
  });
}

/** telefon nehrinin yüksekliği (koordinat): panel oranından, 20'lik adımla */
const tallHeightOf = (w: number, h: number) =>
  Math.round((TW * (h * PANEL_H)) / (w * PANEL_W) / 20) * 20;

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
   ÇERÇEVE (ölçek + konum)
   Lacivert cam panel: ScifiBackground'daki gibi sol/sağ %1, üst/alt %1.5.
================================================================ */
const PANEL_L = 0.01;
const PANEL_T = 0.015;
const PANEL_W = 1 - PANEL_L * 2;
const PANEL_H = 1 - PANEL_T * 2;

/** geniş ekranda nehrin girişinin x'i (koordinat): ekranın sol kenarı */
const DESK_START_X = 490;

type Frame = { sc: number; px: number; py: number; vw: number; vh: number };

/** geniş ekran: nehir ekranı kaplar ve ortalanır.
 *  telefon: nehir panelin genişliğine tam oturur (uçlar panel kenarında) */
function frameOf(w: number, h: number, portrait: boolean): Frame {
  if (portrait) {
    const vh = tallHeightOf(w, h) || 1360;
    const sc = (w * PANEL_W) / TW || 1;
    return {
      sc,
      px: w * PANEL_L,
      py: h * PANEL_T + (h * PANEL_H - vh * sc) / 2,
      vw: TW,
      vh,
    };
  }
  const sc = Math.max(w / W, h / H);
  /* nehrin girişi (DESK_START_X) panelin SOL ÜST köşesine hizalanır */
  return {
    sc,
    px: w * PANEL_L - DESK_START_X * sc,
    py: (h - H * sc) / 2,
    vw: W,
    vh: H,
  };
}

/* ================================================================
   YETENEK ETİKETLERİNİN YERİ — her biri kendi kıyı noktasından dışa
   doğru yerleşir; başka etikete ya da (telefonda) nehre çarpmayan en
   yakın yere itilir. Ağır hesap: yalnızca boyut değişince yapılır.
================================================================ */
type Geo = ReturnType<typeof buildGeometry>;

/** aday kaydırmalar [dışa itme, kıyı boyunca kayma], yakından uzağa */
const CANDIDATES_WIDE: [number, number][] = [];
for (let push = 0; push <= 120; push += 10)
  for (const slide of [0, 24, -24, 48, -48, 72, -72])
    CANDIDATES_WIDE.push([push, slide]);
/* telefon: dışa itmek (ikinci sıraya geçmek) yana kaymaktan ucuz */
const CANDIDATES_TALL: [number, number][] = [];
for (let push = 0; push <= 170; push += 10)
  for (let slide = -120; slide <= 120; slide += 15)
    CANDIDATES_TALL.push([push, slide]);
CANDIDATES_TALL.sort(
  (a, b) => a[0] + Math.abs(a[1]) * 1.6 - (b[0] + Math.abs(b[1]) * 1.6),
);

function layoutChips(
  G: Geo,
  frame: Frame,
  sw: number,
  sh: number,
  portrait: boolean,
) {
  const chipFont = portrait ? CHIP_FONT_PHONE : CHIP_FONT;
  const scale = frame.sc;
  const toPx = (pt: Pt) => ({
    left: frame.px + pt.x * scale,
    top: frame.py + pt.y * scale,
  });
  const chipPositions: { left: number; top: number }[] = [];
  const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const padX = sw * PANEL_L + 6;
  const padY = sh * PANEL_T + 6;
  /* telefonda nehrin orta çizgisi (px) ve yarı genişliği: etiketler
     suyun üstüne binmez */
  const riverPx = portrait
    ? G.middle
        .filter((_, j) => j % 3 === 0)
        .map(toPx)
        .map((q) => ({ x: q.left, y: q.top }))
    : [];
  const riverHalfPx = TALL_HALF * scale + 4;
  G.banks.forEach(({ at, nx, ny }, i) => {
    if (phoneHidden(portrait, i)) {
      chipPositions.push({ left: -9999, top: -9999 });
      return;
    }
    const p = toPx(at);
    /* telefonda etiket en fazla CHIP_MAX_PHONE genişliğinde; uzun
       olan iki satıra iner */
    const est = 36 + NODES[i].name.length * chipFont * 0.63;
    const w = portrait ? Math.min(est, CHIP_MAX_PHONE) : est;
    /* telefonda satır sayısı: yazı alanı (ikon + boşluk hariç) kelime
       kaydırma payıyla */
    const lines = portrait
      ? Math.ceil(
          (NODES[i].name.length * chipFont * 0.62 * 1.15) /
            (CHIP_MAX_PHONE - 34),
        )
      : 1;
    const h = lines * 13 + 10;
    const base = BANK_GAP + Math.abs(nx) * (w / 2) + Math.abs(ny) * (h / 2);
    /* etiket lacivert panelden taşmasın */
    const clampX = (x: number) =>
      Math.min(Math.max(x, padX + w / 2), sw - padX - w / 2);
    /* telefonda üstteki fiş soketinin altında kalır */
    const clampY = (y: number) =>
      Math.min(
        Math.max(y, (portrait ? padY + 34 : padY) + h / 2),
        sh - padY - h / 2,
      );
    const hits = (cx: number, cy: number) =>
      placed.some(
        (r) =>
          cx - w / 2 < r.x1 + 6 &&
          cx + w / 2 > r.x0 - 6 &&
          cy - h / 2 < r.y1 + 4 &&
          cy + h / 2 > r.y0 - 4,
      ) ||
      /* telefonda etiket nehrin üstüne binmesin */
      riverPx.some(
        (q) =>
          Math.hypot(
            Math.max(Math.abs(q.x - cx) - w / 2, 0),
            Math.max(Math.abs(q.y - cy) - h / 2, 0),
          ) < riverHalfPx,
      );
    /* önce kıyıya en yakın boş yer: dışa doğru it, gerekirse kıyı
       boyunca kaydır */
    let cx = clampX(p.left + nx * base);
    let cy = clampY(p.top + ny * base);
    /* boş yer yoksa: diğer etiketlerle EN AZ çakışan yer */
    const overlap = (x: number, y: number) =>
      placed.reduce(
        (sum, r) =>
          sum +
          Math.max(0, Math.min(x + w / 2, r.x1) - Math.max(x - w / 2, r.x0)) *
            Math.max(0, Math.min(y + h / 2, r.y1) - Math.max(y - h / 2, r.y0)),
        0,
      );
    let best = Infinity;
    let found = false;
    for (const [push, slide] of portrait ? CANDIDATES_TALL : CANDIDATES_WIDE) {
      const x = clampX(p.left + nx * (base + push) - ny * slide);
      const y = clampY(p.top + ny * (base + push) + nx * slide);
      if (!hits(x, y)) {
        cx = x;
        cy = y;
        found = true;
        break;
      }
      if (portrait) {
        const o = overlap(x, y);
        if (o < best) {
          best = o;
          cx = x;
          cy = y;
        }
      }
    }
    if (!found && !portrait) {
      cx = clampX(p.left + nx * base);
      cy = clampY(p.top + ny * base);
    }
    placed.push({
      x0: cx - w / 2,
      y0: cy - h / 2,
      x1: cx + w / 2,
      y1: cy + h / 2,
    });
    chipPositions.push({ left: cx, top: cy });
  });
  return chipPositions;
}

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

  /* Yetenekler paneli: yumuşakça yükselip belirir (titreme yok) */
  @keyframes rmPanelOn {
    0%   { opacity: 0; transform: translateY(calc(-50% + 22px)) scale(.97); }
    60%  { opacity: 1; }
    100% { opacity: 1; transform: translateY(-50%); }
  }

  @keyframes rmPanelOnLite {
    0%   { opacity: 0; transform: translateY(calc(-50% + 18px)) scale(.97); }
    100% { opacity: 1; transform: translateY(-50%); }
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
    animation: rmPanelOn 1.2s cubic-bezier(.22,1,.36,1) both;
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
    transform-origin: 0% 100%; /* sol kenar sabit: nehir tam sol üst köşeden başlar */
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

  /* TELEFON / TABLET: ağır efektler kapalı — eğim + maske (her karede
     yeniden boyama), ince akış çizgileri, bulanık bantlar */
  @media (max-width: 1023px), (hover: none) {
    .rm-river-layer,
    .rm-front-layer {
      transform: none;
      will-change: auto;
    }
    .rm-river-layer {
      -webkit-mask-image: none;
      mask-image: none;
    }
    .rm-fine,
    .rm-hl {
      display: none;
    }
    .rm-svg {
      transform: translateZ(0);
      will-change: transform;
    }
    /* panel telefonda bulanıklık/parlaklık filtresi olmadan açılır */
    .rm-panel.is-on {
      animation: rmPanelOnLite 1s cubic-bezier(.22,1,.36,1) both;
    }
    .rm-dark {
      filter: none;
    }
    /* akan çizgiler telefonda durur: her karede koca nehri yeniden
       boyamak en ağır iş buydu (çizgiler yerinde, sabit görünür) */
    .rm-flow {
      animation: none;
    }
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
  @keyframes rmAvLand {
    0%   { transform: translateY(4px) scale(1.08, .8); }
    40%  { transform: translateY(-3px) scale(.97, 1.05); }
    70%  { transform: translateY(1px) scale(1.01, .98); }
    100% { transform: none; }
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
  staged = false,
  entering = false,
}: RoadmapSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const orbTimers = useRef<number[]>([]);
  /* sayfa sonu beklemesi: ekran boyutu değişse de iptal olmaz */
  const endTimerRef = useRef(0);

  const avatarRef = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  const [size, setSize] = useState({ w: 0, h: 0 });

  /* NEHRİN BAŞINA İNİŞ (hikâye): hero'daki kişi aşağı dalar, geçiş biterken
     ekranın üstünden nehrin başına (data-rm-entry) düşer. İndiği an buradaki kişi
     devralır: çöküp yaylanarak oturur, sonra kaymaya başlar. */
  const landed = entering;
  /* telefon / tablet: nehir katmanı düz (eğim yok, RIVER_CSS) */
  const flat = useSyncExternalStore(subFlat, readFlat, () => false);
  const rideGo = active && (!staged || landed);

  /* PERFORMANS: kişinin nehirdeki yeri ve dikey ekrandaki kamera kayması
     React state ile DEĞİL, doğrudan stil yazılarak güncellenir — her
     karede bütün bölüm (nehir, 22 etiket) yeniden çizilmez */
  const avatarElRef = useRef<HTMLDivElement>(null);

  /* Avatar: en son vardığı durak (-1 = henüz başlamadı), hareket ediyor mu,
     hangi yöne bakıyor */
  const [arrived, setArrived] = useState(finished ? NODES.length : -1);
  const [moving, setMoving] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  /* nehir aşağı (izleyiciye doğru) akarken kişi ekrana döner */
  /* ilk göründüğünde öne dönük */
  const [facingScreen, setFacingScreen] = useState(true);

  /* Alınan yetenek kartı altın bir ışık topuna dönüşüp sol taraftaki
     yetenekler panelinin yerine uçar (panel sonunda bunlarla yanar) */
  const [orbs, setOrbs] = useState<Orb[]>([]);

  /* Yetenek, kişi o durağa VARINCA alınmış sayılır */
  const allCollected = arrived >= NODES.length;

  /* Yetenekler paneli: kişi SON yeteneği de aldıktan sonra yanar. */
  const panelArmed = active && allCollected && !finished;
  const [panelDelayDone, setPanelDelayDone] = useState(false);
  const panelOn = finished || (panelArmed && panelDelayDone);

  if (!panelArmed && panelDelayDone) {
    setPanelDelayDone(false);
  }

  /* SAYFA GEÇİŞİ: panel yandıktan, açılış animasyonu bitip liste
     göründükten END_HOLD_MS sonra */
  useEffect(() => {
    if (!panelOn || finished || !active || completedRef.current) return;
    const t = window.setTimeout(() => {
      completedRef.current = true;
      onCompleteRef.current?.();
    }, PANEL_SHOW_MS + END_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [panelOn, finished, active]);

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
      setFacingScreen(true);
      setArrived(-1);
      setMoving(false);
      setOrbs([]);
      setFacingLeft(false);
    }
  }

  /* Ref'ler render dışında sıfırlanır */
  useEffect(() => {
    if (active || finished) return;

    /* girişte bekleyen avatarın yeri korunur (aşağıda entryK) */
    if (!staged) avatarRef.current = 0;
    completedRef.current = false;
  }, [active, finished, staged]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  /* ==============================================================
     DİKEY EKRAN (telefon / dikey tablet): nehir YİNE SOLDAN SAĞA
     akar; ekran yüksekliğine göre ölçeklenir ve "kamera" avatarı
     takip ederek nehir boyunca sağa kayar.
  ============================================================== */

  const portrait = size.w > 0 && size.w < 900 && size.h > size.w * 1.15;
  /* bu ekranın nehri ve koordinat alanı */
  const frame = frameOf(size.w, size.h, portrait);
  const tallH = portrait ? tallHeightOf(size.w, size.h) || 1360 : 0;
  /* telefon nehri panelin oranına göre bir kez kurulur */
  const tallGeo = useMemo(() => (tallH ? buildTall(tallH) : null), [tallH]);
  const G = tallGeo ?? GEO;
  const VW = frame.vw;
  const VH = frame.vh;

  /* telefon (dikey ya da yatay): yetenek paneli mobil hâliyle */
  const compactPanel = size.w > 0 && (size.w < 640 || size.h < 560);

  /* ==============================================================
     YETENEK IŞIK TOPLARI
     Karttan panele uçan top; ölçüm bir sonraki karede yapılır.
  ============================================================== */

  useEffect(() => {
    if (!active || arrived < 1 || arrived > NODES.length) return;

    const frame = requestAnimationFrame(() => {
      const card = cardRefs.current[arrived - 1];
      const box = containerRef.current;
      if (!card || !box) return;

      const r = card.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      /* paneldeki kategori satırı (CollectedSkillsPanel ile aynı yerleşim) */
      const ph = Math.min(Math.max(b.height * 0.86, 560), 820);
      const nCat = DEFAULT_CATEGORIES.length;
      const cat = NODES[arrived - 1].cat;

      const orb: Orb = {
        id: arrived,
        x: r.left + r.width / 2 - b.left,
        y: r.top + r.height / 2 - b.top,
        tx: b.width * 0.02 + 140,
        ty:
          b.height / 2 -
          ph / 2 +
          ph * (0.12 + (0.76 * cat) / Math.max(1, nCat - 1)),
      };

      setOrbs((o) => [...o.filter((x) => x.id !== orb.id), orb]);

      /* top uçuşunu bitirince silinir (sonraki yetenek gelse de iptal olmaz) */
      orbTimers.current.push(
        window.setTimeout(
          () => setOrbs((o) => o.filter((x) => x.id !== orb.id)),
          ORB_MS + 150,
        ),
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [active, arrived]);

  useEffect(
    () => () => {
      orbTimers.current.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(endTimerRef.current);
    },
    [],
  );

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

  /* kişiyi nehirde i. noktaya koyar + dikey ekranda kamerayı kaydırır
     (stil doğrudan yazılır, React yeniden çizmez) */
  const placeAvatar = useCallback(
    (i: number) => {
      const f = frameOf(size.w, size.h, portrait);
      const pt = pointAt(G.middle, i);
      const av = avatarElRef.current;
      if (av)
        av.style.transform = `translate3d(${f.px + pt.x * f.sc}px, ${f.py + pt.y * f.sc}px, 0) translate(-50%, -96%)`;
    },
    [size.w, size.h, portrait, G],
  );

  /* KİŞİNİN GİRİŞ NOKTASI: nehrin girişi panelin köşesinde / dışında
     kaldığı için (özellikle telefonda) kişi, tamamen göründüğü İLK
     noktadan başlar. Sayfa yükselirken de (staged) burada bekler. */
  const entryK = useMemo(() => {
    if (!size.w) return 0;
    const f = frameOf(size.w, size.h, portrait);
    /* panelin sol üst köşesine olabildiğince yakın: oturan kişi (boyu
       AV_H) panelin üst kenarına değmeden sığsın — her ekranda aynı */
    /* telefonda kişi kesimsiz katmanda: panelin köşesindeki nehrin
       başına olabildiğince yakın oturur (gövdesi panelin kenarına
       taşabilir) */
    /* telefonda: kişi ekranın içinde tamamen görünsün (başı üst kenardan,
       gövdesi sol kenardan taşmasın) — panel kenarı önemli değil */
    const minX = flat
      ? 18 + (0.5 - SEAT_X) * AV_W
      : size.w * PANEL_L + 16;
    const minY = flat ? AV_H * 0.92 + 2 : size.h * PANEL_T + AV_H * 0.98 + 2;
    let k = 0;
    while (k < G.middle.length - 1) {
      const q = G.middle[k];
      if (f.px + q.x * f.sc >= minX && f.py + q.y * f.sc >= minY) break;
      k++;
    }
    return k;
  }, [size.w, size.h, portrait, G, flat]);

  /* her çizimden sonra (kişi yeni belirince, ekran boyu değişince)
     kişiyi ve kamerayı son konuma yeniden yerleştir */
  useLayoutEffect(() => {
    if ((staged || active) && avatarRef.current < entryK)
      avatarRef.current = entryK;
    placeAvatar(avatarRef.current);
  });

  /* ==============================================================
     KİŞİ HAREKETİ
     Kişi nehrin başından sonuna DURMADAN kayar; kıyıdaki her yeteneğin
     hizasından geçerken onu toplar (yetenek altın yanıp panele uçar).
     Bütün yetenekler toplanınca panel yanar, kişi nehrin sonundan çıkar.
  ============================================================== */

  useEffect(() => {
    if (!rideGo) return;

    /* KİŞİ PANELİN İÇİNDE, NEHRİN BAŞINDA BAŞLAR (entryK — yukarıda) */
    if (avatarRef.current < entryK) avatarRef.current = entryK;
    const from = avatarRef.current;
    /* geniş ekranda son (uzatma) bölüm ekran dışında: kişi orada durur */
    const to = G.middle.length - 1 - (portrait ? 0 : STEPS);

    if (from >= to - 0.001) return;

    /* süre yol uzunluğuna göre: sabit hızla kayar */
    const sc = frameOf(size.w, size.h, portrait).sc || 1;
    let pathLen = 0;
    for (let i = Math.floor(from); i < to; i++) {
      pathLen += Math.hypot(
        G.middle[i + 1].x - G.middle[i].x,
        G.middle[i + 1].y - G.middle[i].y,
      );
    }
    pathLen *= sc;

    const start = performance.now();
    /* telefonda nehir küçük ölçekte: biraz daha yavaş, kamera rahat izlesin */
    const duration =
      Math.max(600, (pathLen / WALK_SPEED) * 1000) * (portrait ? 1.5 : 1);
    /* telefonda giriş pozu kısa: nehir hemen yana kıvrılır */
    const introUntil = portrait ? 1.5 * STEPS : FRONT_INTRO_UNTIL;

    let lastLeft: boolean | null = null;
    /* başlangıçta öne dönük (giriş pozu) */
    let lastFront: boolean | null = from < introUntil ? true : null;
    let lastPassed = -1;
    let frame = 0;

    const kick = requestAnimationFrame(() => {
      setMoving(true);
      setArrived((a) => Math.max(a, 0));
    });

    /* kendi saati: bir karede en fazla MAX_FRAME_MS ilerler */
    let clock = 0;
    let last = start;

    const animate = (now: number) => {
      clock += Math.min(MAX_FRAME_MS, Math.max(0, now - last));
      last = now;
      const progress = Math.min(1, clock / duration);

      /* sabit hız; yalnızca başta ve sonda yumuşak kalkış-duruş */
      const k = 0.06;
      const ease =
        progress < k
          ? (progress * progress) / (2 * k * (1 - k))
          : progress > 1 - k
            ? 1 - ((1 - progress) * (1 - progress)) / (2 * k * (1 - k))
            : (progress - k / 2) / (1 - k);

      const current = from + (to - from) * ease;

      /* yön: sola kıvrılınca sol; aşağı (izleyiciye) akarken ekrana döner */
      const a = pointAt(G.middle, current);
      const b = pointAt(G.middle, Math.min(to, current + 1.2));
      const dx = b.x - a.x;
      const dy = b.y - a.y;

      if (Math.abs(dx) > 0.4) {
        const left = dx < 0;
        if (left !== lastLeft) {
          lastLeft = left;
          setFacingLeft(left);
        }
      }

      /* nehir aşağı akarken ekrana döner (histerezis: titreme olmasın) */
      const ratio = dy / (Math.abs(dx) || 0.001);
      const front =
        current < introUntil ||
        (lastFront ? ratio > FRONT_EXIT : ratio > FRONT_ENTER);
      if (front !== lastFront) {
        lastFront = front;
        setFacingScreen(front);
      }

      /* geçtiği yetenekler toplanır */
      let passed = 0;
      while (
        passed < G.nodeIndexes.length &&
        G.nodeIndexes[passed] <= current + 0.5
      )
        passed++;
      if (passed !== lastPassed) {
        lastPassed = passed;
        setArrived((a) => Math.max(a, passed));
      }

      avatarRef.current = current;
      placeAvatar(current);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
        return;
      }

      setMoving(false);
      setArrived(NODES.length);

      /* nehrin çıkışına ulaştık: sayfa geçişi panel açılınca (aşağıda) */
    };

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(kick);
      cancelAnimationFrame(frame);
    };
  }, [rideGo, portrait, size.w, size.h, placeAvatar, G, entryK]);

  /* ==============================================================
     KAMERA
  ============================================================== */

  const scale = frame.sc;
  const panX = frame.px;
  const panY = frame.py;

  /* OTURAN KİŞİ: yetenekler panelinin karşısındaki boş alanın ortasında */
  const perchFree = size.w - PANEL_AREA(size.w);
  const perchW = Math.min(perchFree * 0.62, 440, size.h * 0.46);
  const perchH = perchW * PERCH_ASPECT;
  /* yalnızca roadmap sayfası doğrudan açılınca (finished) — akış sırasında yok */
  const showPerch = finished && !compactPanel && !portrait && perchW >= 180;

  /* KIYIDAKİ YETENEK ETİKETLERİ — her biri kendi kıyı noktasından dışa
     doğru yerleşir; başka bir etiketle çakışırsa biraz daha dışa itilir */
  const chipFont = portrait ? CHIP_FONT_PHONE : CHIP_FONT;
  const chipPositions = useMemo(
    () =>
      layoutChips(
        G,
        frameOf(size.w, size.h, portrait),
        size.w,
        size.h,
        portrait,
      ),
    [G, size.w, size.h, portrait],
  );

  /* PERFORMANS: arka plan ve nehir SVG'si her yetenek toplandığında
     (her render'da) yeniden kurulmasın — yalnızca boyut değişince */
  const background = useMemo(
    () => (
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
    ),
    [],
  );
  const riverSvg = useMemo(
    () => (
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        className="absolute"
        /* nehir çizim alanının dışına da taşar (panel keser) */
        overflow="visible"
        style={{
          /* nehir, node'larla aynı kamerada: toPx ile birebir hizalı */
          left: panX,
          top: panY,
          width: VW * scale,
          height: VH * scale,
        }}
      >
        <defs>
          {/* WATER */}

          <linearGradient
            id="rm-water"
            gradientUnits="userSpaceOnUse"
            x1="150"
            y1="0"
            x2={VW}
            y2={VH}
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
            x2={VW}
            y2={VH}
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

          {/* AKIŞ ÇİZGİLERİ İÇİN UÇLARDA SÖNME */}

          <linearGradient id="rm-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset=".2" stopColor="white" stopOpacity=".8" />
            <stop offset=".85" stopColor="white" stopOpacity=".9" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <mask id="rm-mask" maskUnits="userSpaceOnUse">
            <rect width={VW} height={VH} fill="url(#rm-fade)" />
          </mask>

          {/* RIVER CLIP */}

          <clipPath id="rm-clip">
            <path d={G.river} />
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

        <path d={G.river} fill="url(#rm-depth)" />

        {/* SU */}

        <g clipPath="url(#rm-clip)">
          <path d={G.surface} fill="url(#rm-water)" />

          {/* KOYU DERİNLİK BANTLARI */}

          {DARK_BANDS.map((ratio) => (
            <path
              key={ratio}
              d={G.lane(ratio)}
              fill="none"
              stroke="#04142b"
              strokeWidth="34"
              opacity=".28"
              filter="url(#rm-soft)"
              className="rm-dark"
            />
          ))}

          {/* İÇ CAM */}

          <path d={G.core} fill="url(#rm-core)" opacity=".75" />

          {/* AKIŞ ÇİZGİLERİ

                PERFORMANS: akan çizgiler hareketli olduğu için üzerlerinde
                SVG filtresi (bulanıklık / dalga) YOK — filtre her karede
                yeniden hesaplanıp ekranı yavaşlatıyordu. Parlaklık, çizgi
                kalınlığı ve opaklığıyla veriliyor. */}

          {/* SOFT STREAMS */}

          {SOFT_STREAMS.map((ratio, i) => (
            <path
              key={ratio}
              d={G.lane(ratio)}
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

          <g mask="url(#rm-mask)" className="rm-fine">
            {FINE_STREAMS.map((stream, i) => (
              <path
                key={`${stream.f}-${i}`}
                d={G.lane(stream.f)}
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

          <g className="rm-hl">
            {HIGHLIGHTS.map((ratio, i) => (
              <path
                key={ratio}
                d={G.lane(ratio)}
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
          </g>

          {/* MAIN STREAMS */}

          {STREAMS.map((stream, i) => (
            <path
              key={`${stream.f}-${i}`}
              d={G.lane(stream.f)}
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

          {/* BINARY — küçük ve sık; uçlarda söner (rm-mask) */}

          <g mask="url(#rm-mask)">
            {BINARY_LANES.map(([ratio, opacity, offset], i) => (
              <g key={ratio}>
                <path id={`rm-lane-${i}`} d={G.lane(ratio)} fill="none" />

                <text
                  fontFamily={MONO}
                  fontSize={BINARY_SIZE}
                  letterSpacing={BINARY_SPACING}
                  fill={C.ice}
                  opacity={opacity}
                >
                  <textPath href={`#rm-lane-${i}`} startOffset={offset}>
                    {BINARY[i]}
                  </textPath>
                </text>
              </g>
            ))}
          </g>
        </g>

        {/* DERE KENARLARI */}

        <path
          d={G.top}
          fill="none"
          stroke={C.steel}
          strokeWidth="1"
          opacity=".35"
        />

        <path
          d={G.bottom}
          fill="none"
          stroke={C.steelDim}
          strokeWidth="1"
          opacity=".3"
        />
      </svg>
    ),
    [G, VW, VH, scale, panX, panY],
  );

  const panelH = compactPanel
    ? Math.round(size.h * (portrait ? 0.88 : 0.9))
    : Math.min(Math.max(size.h * 0.86, 560), 820);
  const skillsPanel = useMemo(
    () => <CollectedSkillsPanel height={panelH} compact={compactPanel} />,
    [panelH, compactPanel],
  );

  /* nehirdeki kişi (geniş ekranda eğik nehir katmanının içinde, telefonda
     kesimsiz üst katmanda — aşağıda) */
  const walker = size.w > 0 &&
    /* sayfa yükselirken de girişte görünür (staged) */
    (arrived >= 0 || (staged && landed)) &&
    !finished &&
    /* yolculuk bitince kişi görünmez (ekranın altında beklemesin) */
    !panelOn &&
    !(allCollected && !moving) && (
      <WalkingAvatar
        elRef={avatarElRef}
        moving={moving}
        facingLeft={facingLeft}
        facingScreen={facingScreen}
        collecting={moving && arrived >= 1 && arrived <= NODES.length}
        pickKey={arrived}
        landing={landed && arrived < 0}
      />
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

      {background}

      {/* ======================================================
          ORTA KATMAN: NEHİR + CHIP + IŞIK

          Scroll ile ayrı hareket eden katman.
          Işık da bu katmanın içinde olduğu için
          eğim ne olursa olsun suyun üstünde kalır.
      ====================================================== */}

      {/* nehir lacivert cam panelin İÇİNDE kalır (kenarlarından taşmaz) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          clipPath: `inset(${PANEL_T * 100}% ${PANEL_L * 100}% round var(--glass-radius, 14px))`,
        }}
      >
        <div className="rm-river-layer pointer-events-none absolute inset-0">
          {/* nehir kendi katmanında: etiketler değişince koca nehir yeniden
            çizilmez (telefonda takılmanın asıl sebebi) */}
          <div className="rm-svg absolute inset-0">{riverSvg}</div>
          <div className="absolute inset-0">
            {/* ====================================================
            NEHİRDEKİ KİŞİ / IŞIK

            Node'ları topladıktan sonra aynı nehir üzerinde
            devam ederek ekranın sağ-alt çıkışına gidiyor.
        ==================================================== */}

            {/* (nehirle aynı katmanda: eğim ve kayma birebir aynı)
            KIYIDAKİ YETENEKLER — her biri geçilince altın yanıp söner */}
            {size.w > 0 &&
              NODES.map((node, i) => {
                if (phoneHidden(portrait, i)) return null;
                const pos = chipPositions[i];
                const collected = arrived >= node.number;
                return (
                  <div
                    key={node.number}
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    className="absolute z-10 w-max"
                    style={{
                      left: pos.left,
                      top: pos.top,
                      transform: "translate(-50%, -50%)",
                      maxWidth: portrait ? CHIP_MAX_PHONE : undefined,
                    }}
                  >
                    <div
                      className="flex items-center rounded-full font-mono"
                      style={{
                        padding: portrait ? "3px 8px" : "4px 9px",
                        lineHeight: portrait ? "13px" : "15px",
                        borderRadius: portrait ? 10 : undefined,
                        fontSize: chipFont,
                        letterSpacing: ".02em",
                        color: collected
                          ? C.goldLight
                          : "rgb(var(--c-a8eef6,168,238,246))",
                        background: "rgba(6,22,46,.72)",
                        border: `1px solid ${collected ? C.goldLight : "rgba(207,230,255,.28)"}`,
                        boxShadow: collected
                          ? `0 0 14px rgba(${C.goldRGB},.8)`
                          : `0 4px 12px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08)`,
                        opacity: collected ? 0 : 1,
                        transform: collected
                          ? "scale(.4) translateY(-14px)"
                          : "scale(1)",
                        /* telefonda bulanıklık yok (pahalı) */
                        filter:
                          collected && !portrait
                            ? "blur(4px) brightness(1.8)"
                            : "none",
                        transition: collected
                          ? "opacity 320ms ease-in 140ms, transform 320ms cubic-bezier(.5,0,.8,.4) 140ms, filter 320ms ease-in 140ms, color 120ms, border-color 120ms, box-shadow 120ms"
                          : "none",
                      }}
                    >
                      {node.name}
                    </div>
                    {/* yol haritası: her yetenek bir durak — harita iğnesi
                        etiketin ALTINDA */}
                    <MapPin
                      aria-hidden
                      className="absolute left-1/2 top-full"
                      size={portrait ? 12 : 15}
                      strokeWidth={1.7}
                      style={{
                        marginTop: 2,
                        transform: "translateX(-50%)",
                        color: collected
                          ? C.goldLight
                          : "rgb(var(--c-a8eef6,168,238,246))",
                        filter: `drop-shadow(0 0 4px rgba(${C.edgeRGB},.7))`,
                        opacity: collected ? 0 : 0.9,
                        transition: collected ? "opacity 320ms ease-in 140ms" : "none",
                      }}
                    />
                  </div>
                );
              })}

            {/* NEHRİN BAŞI İŞARETİ: hero'daki kişi atlarken buraya iner
                (SiteFlow her karede canlı okur). Kişinin oturduğu nokta. */}
            {size.w > 0 && (
              <div
                data-rm-entry
                aria-hidden
                className="pointer-events-none absolute top-0 left-0 size-0"
                style={{
                  transform: `translate3d(${
                    frame.px +
                    pointAt(G.middle, entryK).x * frame.sc +
                    (SEAT_X - 0.5) * AV_W
                  }px, ${
                    frame.py + pointAt(G.middle, entryK).y * frame.sc + AV_H * 0.04
                  }px, 0)`,
                }}
              />
            )}
            {!flat && walker}
          </div>
        </div>
      </div>
      {/* TELEFON / TABLET (katman düz): kişi cam panelin kesiminin DIŞINDA
          çizilir — nehrin başı panelin tam köşesinde, oraya oturabilsin */}
      {flat && (
        <div className="pointer-events-none absolute inset-0">{walker}</div>
      )}

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
          {skillsPanel}
        </div>

        {showPerch && (
          <RoadmapPerch
            instant
            width={perchW}
            left={Math.max(
              PANEL_AREA(size.w),
              size.w - perchW - size.w * PERCH_RIGHT,
            )}
            top={Math.max(40, size.h * PERCH_Y - perchH / 2)}
          />
        )}
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
  elRef,
  moving,
  facingLeft,
  facingScreen,
  collecting,
  pickKey,
  landing = false,
}: {
  /** üstten yeni indi: çöküp yaylanarak oturur */
  landing?: boolean;
  /** konumu üst bileşen doğrudan yazar (transform) */
  elRef: Ref<HTMLDivElement>;
  moving: boolean;
  facingLeft: boolean;
  facingScreen: boolean;
  collecting: boolean;
  pickKey: number;
}) {
  return (
    <div
      ref={elRef}
      className="pointer-events-none absolute top-0 left-0 z-20 will-change-transform"
      style={{
        width: AV_W,
        height: AV_H,
        /* konum: translate3d(x, y) translate(-50%, -96%) — ayaklar nehrin
           orta çizgisinde (placeAvatar yazar) */
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
          transformOrigin: `${SEAT_X * 100}% 100%`,
          /* hep ileriye (sağa) bakar; nehir sola kıvrılsa da geri dönmez */
          transform: facingLeft && FLIP_ON_LEFT ? "scaleX(-1)" : "none",
          transition: "transform 220ms, opacity 160ms ease",
          /* üstten inince çöküp yaylanarak oturur */
          animation: landing
            ? "rmAvLand 520ms cubic-bezier(.3,.8,.4,1) both"
            : undefined,
        }}
      >
        {/* Hız izi: kayarken arkasında buz mavisi ışık çizgileri */}
        <div
          className="absolute"
          style={{
            right: AV_W * 0.8, // sırtının arkasında
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

        {/* Oturmuş kişi (fotoğraf): kaydırakta kayar gibi eğik — kalçası
            suda, gövdesi yukarıda, ayakları aşağıda (önde) */}
        <div
          className="absolute inset-0"
          style={{
            /* ekrana dönerken yan poz daralarak söner (dönüyormuş gibi) */
            transform: `rotate(${SLIDE_TILT}deg) scaleX(${facingScreen ? 0.35 : 1})`,
            transformOrigin: `${SEAT_X * 100}% 100%`,
            opacity: facingScreen ? 0 : 1,
            transition: "transform 320ms ease, opacity 260ms ease",
          }}
        >
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
              transformOrigin: `${SEAT_X * 100}% ${SIT_LEDGE * 100}%`,
              animation: "rmAvBob .9s ease-in-out infinite",
            }}
          />
        </div>

        {/* EKRANA DÖNÜK POZ — yandan pozdan genişleyerek belirir */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FRONT_SRC}
          alt=""
          draggable={false}
          className="absolute max-w-none"
          style={{
            width: FRONT_W,
            height: FRONT_H,
            left: AV_W * SEAT_X - FRONT_W / 2,
            top: AV_H - FRONT_H * FRONT_LEDGE,
            transformOrigin: `50% ${FRONT_LEDGE * 100}%`,
            transform: `scaleX(${facingScreen ? 1 : 0.35})`,
            opacity: facingScreen ? 1 : 0,
            transition: "transform 320ms ease, opacity 260ms ease",
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
