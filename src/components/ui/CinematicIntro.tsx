"use client";

import { useEffect, useRef, type RefObject } from "react";

/* =========================================================
   SİNEMATİK AÇILIŞ — "fotoğraf → çip → menü"

   A) IŞIK: sahne zifiri karanlık. İzleyicinin arkasındaki bir projektör
      titreyerek yanar; havada görünen hüzme (içinde toz zerreleri)
      karanlıkta yanlış bir yere düşer, sonra kişiyi bulup üstüne kayar.
      Portre önden aydınlanır, gölgesi arkasına düşer. Çip ve tabla
      gelince spotun irisi açılır; yerleşirken salon ışıkları yanar.
   B) ÇİP OLUŞUR: fotoğrafın etrafında ışık parçacıkları bir halka
      halinde doğar ve döner; halka çözülüp girdap gibi akarak ÇİPİN
      şekline girer. Parçacıklar sönerken gerçek çip belirir.
   C) YÖRÜNGE: çip kalkar, tabla gibi yatar ve portrenin etrafında
      döner — portre çipin ortasındaki BOŞLUKTAN geçer. Çipin üstünde
      menü ve sosyal butonların taslakları taşınır.
   D) YERLEŞME: çip ve portre yerine döner. Her taslak çipten kopunca
      ışık parçacıklarına dağılır; parçacıklar butonun KENDİ yerine akar
      ve butonun şeklini çizer, sonra gerçek buton belirir. İsim ekranın
      karşı tarafından (soldan) kayarak gelir.
   Bitti → onDone (avatar tırmanıp fişi takar).
========================================================= */

/** TÜM AÇILIŞIN HIZI: 1 = aşağıdaki süreler aynen, 1.35 = %35 daha hızlı.
 *  Bütün adımlar (çip, yörünge, butonlar, isim) birlikte hızlanır,
 *  geçişlerin birbirine göre zamanlaması bozulmaz. */
const SPEED = 1.45;

/* alttaki çember (parçacık halkası → çip) DAHA ERKEN ve HIZLI oluşur */
const T_CHIP_RING = 0.15; // parçacıklar halka olarak doğar
const T_CHIP_FORM = 0.4; // halka → çip
const CHIP_MORPH = 0.5;
const CHIP_STAGGER = 0.14;
const T_CHIP_REVEAL = 0.9; // gerçek çip belirir, parçacıklar söner
const REVEAL = 0.65; // çipin parıltıyla belirme süresi
const T_RING = 1.85; // çip kalkar
const RING_UP = 1.3; // kalkış (uzun → yumuşak)
const T_PIECES = 2.25; // taslaklar çipte belirir
const PIECE_STAGGER = 0.12;
const T_SETTLE = 4.5; // her şey yerine yerleşmeye başlar
const SETTLE = 1.7;
const LAND_STAGGER = 0.1;
const LAND = 1.35; // parçacıkların butona akışı
const T_NAME = 4.8; // isim karşıdan gelir

const NAME_DEPTH = 2400; // harflerin fırlatıldığı uzaklık (px, perspektifte)
const LETTER_STAGGER = 0.045; // harfler arası fırlatma aralığı (sn)
const THROW = 0.55; // bir harfin uçuş süresi (sn)
const SLAM = 2.1; // çarpınca öne taşma miktarı (easeOutBack gücü)
const SHAKE = 9; // çarpmada sahnenin sarsılması (px)
const PERSP = 1300;
const TILT = 64; // tabla eğimi (derece, rotateX)
const SPIN_V = 40; // dönüş hızı (°/sn)
const RING_RATIO = 0.215; // ışık halkası yarıçapı / plaka kenarı
const PLATE_HALF = 2.33; // plakanın yarı kenarı / halka yarıçapı
const PIECE_R = 1.9; // parçaların tabladaki yarıçapı / halka yarıçapı
const BAND_W = 0.75; // boşluk ile kenar arası şerit / halka yarıçapı
/** dönerken çipin ortasındaki YUVARLAK boşluğun yarıçapı / halka yarıçapı
 *  (plakanın yarı kenarı 2.33 — bunun altında kalmalı) */
const HOLE = 1.45;
const CHIP_ORBIT_OP = 0.9; // dönerken çipin opaklığı
const RING_SPREAD = 1.9; // parçacık halkası / ışık halkası yarıçapı

const CHIP_DROP = 3;
/** dönerken tablanın merkezi: ortadaki portrenin merkezinden ne kadar
 *  aşağıda (× portre boyu). 0.24 = kalça, büyüdükçe daha aşağı */
const ORBIT_DROP = 0.36;
/** dönerken tablanın dış yarıçapı / halka yarıçapı (tam yuvarlak kenar;
 *  plakanın yarı kenarı 2.33 → bunun altında kalırsa her yer dolu daire) */
const RING_OUTER = 2.3;

const RING_OUTER_MAX = 4.2;

const LIGHT_ON = 0.2;

/* FENER: yanar yanmaz DOĞRUDAN fotoğrafa tutulur (eskiden önce sola,
   yanlış yere düşüp sonra kişiyi buluyordu). Yalnızca hafifçe daralır. */
const SWEEP_AT = 0.2;
const SWEEP = 0.35;

const SWEEP_FROM_X = 0;
const SWEEP_FROM_Y = 0;

/** ışık yandıktan sonra çip / isim animasyonunun başlama gecikmesi (sn) */
const LIGHT_LEAD = 0.45;

const SPOT_EDGE_IN = 84;
const SPOT_EDGE_OUT = 97;

const BEAM_SRC_X = 0.06; // ortadan sağa kayma
const BEAM_SRC_Y = 0.3; // ekranın ne kadar üstünde

const BEAM_ALPHA = 0.16;

const MOTES = 120;

const FRONT_LIGHT = 0.3;

const SHADOW_DROP = 0.03; // gölgenin aşağı kayması (× portre boyu)
const SHADOW_BLUR = 0.045; // gölgenin yumuşaklığı (× portre boyu)
const SHADOW_OP = 0.6; // gölgenin koyuluğu

const GOLD: [number, number, number] = [242, 196, 128];
const CREAM: [number, number, number] = [255, 244, 225];

const ease = (v: number) =>
  v <= 0
    ? 0
    : v >= 1
      ? 1
      : v < 0.5
        ? 4 * v * v * v
        : 1 - Math.pow(-2 * v + 2, 3) / 2;
const easeOut = (v: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, v)), 3);
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

function sampleShape(
  draw: (c: CanvasRenderingContext2D) => void,
  w: number,
  h: number,
  n: number,
  seed = 1234,
): [number, number][] {
  const scale = Math.min(1, 260 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const cv = document.createElement("canvas");
  cv.width = cw;
  cv.height = ch;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.scale(scale, scale);
  draw(ctx);
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const cand: number[] = [];
  for (let i = 0; i < cw * ch; i++) if (data[i * 4 + 3] > 120) cand.push(i);
  if (!cand.length) return [];
  const rnd = rng(seed);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const k = cand[Math.floor(rnd() * cand.length)];
    pts.push([((k % cw) + rnd()) / scale, (((k / cw) | 0) + rnd()) / scale]);
  }
  return pts;
}

/** telefon / küçük ekran: daha az parçacık, düşük çözünürlüklü tuval
 *  (her karede binlerce nokta çizmek telefonu kasıyordu) */
const isLow = () =>
  typeof window !== "undefined" &&
  (window.innerWidth < 768 || window.matchMedia?.("(hover: none)").matches);

function makeCanvas(W: number, H: number) {
  const el = document.createElement("canvas");
  const dpr = Math.min(isLow() ? 1.25 : 2, window.devicePixelRatio || 1);
  el.width = Math.round(W * dpr);
  el.height = Math.round(H * dpr);
  el.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;`;
  const ctx = el.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { el, ctx };
}

function stripAll(c: HTMLElement) {
  const strip = (n: Element) => {
    n.removeAttribute("data-build");
    n.removeAttribute("data-piece");
    n.removeAttribute("data-avatar-hop");
    n.removeAttribute("data-avatar-name");
    n.removeAttribute("data-avatar-port");
    n.removeAttribute("id");
  };
  strip(c);
  c.querySelectorAll("*").forEach(strip);
}

type Piece = {
  group: HTMLElement;
  el: HTMLElement;
  w: number;
  h: number;
  hx: number; // yerinin merkezi
  hy: number;
  a0: number; // tabladaki açısı (derece)
  show: number; // tablada belirme anı
  land: number; // çipten kopuş anı
  front: boolean | null;

  target: [number, number][];

  from: [number, number][] | null;
  seed: number[];
};

/** OLUŞMAMIŞ HAL: öğenin yalnızca ışıktan taslağı — ince çerçeve,
 *  soluk iç ışık ve yazısı/ikonu çizgi halinde */
function makeWire(src: HTMLElement): HTMLElement {
  const cs = getComputedStyle(src);
  const w = document.createElement("div");
  const radius =
    cs.borderRadius && cs.borderRadius !== "0px" ? cs.borderRadius : "12px";
  w.style.cssText = `position:absolute;inset:0;border-radius:${radius};border:2px solid rgba(255,248,235,1);background:linear-gradient(180deg, rgba(14,20,42,.92), rgba(10,14,30,.82));box-shadow:0 0 22px rgba(var(--c-46beff,70,190,255),1), 0 0 4px rgba(255,248,235,.9), inset 0 0 14px rgba(var(--c-46beff,70,190,255),.45);display:flex;align-items:center;justify-content:center;overflow:hidden;`;
  const icon = src.querySelector("[data-build-icon] svg") as SVGElement | null;
  const label = (src.textContent || "").trim();
  if (icon) {
    const ic = icon.cloneNode(true) as SVGElement;
    ic.removeAttribute("style");
    ic.setAttribute("width", "45%");
    ic.setAttribute("height", "45%");
    ic.style.cssText =
      "color:transparent;stroke:rgba(255,248,235,.95);stroke-width:18px;opacity:1;filter:drop-shadow(0 0 4px rgba(255,220,170,.9));overflow:visible;";
    w.appendChild(ic);
  } else if (label && label.length * 10 < src.getBoundingClientRect().width) {
    const t = document.createElement("span");
    t.textContent = label;
    t.style.cssText =
      "font:600 13px ui-monospace,Menlo,monospace;letter-spacing:.3em;color:rgba(255,244,225,.95);text-shadow:0 0 8px rgba(255,200,140,.9);";
    w.appendChild(t);
  }
  const sc = document.createElement("div");
  sc.style.cssText =
    "position:absolute;inset:0;background:repeating-linear-gradient(0deg, rgba(var(--c-46beff,70,190,255),.12) 0 1px, transparent 1px 4px);";
  w.appendChild(sc);
  return w;
}

function buttonShape(
  src: HTMLElement,
  w: number,
  h: number,
  n: number,
  seed: number,
) {
  const br = parseFloat(getComputedStyle(src).borderTopLeftRadius) || 12;
  const r = Math.min(br, h / 2, w / 2);
  const label = (src.textContent || "").trim();
  const hasIcon = !!src.querySelector("[data-build-icon] svg");
  const showText = !hasIcon && label && label.length * 10 < w;
  return sampleShape(
    (c) => {
      c.strokeStyle = "#fff";
      c.fillStyle = "#fff";
      c.lineWidth = 2.6;
      c.beginPath();
      c.roundRect(1.5, 1.5, w - 3, h - 3, r);
      c.stroke();
      if (showText) {
        c.font = `700 ${Math.min(15, h * 0.34)}px ui-monospace, Menlo, monospace`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(label.split("").join(" "), w / 2, h / 2);
      } else {
        c.lineWidth = 2.2;
        c.beginPath();
        c.roundRect(w * 0.3, h * 0.3, w * 0.4, h * 0.4, Math.min(w, h) * 0.12);
        c.stroke();
      }
    },
    w,
    h,
    n,
    seed,
  );
}

export default function CinematicIntro({
  start,
  rootRef,
  backRef,
  title,
  titleTarget: titleTargetProp,
  focus: focusProp,
  ring: ringProp,
  chipAngle: chipAngleProp = 37,
  onCoreLanded,
  onTitleLanded,
  onSettle,
  onAvatarGo,
  onDone,
}: {
  start: boolean;

  rootRef: RefObject<HTMLElement | null>;

  backRef: RefObject<HTMLElement | null>;
  title: string;
  titleTarget: string;

  focus: { x: number; y: number; size: number };

  ring: { x: number; y: number; r: number };

  chipAngle?: number;
  onCoreLanded?: () => void;
  onTitleLanded?: () => void;
  onSettle?: () => void;
  onAvatarGo?: () => void;
  onDone?: () => void;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cb = useRef({
    onCoreLanded,
    onTitleLanded,
    onSettle,
    onAvatarGo,
    onDone,
  });
  /* Animasyon yalnızca `start` olunca bir kez kurulur; callback'lerin ve
     geometri prop'larının en güncel değeri ref'ten okunur. */
  const propsRef = useRef({
    focus: focusProp,
    ring: ringProp,
    chipAngle: chipAngleProp,
    titleTarget: titleTargetProp,
  });

  useEffect(() => {
    cb.current = { onCoreLanded, onTitleLanded, onSettle, onAvatarGo, onDone };
    propsRef.current = {
      focus: focusProp,
      ring: ringProp,
      chipAngle: chipAngleProp,
      titleTarget: titleTargetProp,
    };
  });

  useEffect(() => {
    if (!start) return;
    const { focus, ring, chipAngle, titleTarget } = propsRef.current;
    const root = rootRef.current;
    const back = backRef.current;
    const layer = layerRef.current;
    const front = frontRef.current;
    const veil = veilRef.current;
    const spot = spotRef.current;
    const titleEl = titleRef.current;
    if (!root || !back || !layer || !front || !veil || !spot || !titleEl)
      return;

    const groupsAll = Array.from(
      root.querySelectorAll<HTMLElement>("[data-build]"),
    );
    const finish = () => {
      groupsAll.forEach((g) => g.classList.add("pb-built"));
      cb.current.onCoreLanded?.();
      cb.current.onTitleLanded?.();
      cb.current.onSettle?.();
      cb.current.onAvatarGo?.();
      cb.current.onDone?.();
      layer.style.display = "none";
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }

    const rr = root.getBoundingClientRect();
    const W = rr.width;
    const H = rr.height;

    const chipFx = makeCanvas(W, H);
    const fx = makeCanvas(W, H);
    const beam = makeCanvas(W, H);
    if (!chipFx || !fx || !beam) {
      finish();
      return;
    }

    const S = W > H ? 1.15 : 1; // ortadayken hafif büyük
    const CX = W / 2;
    const CY = H * 0.5;
    const off = { x: CX - focus.x, y: CY - focus.y };
    const portraits: HTMLElement[] = [];
    root.querySelectorAll<HTMLElement>("[data-portrait]").forEach((el) => {
      el.style.animation = "none";
      const r = el.getBoundingClientRect();
      el.style.transformOrigin = `${focus.x - (r.left - rr.left)}px ${focus.y - (r.top - rr.top)}px`;
      el.style.willChange = "transform, opacity, filter";
      el.style.opacity = "0";
      (el.closest("[data-build]") as HTMLElement | null)?.classList.add(
        "pb-built",
      );
      portraits.push(el);
    });
    const placePortrait = (k: number, grow = 1) => {
      const v = `translate(${off.x * k}px, ${off.y * k}px) scale(${(1 + (S - 1) * k) * grow})`;
      portraits.forEach(
        (el) => (el.style.transform = k <= 0 && grow === 1 ? "" : v),
      );
    };
    placePortrait(1, 0.94);

    cb.current.onCoreLanded?.();

    const ph = focus.size * S;
    const pw = ph * 0.75;

    const ringC = {
      x: CX + (ring.x - focus.x) * S,
      y: CY + (ring.y - focus.y) * S + ring.r * S * CHIP_DROP,
    };
    const chip = root.querySelector<HTMLElement>('[data-piece="chip"]');
    const chipIn = (chip?.firstElementChild as HTMLElement | null) ?? null;
    const chipBaseOp = chipIn ? parseFloat(chipIn.style.opacity) || 1 : 1;

    const chipBaseFilter = chipIn?.style.filter ?? "";
    if (chipIn) chipIn.style.opacity = "0"; // parçacıklardan oluşacak
    const chipClip = document.createElement("div");
    chipClip.style.cssText = "position:absolute;inset:0;opacity:0;";
    let chipFront: HTMLElement | null = null;
    let chipFrontIn: HTMLElement | null = null;

    const chipO = { x: 0, y: 0 };
    if (chip) {
      chip.style.animation = "none";
      chip.style.transform = "none";
      chip.classList.add("pb-built");
      const cr = chip.getBoundingClientRect();
      const fr = front.getBoundingClientRect();
      chipO.x = ring.x - (cr.left - rr.left);
      chipO.y = ring.y - (cr.top - rr.top);
      chip.style.transformOrigin = `${chipO.x}px ${chipO.y}px`;
      chip.style.willChange = "transform";
      chipFront = chip.cloneNode(true) as HTMLElement;
      stripAll(chipFront);

      chipFront.style.left = `${cr.left - fr.left}px`;
      chipFront.style.top = `${cr.top - fr.top}px`;
      chipFront.style.right = "auto";
      chipFront.style.bottom = "auto";
      chipFrontIn = chipFront.firstElementChild as HTMLElement | null;
      chipClip.appendChild(chipFront);
      front.appendChild(chipClip);
    }
    /* tablanın yakın / uzak yarısı — çipin KENDİ düzleminde bir yarım
       düzlem. Gerçek çip uzak yarıyı, öndeki kopya yakın yarıyı çizer. */
    const P = (x: number, y: number) =>
      `${(chipO.x + x).toFixed(1)} ${(chipO.y + y).toFixed(1)}`;

    const halfQuad = (spinDeg: number, near: boolean) => {
      const B = ring.r * 4.4;
      const r = (spinDeg * Math.PI) / 180;
      const dx = Math.cos(r) * B;
      const dy = -Math.sin(r) * B;
      const g = near ? 1 : -1;
      const nx = Math.sin(r) * B * g;
      const ny = Math.cos(r) * B * g;
      return `M${P(dx, dy)} L${P(dx + nx, dy + ny)} L${P(-dx + nx, -dy + ny)} L${P(-dx, -dy)} Z`;
    };
    const f1 = (v: number) => v.toFixed(1);
    /* TAM HALKA: dışı RO, içi R yarıçaplı daire (çipin kendi düzleminde;
       eğilince elips görünür). evenodd → ortası boş. */
    const annulus = (RO: number, R: number) =>
      `M${P(-RO, 0)} A${f1(RO)} ${f1(RO)} 0 1 0 ${P(RO, 0)} A${f1(RO)} ${f1(RO)} 0 1 0 ${P(-RO, 0)} Z ` +
      `M${P(-R, 0)} A${f1(R)} ${f1(R)} 0 1 0 ${P(R, 0)} A${f1(R)} ${f1(R)} 0 1 0 ${P(-R, 0)} Z`;

    const halfAnnulus = (
      spinDeg: number,
      near: boolean,
      RO: number,
      R: number,
    ) => {
      const r = (spinDeg * Math.PI) / 180;
      const ux = Math.cos(r);
      const uy = -Math.sin(r);
      const sw = near ? 1 : 0; // yayın dönüş yönü: yakın tarafa doğru
      return (
        `M${P(ux * RO, uy * RO)} A${f1(RO)} ${f1(RO)} 0 0 ${sw} ${P(-ux * RO, -uy * RO)} ` +
        `L${P(-ux * R, -uy * R)} A${f1(R)} ${f1(R)} 0 0 ${1 - sw} ${P(ux * R, uy * R)} Z`
      );
    };
    const clipFor = (
      spinDeg: number,
      near: boolean | null,
      R: number,
      RO: number,
    ) => {
      if (R > 0)
        return `path(evenodd, "${near === null ? annulus(RO, R) : halfAnnulus(spinDeg, near, RO, R)}")`;
      return near === null ? "" : `path("${halfQuad(spinDeg, near)}")`;
    };

    /* çipin kare fotoğraf penceresi (ve yanardöner kenarı): boşluk açıkken
       gizlenir, yoksa yuvarlak deliğin etrafında kare görünür.
       Giriş animasyonunu ezmek için !important. */
    const dies: HTMLElement[] = [];
    [chip, chipFront].forEach((host) =>
      host
        ?.querySelectorAll<HTMLElement>(".cpu-die")
        .forEach((d) => dies.push(d)),
    );
    const setDies = (op: number) =>
      dies.forEach((d) =>
        op >= 0.999
          ? d.style.removeProperty("opacity")
          : d.style.setProperty("opacity", op.toFixed(3), "important"),
      );

    const rims: { el: HTMLElement; outer: boolean }[] = [];
    [chip, chipFront].forEach((host) => {
      if (!host) return;
      [false, true].forEach((outer) => {
        const el = document.createElement("div");
        el.style.cssText =
          "position:absolute;box-sizing:border-box;border-radius:50%;pointer-events:none;opacity:0;border:2px solid rgba(255,244,225,.9);box-shadow:0 0 14px rgba(var(--c-46beff,70,190,255),.9), 0 0 3px rgba(255,248,235,.9);";
        host.appendChild(el);
        rims.push({ el, outer });
      });
    });
    const placeRims = (R: number, RO: number, op: number) => {
      rims.forEach(({ el, outer }) => {
        const rr2 = outer ? RO - 1 : R + 2;
        el.style.left = `${chipO.x - rr2}px`;
        el.style.top = `${chipO.y - rr2}px`;
        el.style.width = `${rr2 * 2}px`;
        el.style.height = `${rr2 * 2}px`;
        el.style.opacity = op.toFixed(3);
      });
    };

    back.appendChild(chipFx.el);
    const chipParts = (() => {
      const plate = ring.r / RING_RATIO;
      const lead = plate * 0.075;
      const E = plate * 0.72 + lead; // döndürülmüş kare + pinler
      const B = E * 2;
      const ang = (chipAngle * Math.PI) / 180;
      const toCenter = (c: CanvasRenderingContext2D) => {
        c.translate(B / 2, B / 2);
        c.rotate(ang);
      };
      const N = isLow()
        ? Math.round(Math.min(900, Math.max(600, (plate * plate) / 160)))
        : Math.round(Math.min(2600, Math.max(1200, (plate * plate) / 90)));

      const body = sampleShape(
        (c) => {
          toCenter(c);
          c.fillStyle = "#fff";
          c.beginPath();
          c.arc(0, 0, ring.r * RING_OUTER, 0, Math.PI * 2);
          c.fill();
          c.globalCompositeOperation = "destination-out";
          c.beginPath();
          c.arc(0, 0, ring.r * HOLE, 0, Math.PI * 2);
          c.fill();
        },
        B,
        B,
        Math.round(N * 0.45),
        11,
      );

      const lines = sampleShape(
        (c) => {
          toCenter(c);
          c.strokeStyle = "#fff";
          c.fillStyle = "#fff";

          c.lineWidth = 4;
          c.beginPath();
          c.arc(0, 0, ring.r * RING_OUTER - 2, 0, Math.PI * 2);
          c.stroke();
          c.lineWidth = 6;
          c.beginPath();
          c.arc(0, 0, ring.r * HOLE + 3, 0, Math.PI * 2);
          c.stroke();
        },
        B,
        B,
        Math.round(N * 0.55),
        23,
      );
      const shape = body.concat(lines);
      const rnd = rng(77);
      return shape.map((pt, i) => {
        const a = (i / shape.length) * Math.PI * 2 + rnd() * 0.05;
        return {
          ra: a,

          rr: ring.r * S * RING_SPREAD * (0.96 + rnd() * 0.08),
          tx: ringC.x + (pt[0] - B / 2) * S,
          ty: ringC.y + (pt[1] - B / 2) * S,
          d: rnd() * CHIP_STAGGER,
          s: (rnd() - 0.5) * 2,
          size: 1.4 + rnd() * 1.5,
        };
      });
    })();
    let chipFxDone = false;
    const drawChipFx = (t: number) => {
      const ctx = chipFx.ctx;
      ctx.clearRect(0, 0, W, H);
      if (t < T_CHIP_RING) return;
      const fade = ease(clamp((t - T_CHIP_REVEAL) / 0.55));
      const PULSE = 1.1; // şok dalgası süresi
      if (fade >= 1 && t > T_CHIP_REVEAL + PULSE + 0.3) {
        chipFxDone = true;
        return;
      }
      ctx.globalCompositeOperation = "lighter";

      const u = t - T_CHIP_RING;
      const spin = 0.6 * u + 0.9 * u * u;
      if (fade < 1)
        for (let i = 0; i < chipParts.length; i++) {
          const p = chipParts[i];
          const born = easeOut(clamp((u - p.d * 0.6) / 0.3));
          const a = p.ra + spin;

          const rad = p.rr * (1.35 - 0.35 * born);
          const rx = ringC.x + Math.cos(a) * rad;
          const ry = ringC.y + Math.sin(a) * rad;
          const m = ease(clamp((t - T_CHIP_FORM - p.d) / CHIP_MORPH));
          const w = Math.sin(m * Math.PI) * ring.r * S * 0.5 * p.s;
          const x = rx + (p.tx - rx) * m + w * Math.cos(i * 1.7 + t);
          const y = ry + (p.ty - ry) * m + w * Math.sin(i * 1.7 + t);
          const alpha = born * (1 - fade) * (0.75 + 0.25 * m);
          if (alpha <= 0.01) continue;

          const col = GOLD.map((g, j) => (g + (CREAM[j] - g) * m) | 0);
          ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha.toFixed(3)})`;
          const sz = p.size * (1 + m * 0.5);
          ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
        }

      for (let k = 0; k < 2; k++) {
        const q = (t - T_CHIP_REVEAL + 0.1 - k * 0.18) / PULSE;
        if (q <= 0 || q >= 1) continue;
        const e = easeOut(q);
        const R = ring.r * S * (HOLE + e * (RING_OUTER * 1.6 - HOLE));
        const al = (1 - q) * (1 - q) * (k ? 0.35 : 0.6);
        ctx.strokeStyle = `rgba(${CREAM[0]},${CREAM[1]},${CREAM[2]},${al.toFixed(3)})`;
        ctx.lineWidth = 2 + 6 * (1 - e);
        ctx.beginPath();
        ctx.arc(ringC.x, ringC.y, R, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const holeNeed = 0.23 * focus.size * S;
    const scCap = (W * (W > H ? 0.5 : 0.62)) / (ring.r * PLATE_HALF * 1.414);
    const scUp = Math.min(scCap, Math.max(S * 1.1, holeNeed / ring.r));
    const orbitC = { x: CX, y: CY + focus.size * S * ORBIT_DROP };

    const spinRaw = (t: number) => {
      const u = Math.max(0, t - T_RING);
      return u < RING_UP
        ? (SPIN_V * u * u) / (2 * RING_UP)
        : SPIN_V * (u - RING_UP / 2);
    };
    const s0 = spinRaw(T_SETTLE);
    let rem = 90 - (s0 % 90);
    if (rem < 50) rem += 90;
    const m0 = (SPIN_V * SETTLE) / rem;
    const spinAt = (t: number) => {
      if (t <= T_SETTLE) return spinRaw(t);
      const d = clamp((t - T_SETTLE) / SETTLE);
      return (
        s0 +
        rem * (m0 * (d * d * d - 2 * d * d + d) + (-2 * d * d * d + 3 * d * d))
      );
    };

    const chipState = (t: number) => {
      const up = ease(clamp((t - T_RING) / RING_UP)); // kalkış
      const settle = ease(clamp((t - T_SETTLE) / SETTLE)); // yerine dönüş
      const k = 1 - settle; // ortada olma
      const a = up * k; // yörüngede olma
      const cx = ring.x + (ringC.x - ring.x) * k + (orbitC.x - ringC.x) * a;
      const cy = ring.y + (ringC.y - ring.y) * k + (orbitC.y - ringC.y) * a;
      const sc = (1 + (S - 1) * k) * (1 + (scUp / S - 1) * a);
      return { cx, cy, sc, tilt: TILT * a, spin: spinAt(t), a, k };
    };

    const picks: HTMLElement[] = [];
    root
      .querySelectorAll<HTMLElement>('[data-build-shape="buttons"] button')
      .forEach((b) => picks.push(b));
    root
      .querySelectorAll<HTMLElement>('[data-build-shape="frame"]')
      .forEach((b) => picks.push(b));
    root.querySelectorAll("[data-avatar-hop]").forEach((h) => {
      const a = h.closest("a") as HTMLElement | null;
      if (a) picks.push(a);
    });
    const pieces: Piece[] = [];
    picks.forEach((real, i) => {
      const r = real.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const box = document.createElement("div");
      box.style.cssText = `position:absolute;left:0;top:0;width:${r.width}px;height:${r.height}px;will-change:transform,opacity;opacity:0;`;
      box.appendChild(makeWire(real));
      const n = isLow()
        ? Math.round(Math.min(180, Math.max(80, (r.width * r.height) / 70)))
        : Math.round(Math.min(520, Math.max(170, (r.width * r.height) / 32)));
      const left = r.left - rr.left;
      const top = r.top - rr.top;
      const rnd = rng(31 + i * 7);
      pieces.push({
        group: (real.closest("[data-build]") as HTMLElement) || real,
        el: box,
        w: r.width,
        h: r.height,
        hx: left + r.width / 2,
        hy: top + r.height / 2,
        a0: (i / picks.length) * 360,
        show: T_PIECES + i * PIECE_STAGGER,
        land: T_SETTLE + 0.1 + i * LAND_STAGGER,
        front: null,
        target: buttonShape(real, r.width, r.height, n, 101 + i).map(
          ([x, y]) => [left + x, top + y],
        ),
        from: null,
        seed: Array.from({ length: 3 }, () => rnd()),
      });
    });
    const plateR = ring.r * scUp;
    const fitS = (p: Piece) =>
      Math.min(
        1,
        (BAND_W * plateR * 0.85) / p.h,
        (((2 * Math.PI * PIECE_R * plateR) / Math.max(1, pieces.length)) *
          0.85) /
          p.w,
      );

    front.appendChild(fx.el);

    const tgt = root.querySelector<HTMLElement>(titleTarget);

    if (tgt) tgt.style.visibility = "hidden";
    const tgtRect = tgt?.getBoundingClientRect();
    const nameTo =
      tgt && tgtRect
        ? {
            x: tgtRect.left - rr.left + tgtRect.width / 2,
            y: tgtRect.top - rr.top + tgtRect.height / 2,
            fs: parseFloat(getComputedStyle(tgt).fontSize) || 32,
          }
        : { x: W * 0.4, y: H * 0.4, fs: 32 };
    titleEl.style.fontSize = `${nameTo.fs}px`;

    titleEl.style.transform = `translate(${nameTo.x}px, ${nameTo.y}px) translate(-50%,-50%)`;
    const nameW = titleEl.getBoundingClientRect().width || nameTo.fs * 8;
    const letters: HTMLElement[] = Array.from(
      titleEl.querySelectorAll<HTMLElement>("[data-ch]"),
    );
    const nL = Math.max(1, letters.length);
    const lr = rng(909);

    const lSeed = letters.map(() => ({
      rx: (lr() - 0.5) * 160,
      ry: (lr() - 0.5) * 120,
      rz: (lr() - 0.5) * 60,
      dx: (lr() - 0.5) * W * 0.3,
      dy: (lr() - 0.5) * H * 0.25,
    }));

    const nameHit = T_NAME + (nL - 1) * LETTER_STAGGER + THROW * 0.55;
    const nameEnd = T_NAME + (nL - 1) * LETTER_STAGGER + THROW + 0.35;

    const sr = rng(4242);
    const sparks = Array.from({ length: 46 }, () => {
      const a = sr() * Math.PI * 2;
      return {
        x: nameTo.x + (sr() - 0.5) * nameW,
        y: nameTo.y + (sr() - 0.5) * nameTo.fs * 0.6,
        vx: Math.cos(a) * (120 + sr() * 380),
        vy: Math.sin(a) * (80 + sr() * 240),
        life: 0.35 + sr() * 0.45,
        size: 1.2 + sr() * 2,
      };
    });
    const backOut = (q: number) => {
      const c3 = SLAM + 1;
      return 1 + c3 * Math.pow(q - 1, 3) + SLAM * Math.pow(q - 1, 2);
    };

    const setVeilMask = (mask: string) => {
      veil.style.setProperty("mask-image", mask);
      veil.style.setProperty("-webkit-mask-image", mask);
    };
    setVeilMask("linear-gradient(#000, #000)"); // başta zifiri karanlık

    layer.insertBefore(beam.el, spot);
    const mr = rng(2718);
    const motes = Array.from({ length: isLow() ? 40 : MOTES }, () => ({
      u: 0.12 + mr() * 0.85, // hüzme boyunca
      v: mr() * 2 - 1, // hüzmenin enine
      ph: mr() * Math.PI * 2,
      sp: 0.4 + mr() * 1.2,
      size: 0.8 + mr() * 1.6,
    }));

    const lampAt = (tr: number) => {
      const u = tr - LIGHT_ON;
      if (u < 0) return 0;
      if (u < 0.05) return 1;
      if (u < 0.11) return 0.12;
      if (u < 0.15) return 0.85;
      if (u < 0.22) return 0.2;
      return 0.6 + 0.4 * easeOut((u - 0.22) / 0.25);
    };

    const aim = (q: number) => {
      const s = 1.25;
      const v = clamp(q) - 1;
      return 1 + (s + 1) * v * v * v + s * v * v;
    };

    const builtGroups = new Set<HTMLElement>();
    let nameCalled = false;
    let settleCalled = false;
    let avatarCalled = false;
    const endAt =
      Math.max(
        T_SETTLE + SETTLE,
        nameEnd + 0.35,
        ...pieces.map((p) => p.land + LAND * 1.25),
      ) + 0.3;
    const t0 = performance.now();
    let raf = 0;

    const cleanup = () => {
      placePortrait(0);
      portraits.forEach((el) => {
        el.style.willChange = "";
        el.style.opacity = "";
        el.style.filter = "";
      });
      if (chip) {
        chip.style.transform = "";
        chip.style.clipPath = "";
        chip.style.willChange = "";
      }
      if (chipIn) {
        chipIn.style.opacity = String(chipBaseOp);
        chipIn.style.filter = chipBaseFilter;
      }
      rims.forEach((r) => r.el.remove());
      setDies(1);
      root.style.translate = "";
      if (tgt) tgt.style.visibility = "";
      chipClip.remove();
      chipFx.el.remove();
      fx.el.remove();
      beam.el.remove();
      pieces.forEach((p) => p.el.remove());
    };

    const frame = () => {
      /* tr: gerçek zaman (ışık buna göre); t: geri kalan her şeyin zamanı,
         spot kişiyi bulduktan sonra başlar */
      const tr = ((performance.now() - t0) / 1000) * SPEED;
      const t = tr - LIGHT_LEAD;
      if (!avatarCalled && t >= T_PIECES) {
        avatarCalled = true;
        cb.current.onAvatarGo?.();
      }
      if (!settleCalled && t >= T_SETTLE) {
        settleCalled = true;
        cb.current.onSettle?.();
      }
      const st = chipState(t);
      const settle = 1 - st.k;

      const I = lampAt(tr); // lambanın gücü (titreme dahil)
      const houseUp = ease(clamp((t - T_SETTLE - 0.2) / 1.3)); // salon ışıkları
      const pScale = (1 + (S - 1) * st.k) / S; // portre yerine dönerken küçülür
      const vx = CX + (focus.x - CX) * settle;
      const vy = CY + (focus.y - CY) * settle;

      let sx = vx;
      let sy = vy;
      let rx = ph * 0.5 * pScale;
      let ry = ph * 0.62 * pScale;

      const top = vy - ph * 0.56 * pScale;
      const o1 = ease(clamp((t - T_CHIP_RING + 0.25) / 0.6)) * st.k;
      const bot1 = ringC.y + ring.r * S * RING_SPREAD * 1.2;
      sy += ((top + bot1) / 2 - sy) * o1;
      ry += (((bot1 - top) / 2) * 1.04 - ry) * o1;
      rx += (Math.max(rx, ring.r * S * RING_SPREAD * 1.45) - rx) * o1;

      const o2 = st.a;
      const plateRX = ring.r * scUp * RING_OUTER * 1.18;
      const plateRY = plateRX * Math.cos((TILT * Math.PI) / 180);
      const bot2 = Math.max(orbitC.y + plateRY * 1.1, vy + ph * 0.52 * pScale);
      sy += ((top + bot2) / 2 - sy) * o2;
      ry += (((bot2 - top) / 2) * 1.04 - ry) * o2;
      rx += (Math.max(rx, plateRX) - rx) * o2;

      const sweepQ = clamp((tr - SWEEP_AT) / SWEEP);
      const found = aim(sweepQ);
      const fromX = CX + W * SWEEP_FROM_X;
      const fromY = CY + H * SWEEP_FROM_Y;
      sx = fromX + (sx - fromX) * found;
      sy = fromY + (sy - fromY) * found;
      const shrink = 0.8 + 0.2 * easeOut(sweepQ);
      rx *= shrink;
      ry *= shrink;

      const hole = (1 - I).toFixed(3);
      const rim = Math.min(1, 0.6 + 0.4 * (1 - I)).toFixed(3);
      setVeilMask(
        `radial-gradient(ellipse ${f1(rx)}px ${f1(ry)}px at ${f1(sx)}px ${f1(sy)}px, rgba(0,0,0,${hole}) 0%, rgba(0,0,0,${hole}) ${SPOT_EDGE_IN}%, rgba(0,0,0,${rim}) ${SPOT_EDGE_OUT}%, #000 100%)`,
      );
      veil.style.opacity = String(1 - houseUp);

      {
        const b = beam.ctx;
        b.clearRect(0, 0, W, H);
        const bI = I * (1 - houseUp);
        if (bI > 0.01) {
          const srcX = CX + W * BEAM_SRC_X;
          const srcY = -H * BEAM_SRC_Y;
          const dx = sx - srcX;
          const dy = sy - srcY;
          const L = Math.hypot(dx, dy) || 1;
          const ux = dx / L;
          const uy = dy / L;
          const nx = -uy;
          const ny = ux;

          const half = Math.sqrt((rx * nx) ** 2 + (ry * ny) ** 2);
          const srcHalf = Math.min(W, H) * 0.012;
          b.globalCompositeOperation = "lighter";

          for (const k of [1, 0.82, 0.62, 0.4]) {
            const hw = half * k;
            const g = b.createLinearGradient(srcX, srcY, sx, sy);
            const a = BEAM_ALPHA * 0.25 * bI;
            g.addColorStop(0, `rgba(255,238,212,${(a * 1.6).toFixed(4)})`);
            g.addColorStop(0.55, `rgba(255,238,212,${(a * 0.7).toFixed(4)})`);
            g.addColorStop(1, `rgba(255,238,212,${(a * 0.25).toFixed(4)})`);
            b.fillStyle = g;
            b.beginPath();
            b.moveTo(srcX + nx * srcHalf * k, srcY + ny * srcHalf * k);
            b.lineTo(sx + nx * hw, sy + ny * hw);
            b.lineTo(sx - nx * hw, sy - ny * hw);
            b.lineTo(srcX - nx * srcHalf * k, srcY - ny * srcHalf * k);
            b.closePath();
            b.fill();
          }

          for (const m of motes) {
            const u = (m.u + tr * 0.012 * m.sp) % 1;
            if (u < 0.1) continue;
            const v = m.v + Math.sin(tr * m.sp + m.ph) * 0.06;
            const w = (srcHalf + (half - srcHalf) * u) * 0.92 * v;
            const x = srcX + dx * u + nx * w;
            const y = srcY + dy * u + ny * w;
            const tw = 0.35 + 0.65 * Math.sin(tr * 2.2 * m.sp + m.ph) ** 2;
            const al = bI * 0.55 * tw * Math.min(1, (u - 0.1) * 4);
            b.fillStyle = `rgba(255,244,228,${al.toFixed(3)})`;
            b.fillRect(x - m.size / 2, y - m.size / 2, m.size, m.size);
          }
          b.globalCompositeOperation = "source-over";
        }
      }

      /* spot kişinin üstündeyken yüze ve gövdeye vuran sıcak ışık
         (soft-light → üstüne pus binmez, gerçekten aydınlatır) */
      const onSubject = clamp(found);
      const light = I * onSubject * (1 - ease(clamp((t - T_SETTLE) / SETTLE)));
      const faceY = vy - ph * 0.12 * pScale;
      spot.style.background = `radial-gradient(ellipse ${f1(pw * 0.9 * pScale)}px ${f1(ph * 0.7 * pScale)}px at ${f1(vx)}px ${f1(faceY)}px, rgba(255,236,210,.7) 0%, rgba(255,236,210,.3) 50%, rgba(255,236,210,0) 100%)`;
      spot.style.opacity = light.toFixed(3);

      /* FOTOĞRAF: karanlıkta zaten orada — onu ortaya çıkaran ışık.
         Spot üstüne gelince önden aydınlanır, gölgesi arkasına düşer */
      const photoK = easeOut((tr - LIGHT_ON) / 0.3);
      const photoOp = String(photoK);
      const shadow =
        light > 0.01
          ? ` drop-shadow(0 ${f1(ph * SHADOW_DROP * pScale * light)}px ${f1(ph * SHADOW_BLUR * pScale)}px rgba(0,0,0,${(SHADOW_OP * light).toFixed(2)}))`
          : "";
      const photoFilter =
        light > 0.01
          ? `brightness(${(1 + FRONT_LIGHT * light).toFixed(3)}) contrast(${(1 + 0.08 * light).toFixed(3)}) saturate(${(1 + 0.06 * light).toFixed(3)})${shadow}`
          : "";
      portraits.forEach((el) => {
        el.style.opacity = photoOp;
        el.style.filter = photoFilter;
      });
      placePortrait(st.k, 0.94 + 0.06 * photoK);

      if (!chipFxDone) drawChipFx(t);

      const revealRaw = clamp((t - T_CHIP_REVEAL + 0.3) / REVEAL);
      const reveal = ease(revealRaw);

      const glow = 1 + 1.1 * (1 - easeOut(revealRaw));
      const pop = 0.92 + 0.08 * easeOut(revealRaw);
      const chipFilter =
        glow > 1.005
          ? `${chipBaseFilter} brightness(${glow.toFixed(3)})`.trim()
          : chipBaseFilter;
      /* çip belirdiği andan itibaren ortası yuvarlak ve boş; yerleşirken
         boşluk daralıp kapanır (yerindeki çip değişmez) */
      const holeK = reveal * st.k;
      const holeR = holeK > 0.02 ? ring.r * HOLE * holeK : 0;
      /* dış kenar: köşeler ve pinler kesilir → tam yuvarlak tabla.
         Yerleşirken dışa açılıp kare çipi geri verir. */
      const outerR =
        ring.r * (RING_OUTER_MAX - (RING_OUTER_MAX - RING_OUTER) * holeK);
      setDies(1 - holeK);

      if (chip) {
        const tf = `translate(${st.cx - ring.x}px, ${st.cy - ring.y}px) perspective(${PERSP}px) rotateX(${st.tilt.toFixed(2)}deg) rotateZ(${st.spin.toFixed(2)}deg) scale(${(st.sc * pop).toFixed(4)})`;
        chip.style.transform = tf;
        const op = String(
          (chipBaseOp + (CHIP_ORBIT_OP - chipBaseOp) * st.a) * reveal,
        );
        if (chipIn) {
          chipIn.style.opacity = op;
          chipIn.style.filter = chipFilter;
        }
        if (chipFront) {
          chipFront.style.transform = tf;
          if (chipFrontIn) {
            chipFrontIn.style.opacity = op;
            chipFrontIn.style.filter = chipFilter;
          }
          const f = clamp(st.a / 0.2);
          chipFront.style.clipPath = clipFor(st.spin, true, holeR, outerR);
          chipClip.style.opacity = String(f);
        }
        chip.style.clipPath = clipFor(
          st.spin,
          chipFront && clamp(st.a / 0.2) >= 1 ? false : null,
          holeR,
          outerR,
        );
        placeRims(holeR, outerR, holeR > 0 ? holeK : 0);
      }

      /* PARÇALAR: tablada dön → çipten kopunca parçacıklara dağıl →
         parçacıklar butonun yerine akıp şeklini çizer → gerçek buton */
      const ctx = fx.ctx;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      const pr = PIECE_R * ring.r * st.sc;
      for (const p of pieces) {
        const b = (t - p.land) / LAND; // kopuştan beri (0 → 1)
        const ang = ((((st.spin + p.a0) % 360) + 540) % 360) - 180;
        const c = Math.cos((ang * Math.PI) / 180);

        if (b < 0.2) {
          const s = fitS(p);
          p.el.style.transform = `translate(${st.cx - p.w / 2}px, ${st.cy - p.h / 2}px) perspective(${PERSP}px) rotateX(${st.tilt.toFixed(2)}deg) rotateZ(${ang.toFixed(2)}deg) translateY(${pr.toFixed(1)}px) scale(${s.toFixed(4)})`;
          const vis = easeOut((t - p.show) / 0.6) * (1 - clamp(b / 0.2));
          p.el.style.opacity = String(vis);
          const shade = 0.7 + 0.3 * ((c + 1) / 2);
          p.el.style.filter =
            shade < 0.99 ? `brightness(${shade.toFixed(2)})` : "none";
          const isFront = c > 0;
          if (p.front !== isFront) {
            p.front = isFront;
            (isFront ? front : back).appendChild(p.el);
          }
        } else if (p.el.style.opacity !== "0") p.el.style.opacity = "0";

        if (b >= 0 && !p.from) {
          const r = p.el.getBoundingClientRect();
          const rnd = rng(500 + Math.round(p.seed[0] * 1000));
          p.from = p.target.map(() => [
            r.left - rr.left + rnd() * r.width,
            r.top - rr.top + rnd() * r.height,
          ]);
        }
        if (p.from && b < 1.25) {
          const fade = clamp((b - 0.95) / 0.3);
          const n = p.target.length;
          for (let i = 0; i < n; i++) {
            const d = (((i * 37) % 100) / 100) * 0.22;
            const e = ease(clamp((b - d) / 0.72));
            const [ox, oy] = p.from[i];
            const [tx, ty] = p.target[i];
            const sw =
              Math.sin(e * Math.PI) *
              Math.min(90, p.w * 0.3) *
              (((i * 53) % 100) / 50 - 1);
            const x = ox + (tx - ox) * e + sw * Math.cos(i * 1.3);
            const y =
              oy +
              (ty - oy) * e +
              sw * Math.sin(i * 1.3) -
              Math.sin(e * Math.PI) * H * 0.04;
            const alpha = clamp(b * 8) * (1 - fade) * (0.75 + 0.25 * e);
            if (alpha <= 0.01) continue;
            const col =
              e < 1 ? GOLD.map((g, j) => (g + (CREAM[j] - g) * e) | 0) : CREAM;
            ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha.toFixed(3)})`;
            const sz = 1.5 + ((i * 17) % 10) / 8;
            ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
          }
        }

        if (b >= 0.85 && !builtGroups.has(p.group)) {
          const all = pieces.filter((q) => q.group === p.group);
          if (all.every((q) => t >= q.land + LAND * 0.85)) {
            builtGroups.add(p.group);
            p.group.classList.add("pb-built");
          }
        }
      }
      ctx.globalCompositeOperation = "source-over";

      /* İSİM: KARŞIDAN EKRANA ATILIR
         Her harf sahnenin derinliğinden dönerek fırlar, ekrana ÇARPAR
         (bir an öne taşıp geri oturur). Son harf çarpınca: sahne sarsılır,
         yazı parlar, arkasından şok dalgası ve kıvılcımlar yayılır. */
      {
        if (t >= T_NAME - 0.05)
          titleEl.style.opacity = String(1 - clamp((t - nameEnd) / 0.2));
        if (t > nameEnd + 0.2) titleEl.style.visibility = "hidden";
        for (let i = 0; i < letters.length; i++) {
          const L = letters[i];
          const q = clamp((t - T_NAME - i * LETTER_STAGGER) / THROW);
          if (q <= 0) {
            L.style.opacity = "0";
            continue;
          }
          const k = 1 - backOut(q); // >0: henüz yolda, <0: çarpıp öne taştı
          const far = Math.max(0, k);
          const z = k > 0 ? -NAME_DEPTH * k : -k * 700;
          const s = lSeed[i];
          L.style.opacity = clamp(q * 6).toFixed(3);
          L.style.transform = `translate3d(${(s.dx * far).toFixed(1)}px, ${(s.dy * far).toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${(s.rx * far).toFixed(1)}deg) rotateY(${(s.ry * far).toFixed(1)}deg) rotateZ(${(s.rz * far).toFixed(1)}deg)`;
          L.style.filter = far > 0.02 ? `blur(${(far * 6).toFixed(1)}px)` : "";
        }

        const since = t - nameHit;
        const flash = since > 0 ? Math.exp(-since * 6) : 0;
        titleEl.style.textShadow = `0 0 ${(22 + 60 * flash).toFixed(0)}px rgba(255,214,160,${(0.5 + 0.5 * flash).toFixed(2)}), 0 0 ${(3 + 12 * flash).toFixed(0)}px rgba(255,255,255,${(0.7 * flash).toFixed(2)})`;

        if (since > 0 && flash > 0.02) {
          const A = SHAKE * flash;
          const shakeX = (A * Math.sin(since * 95)).toFixed(1);
          const shakeY = (A * Math.cos(since * 77)).toFixed(1);
          root.style.translate = `${shakeX}px ${shakeY}px`;
          titleEl.style.translate = `${shakeX}px ${shakeY}px`;
        } else if (since > 0) {
          root.style.translate = "";
          titleEl.style.translate = "";
        }

        if (since > 0 && since < 0.9) {
          ctx.globalCompositeOperation = "lighter";
          for (let w = 0; w < 2; w++) {
            const q = (since - w * 0.08) / 0.7;
            if (q <= 0 || q >= 1) continue;
            const e = easeOut(q);
            ctx.strokeStyle = `rgba(${CREAM[0]},${CREAM[1]},${CREAM[2]},${((1 - q) * (1 - q) * (w ? 0.35 : 0.7)).toFixed(3)})`;
            ctx.lineWidth = 1 + 4 * (1 - e);
            ctx.beginPath();
            ctx.ellipse(
              nameTo.x,
              nameTo.y,
              nameW * (0.55 + 0.6 * e),
              nameTo.fs * (0.5 + 2.2 * e),
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          }
          for (const p of sparks) {
            const u = since / p.life;
            if (u >= 1) continue;
            const d = 1 - Math.pow(1 - u, 2); // yavaşlayarak savrulur
            const x = p.x + p.vx * p.life * d;
            const y = p.y + p.vy * p.life * d + 60 * since * since;
            const al = (1 - u) * 0.9;
            const col = GOLD.map((g, j) => (CREAM[j] + (g - CREAM[j]) * u) | 0);
            ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${al.toFixed(3)})`;
            ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
          }
          ctx.globalCompositeOperation = "source-over";
        }

        if (!nameCalled && t > nameEnd - 0.05) {
          nameCalled = true;
          if (tgt) tgt.style.visibility = "";
          (tgt?.closest("[data-build]") as HTMLElement | null)?.classList.add(
            "pb-built",
          );
          cb.current.onTitleLanded?.();
        }
      }

      if (t < endAt) raf = requestAnimationFrame(frame);
      else {
        cleanup();
        groupsAll.forEach((g) => g.classList.add("pb-built"));
        layer.style.display = "none";
        cb.current.onDone?.();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [start, rootRef, backRef]);

  return (
    <div
      ref={layerRef}
      className="pointer-events-none absolute inset-0 z-70"
      aria-hidden
    >
      <div
        ref={veilRef}
        className="absolute inset-0"
        style={{ background: "rgba(3,5,12,.96)" }}
      />

      <div
        ref={spotRef}
        className="absolute inset-0"
        style={{ opacity: 0, mixBlendMode: "soft-light" }}
      />

      <div ref={frontRef} className="absolute inset-0" />

      <div
        ref={titleRef}
        className="absolute top-0 left-0 font-mono whitespace-nowrap"
        style={{
          color: "rgb(var(--c-c4f7fb,196,247,251))",
          textShadow: "0 0 22px rgba(255,214,160,.5)",
          letterSpacing: ".02em",

          perspective: "900px",
          opacity: 0,
        }}
      >
        {title.split("").map((c, i) => (
          <span
            key={i}
            data-ch
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: 0,
              willChange: "transform, opacity",
            }}
          >
            {c}
          </span>
        ))}

        <span style={{ marginLeft: "0.125rem", opacity: 0 }}>_</span>
      </div>
    </div>
  );
}
