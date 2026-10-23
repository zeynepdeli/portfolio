"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

/* =========================================================
   PORTRE DÖNÜŞÜM ANİMASYONU (parçacık morph)

   Küçük ışık parçacıkları sırayla üç şekle girer:
     1) ÇİPİN IŞIK HALKASI — halkanın üstünde doğar, döner
     2) "</>" KOD SİMGESİ   — halka çözülüp koda dönüşür
     3) PORTRE              — kod girdap gibi akar, her parçacık
                              fotoğraftaki kendi pikselinin rengini alır
   Sonunda gerçek fotoğraf belirir, parçacıklar kıvılcım gibi
   yükselip söner.

   ETKİLEŞİM: fare portrenin üstüne gelince fotoğraf yeniden
   parçacıklara ayrılır ve imleçten kaçar; fare çıkınca parçacıklar
   yerine dönüp fotoğrafı tekrar oluşturur.

   PERFORMANS: tek <canvas>, animasyon döngüsü yalnızca hareket varken
   çalışır (giriş ~4 sn + üzerine gelme). Sonra tamamen durur.
   "Hareketi azalt" ayarında doğrudan son kare gösterilir.
========================================================= */

type Props = {
  src: string;
  alt: string;
  /** portre kutusu (px) */
  width: number;
  height: number;
  /** halkanın merkezi ve yarıçapı — kutuya göre (px) */
  ring: { x: number; y: number; r: number };
  /** girişin başlama gecikmesi (sn) */
  delay?: number;
  /** animasyon hızı (1 = normal, 1.6 = %60 daha hızlı) */
  tempo?: number;
  /** animasyonsuz, doğrudan fotoğraf */
  instant?: boolean;
  /** giriş dönüşümü olmadan doğrudan fotoğraf, ama üzerine gelince
   *  parçacıklara ayrılma etkileşimi çalışır */
  introless?: boolean;
  /** KISA GİRİŞ: halka ve "</>" yok — parçacıklar portrenin ortasındaki
   *  ışıktan saçılıp doğrudan fotoğrafa akar, renklerini alır */
  burst?: boolean;
  /** <img> için ek stil (maske, filtre vb.) */
  imgStyle?: CSSProperties;
  objectPosition?: string;
};

/* zaman çizelgesi (sn, gecikmeden sonra) */
const T_RING = 0.0; // halka doğar
const T_CODE = 0.9; // halka → kod
const T_FACE = 1.9; // kod → portre
const T_REVEAL = 3.0; // gerçek fotoğraf belirir
const T_END = 4.2; // döngü durur
const MORPH = 1.0; // bir dönüşümün süresi
const STAGGER = 0.35; // parçacıklar arası en fazla gecikme

const GOLD: [number, number, number] = [242, 196, 128];

type P = {
  ring: [number, number];
  code: [number, number];
  face: [number, number];
  col: [number, number, number];
  d: number; // kişisel gecikme
  s: number; // girdap yönü/şiddeti
  size: number;
  // etkileşim (fiziksel) konumu
  x: number;
  y: number;
  vx: number;
  vy: number;
};

const ease = (v: number) =>
  v <= 0
    ? 0
    : v >= 1
      ? 1
      : v < 0.5
        ? 4 * v * v * v
        : 1 - Math.pow(-2 * v + 2, 3) / 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* prefers-reduced-motion: render sırasında güvenle okunur (SSR'da false) */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const readReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

/** bir şeklin opak piksellerinden n nokta seçer */
function samplePoints(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w: number,
  h: number,
  n: number,
  withColor = false,
): { pts: [number, number][]; cols: [number, number, number][] } {
  const scale = Math.min(1, 220 / Math.max(w, h)); // örnekleme çözünürlüğü
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const cv = document.createElement("canvas");
  cv.width = cw;
  cv.height = ch;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { pts: [], cols: [] };
  ctx.scale(scale, scale);
  draw(ctx, w, h);
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const cand: number[] = [];
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++)
      if (data[(y * cw + x) * 4 + 3] > 140) cand.push(y * cw + x);
  const pts: [number, number][] = [];
  const cols: [number, number, number][] = [];
  if (!cand.length) return { pts, cols };
  /* sabit tohumlu karıştırma → her yüklemede aynı dağılım */
  let seed = 1234;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) {
    const k = cand[Math.floor(rnd() * cand.length)];
    const px = k % cw;
    const py = (k / cw) | 0;
    pts.push([(px + rnd()) / scale, (py + rnd()) / scale]);
    if (withColor) cols.push([data[k * 4], data[k * 4 + 1], data[k * 4 + 2]]);
  }
  return { pts, cols };
}

export default function PortraitMorph({
  src,
  alt,
  width,
  height,
  ring,
  delay = 0,
  tempo = 1,
  instant = false,
  introless = false,
  burst = false,
  imgStyle,
  objectPosition = "50% 20%",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const partsRef = useRef<P[] | null>(null);
  const rafRef = useRef(0);
  const [revealed, setRevealed] = useState(false);
  const [hover, setHover] = useState(false);
  const hoverRef = useRef(false);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const phaseRef = useRef<"intro" | "idle" | "interact">("intro");

  /* tuval kutudan taşar: halka ve kıvılcımlar kesilmesin */
  const pad = Math.max(ring.r * 1.2, width * 0.35);
  const cw = width + pad * 2;
  const chh = height + pad * 2;

  /* ---------- ÜZERİNE GELİNCE: parçacıklara ayrıl, imleçten kaç ---------- */
  const startInteract = useCallback(() => {
    const cv = canvasRef.current;
    const parts = partsRef.current;
    if (!cv || !parts || phaseRef.current === "intro") return;
    if (phaseRef.current === "interact") return;
    phaseRef.current = "interact";
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    for (const p of parts) {
      p.x = p.face[0];
      p.y = p.face[1];
      p.vx = 0;
      p.vy = 0;
    }
    const step = () => {
      ctx.clearRect(0, 0, cw, chh);
      const m = mouseRef.current;
      const R = Math.max(50, width * 0.2);
      let moving = 0;
      for (const p of parts) {
        /* yay: yerine döner */
        let ax = (p.face[0] - p.x) * 0.06;
        let ay = (p.face[1] - p.y) * 0.06;
        if (hoverRef.current && m) {
          const dx = p.x - m.x;
          const dy = p.y - m.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / R) * 4.5;
            ax += (dx / d) * f + (-dy / d) * f * 0.35 * p.s; // itme + hafif girdap
            ay += (dy / d) * f + (dx / d) * f * 0.35 * p.s;
          }
        }
        p.vx = (p.vx + ax) * 0.82;
        p.vy = (p.vy + ay) * 0.82;
        p.x += p.vx;
        p.y += p.vy;
        const off = Math.abs(p.x - p.face[0]) + Math.abs(p.y - p.face[1]);
        if (off > 0.4 || Math.abs(p.vx) + Math.abs(p.vy) > 0.05) moving++;
        ctx.fillStyle = `rgb(${p.col[0]},${p.col[1]},${p.col[2]})`;
        ctx.fillRect(
          p.x + pad - p.size / 2 - 0.4,
          p.y + pad - p.size / 2 - 0.4,
          p.size + 1.4,
          p.size + 1.4,
        );
      }
      if (hoverRef.current || moving > parts.length * 0.02) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, cw, chh);
        phaseRef.current = "idle";
      }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
  }, [cw, chh, width, pad]);

  /* Hareketsiz mod: tercih ya da prop → fotoğraf animasyonsuz görünür */
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    readReducedMotion,
    () => false,
  );
  const skipAnimation = reduceMotion || instant;
  const canAnimate = width >= 10 && height >= 10;
  const imageReady = revealed || (canAnimate && (skipAnimation || introless));

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || width < 10 || height < 10) return;
    if (skipAnimation) return;
    let cancelled = false;
    /* GİRİŞSİZ (introless) kullanımda tuval yalnızca fareyle üstüne
       gelinince parçacıklara ayrılma için gerekir:
       - dokunmatik cihazda hiç kurulmaz (boş tam boy tuval GPU'da yer
         tutuyor, fotoğraf değişince yüzlerce ms'lik piksel okuma yapıyordu)
       - masaüstünde sayfa boştayken (animasyon araya girmeden) kurulur */
    const hoverable = window.matchMedia?.("(hover: hover)").matches ?? true;
    /* (girişsizde fotoğraf zaten görünür: imageReady) */
    if (introless && !hoverable) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const sizeCanvas = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(cw * dpr);
      cv.height = Math.round(chh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const img = new Image();
    img.decoding = "async";
    img.src = src;

    let idle = 0;
    const whenIdle = (fn: () => void) => {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      };
      if (w.requestIdleCallback)
        idle = w.requestIdleCallback(fn, { timeout: 4000 });
      else idle = window.setTimeout(fn, 1500);
    };

    img.onload = () => {
      if (cancelled) return;
      if (introless) {
        setRevealed(true);
        whenIdle(build);
        return;
      }
      build();
    };
    const build = () => {
      if (cancelled) return;
      sizeCanvas();
      const N = Math.round(
        Math.min(4200, Math.max(1200, (width * height) / 55)),
      );

      /* 3) PORTRE — fotoğrafın kutudaki "cover" yerleşimi */
      const ir = img.naturalWidth / img.naturalHeight;
      const br = width / height;
      const dw = ir > br ? height * ir : width;
      const dh = ir > br ? height : width / ir;
      const [ox, oy] = objectPosition
        .split(" ")
        .map((v) => parseFloat(v) / 100);
      const dx = (width - dw) * (Number.isNaN(ox) ? 0.5 : ox);
      const dy = (height - dh) * (Number.isNaN(oy) ? 0.2 : oy);
      const face = samplePoints(
        (c) => {
          c.drawImage(img, dx, dy, dw, dh);
          /* alt kısım sönüyor → parçacıklar da orada seyrelsin */
          c.globalCompositeOperation = "destination-out";
          const g = c.createLinearGradient(0, height * 0.8, 0, height);
          g.addColorStop(0, "rgba(0,0,0,0)");
          g.addColorStop(1, "rgba(0,0,0,1)");
          c.fillStyle = g;
          c.fillRect(0, 0, width, height);
        },
        width,
        height,
        N,
        true,
      );
      if (!face.pts.length) {
        setRevealed(true);
        return;
      }

      /* 2) KOD SİMGESİ "</>" — halkanın ortasında */
      const code = samplePoints(
        (c) => {
          const fs = ring.r * 1.05;
          c.font = `700 ${fs}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.fillStyle = "#fff";
          c.fillText("</>", ring.x, ring.y);
        },
        width,
        height,
        N,
      );
      /* kısa girişte başlangıç: portrenin ortasındaki ışık noktası */
      const core = { x: width / 2, y: height * 0.5 };
      const codePts = code.pts.length ? code.pts : face.pts;

      /* parçacıkları kur */
      let seed = 77;
      const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      const parts: P[] = face.pts.map((f, i) => {
        const a = (i / N) * Math.PI * 2 + rnd() * 0.05;
        const rr = ring.r * (0.97 + rnd() * 0.06);
        const rp: [number, number] = [
          ring.x + Math.cos(a) * rr,
          ring.y + Math.sin(a) * rr,
        ];
        const cr = rnd() * Math.min(width, height) * 0.06;
        const ca = rnd() * Math.PI * 2;
        const cp: [number, number] = [
          core.x + Math.cos(ca) * cr,
          core.y + Math.sin(ca) * cr,
        ];
        return {
          ring: burst ? cp : rp,
          code: burst ? cp : codePts[i % codePts.length],
          face: f,
          col: face.cols[i],
          d: rnd() * STAGGER,
          s: (rnd() - 0.5) * 2,
          size: 1 + rnd() * 1.3,
          x: f[0],
          y: f[1],
          vx: 0,
          vy: 0,
        };
      });
      partsRef.current = parts;

      if (introless) {
        /* giriş yok: fotoğraf hemen görünür, etkileşim hazır */
        ctx.clearRect(0, 0, cw, chh);
        setRevealed(true);
        phaseRef.current = "idle";
        return;
      }

      const t0 = performance.now() + delay * 1000;
      /* zaman çizelgesi: kısa girişte halka/kod adımları atlanır */
      const tCode = burst ? 0 : T_CODE;
      const tFace = burst ? 0.35 : T_FACE;
      const tReveal = burst ? 1.45 : T_REVEAL;
      const tEnd = burst ? 2.5 : T_END;

      const drawIntro = () => {
        /* rAF zaman damgası yerine performance.now (tutarlı saat) */
        const t = ((performance.now() - t0) / 1000) * tempo;
        ctx.clearRect(0, 0, cw, chh);
        if (t < 0) {
          rafRef.current = requestAnimationFrame(drawIntro);
          return;
        }
        /* halka ve kod ışık gibi parlar (lighter); portre fazında gerçek
           renkler görünsün diye normal çizim */
        ctx.globalCompositeOperation =
          t < tFace + 0.4 ? "lighter" : "source-over";
        const spin = burst ? 0 : t * 0.9; // halkanın dönüşü
        const fadeOut = clamp01((t - tReveal) / (tEnd - tReveal));
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          /* halka: dönerek doğar */
          const born = clamp01((t - T_RING - p.d) / 0.5);
          const ca = Math.cos(spin),
            sa = Math.sin(spin);
          const rx =
            ring.x + (p.ring[0] - ring.x) * ca - (p.ring[1] - ring.y) * sa;
          const ry =
            ring.y + (p.ring[0] - ring.x) * sa + (p.ring[1] - ring.y) * ca;
          /* halka → kod */
          const m1 = burst ? 1 : ease(clamp01((t - tCode - p.d) / MORPH));
          /* kod → portre */
          const m2 = ease(clamp01((t - tFace - p.d) / MORPH));
          let x = rx + (p.code[0] - rx) * m1;
          let y = ry + (p.code[1] - ry) * m1;
          x = x + (p.face[0] - x) * m2;
          y = y + (p.face[1] - y) * m2;
          /* girdap: dönüşüm sırasında yanlara savrulur */
          const w1 = Math.sin(m1 * Math.PI) * ring.r * 0.35 * p.s;
          const w2 = Math.sin(m2 * Math.PI) * ring.r * 0.55 * p.s;
          x += w1 * Math.cos(i) + w2 * Math.cos(i * 1.7 + t);
          y += w1 * Math.sin(i) + w2 * Math.sin(i * 1.7 + t);
          /* bitişte kıvılcım gibi yükselir */
          y -= fadeOut * fadeOut * (40 + p.s * 30);
          /* renk: altından fotoğrafın rengine */
          const c = m2;
          const r = GOLD[0] + (p.col[0] - GOLD[0]) * c;
          const g = GOLD[1] + (p.col[1] - GOLD[1]) * c;
          const b = GOLD[2] + (p.col[2] - GOLD[2]) * c;
          const alpha = born * (1 - fadeOut) * (0.6 + 0.4 * c);
          if (alpha <= 0.01) continue;
          ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha.toFixed(3)})`;
          /* portreye yaklaştıkça parçacıklar büyür → yüzey dolar */
          const sz = p.size * (1 + c * 1.3);
          ctx.fillRect(x + pad - sz / 2, y + pad - sz / 2, sz, sz);
        }
        ctx.globalCompositeOperation = "source-over";
        if (t >= tReveal - 0.55) setRevealed(true); // fotoğraf parçacıklar sönmeden belirmeye başlar
        if (t < tEnd) rafRef.current = requestAnimationFrame(drawIntro);
        else {
          ctx.clearRect(0, 0, cw, chh);
          phaseRef.current = "idle";
          if (hoverRef.current) {
            setHover(true);
            startInteract();
          }
        }
      };
      rafRef.current = requestAnimationFrame(drawIntro);
    };
    img.onerror = () => setRevealed(true);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle);
      window.clearTimeout(idle);
    };
  }, [
    src,
    width,
    height,
    cw,
    chh,
    pad,
    ring.x,
    ring.y,
    ring.r,
    delay,
    tempo,
    objectPosition,
    introless,
    burst,
    skipAnimation,
    startInteract,
  ]);

  const showImage = imageReady && !hover;

  return (
    <div
      className="absolute inset-0"
      onPointerEnter={() => {
        hoverRef.current = true;
        setHover(phaseRef.current !== "intro");
        startInteract();
      }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
        mouseRef.current = null;
        /* parçacıklar toplandıkça fotoğraf geri gelir */
        window.setTimeout(() => setHover(false), 450);
      }}
      style={{ pointerEvents: "auto" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="absolute inset-0 size-full"
        style={{
          objectFit: "cover",
          objectPosition,
          ...imgStyle,
          /* üzerine gelince tamamen kaybolmaz: parçacıkların arkasında soluk kalır */
          opacity: showImage ? 1 : hover ? 0.18 : 0,
          transform: showImage ? "scale(1)" : "scale(1.015)",
          transition:
            "opacity 700ms ease, transform 900ms cubic-bezier(.22,1,.36,1), filter 700ms",
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute"
        style={{ left: -pad, top: -pad, width: cw, height: chh }}
      />
    </div>
  );
}
