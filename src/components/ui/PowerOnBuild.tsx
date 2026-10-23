"use client";

import { useEffect, useRef, type RefObject } from "react";
import "./canvasPolyfill";

/* =========================================================
   SAHNE AÇILIŞI — TEK BİR IŞIK SÜRÜSÜ (bağlantılı morph)

   (HeroSection'da önce portre yakın çekimde oluşur; kamera geri
   çekilirken bu sürü PORTRENİN İÇİNDEN kopar ve sahneyi kurar.)
   Işık tozu tek bir sürü halinde sahneyi SIRAYLA, birbirine bağlı
   şekilde kurar:

     0) MENÜ      → sürü butonların çerçevesine ve yazılarına dönüşür,
                    butonlar o şekilden "baskı alır" gibi belirir
     1) İSİM      → aynı parçacıklar menüden kopup ismin harflerine akar
     2) SOSYAL    → isimden kopup LinkedIn / GitHub / Instagram
                    ikonlarının şekline dönüşür
     3) ÇİP       → ikonlardan kopup çipin ışık halkasına akar; orada
                    PortraitMorph devralır (halka → </> → portre)

   Her adımda parçacıklar bir önceki şeklin üstündeki yerinden kalkar →
   hepsi tek bir akış gibi görünür. Fiş takılması bundan SONRA olur
   (HeroSection "hero:built" olayını yayınlar, avatar onu bekler).

   HEDEFLER: öğeye `data-build` ve `data-build-order="0..3"` verilir.
   Şekil `data-build-shape` ile seçilir (boşlukla birden fazla):
     buttons → içindeki her <button>: yuvarlak çerçeve + yazısı
     text    → data-build-text yazısı (data-build-font px)
     icons   → içindeki her ikon <svg>'nin kendi şekli
     ring    → data-ring-x / y / r (bölüm koordinatında) çember
     frame   → öğenin kendi çerçevesi
   data-build="soft": parçacık yok, yalnızca yumuşakça belirir
   (data-build-delay sn sonra).

   PERFORMANS: tek canvas, ~4 sn sürer ve tamamen durur; öğelerin
   belirmesi yalnızca CSS opacity/filter geçişidir.
========================================================= */

const N = 1500; // sürüdeki parçacık sayısı
const TRAVEL = 0.75; // bir şekilden diğerine akış (sn)
const HOLD = 0.32; // şekilde bekleyip parlama (sn)
const FIRST = 0.35; // ilk şeklin oluşmaya başlaması
export const BUILD_STEP = TRAVEL + HOLD;
/** g. grubun oluştuğu an (sn) — HeroSection zamanlamaları buna göre */
export const groupReadyAt = (g: number) => FIRST + TRAVEL + g * BUILD_STEP;

const GOLD = [255, 214, 150];
const ICE = [214, 236, 255];

export const POWER_BUILD_CSS = `
  .pb-wait [data-build]:not(.pb-built) {
    opacity: 0 !important;
    filter: blur(6px) brightness(2.2);
  }
  .pb-wait [data-build="soft"]:not(.pb-built) { filter: none; }
  [data-build] {
    transition: opacity .55s ease, filter .9s cubic-bezier(.22,1,.36,1);
  }
  [data-build="soft"] { transition: opacity 1.2s ease; }
  @media (prefers-reduced-motion: reduce) {
    .pb-wait [data-build]:not(.pb-built) { opacity: 1 !important; filter: none; }
  }
`;

type Pt = [number, number];

/** bir çizim fonksiyonunun opak piksellerinden n nokta */
function sample(
  draw: (c: CanvasRenderingContext2D) => void,
  W: number,
  H: number,
  n: number,
  seed: number,
): Pt[] {
  const s = 0.5;
  const cw = Math.max(1, Math.round(W * s));
  const ch = Math.max(1, Math.round(H * s));
  const cv = document.createElement("canvas");
  cv.width = cw;
  cv.height = ch;
  const c = cv.getContext("2d", { willReadFrequently: true });
  if (!c) return [];
  c.scale(s, s);
  c.fillStyle = "#fff";
  c.strokeStyle = "#fff";
  draw(c);
  const d = c.getImageData(0, 0, cw, ch).data;
  const cand: number[] = [];
  for (let i = 0; i < cw * ch; i++) if (d[i * 4 + 3] > 120) cand.push(i);
  if (!cand.length) return [];
  let a = seed;
  const rnd = () => (a = (a * 9301 + 49297) % 233280) / 233280;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const k = cand[Math.floor(rnd() * cand.length)];
    out.push([((k % cw) + rnd()) / s, (((k / cw) | 0) + rnd()) / s]);
  }
  return out;
}

/** SVG ikonunu beyaz olarak resme çevirir */
function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const sz = Number(svg.getAttribute("width")) || 48;
    clone.setAttribute("width", String(sz * 2));
    clone.setAttribute("height", String(sz * 2));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.removeAttribute("style");
    const str = new XMLSerializer()
      .serializeToString(clone)
      .replace(/currentColor/g, "#fff");
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(str);
  });
}

type Shape = (c: CanvasRenderingContext2D) => void;

function shapesFor(
  el: HTMLElement,
  ox: number,
  oy: number,
  icons: Map<SVGSVGElement, HTMLImageElement | null>,
): Shape[] {
  const kinds = (el.dataset.buildShape || "frame").split(/\s+/);
  const out: Shape[] = [];
  const rel = (r: DOMRect) => ({
    x: r.left - ox,
    y: r.top - oy,
    w: r.width,
    h: r.height,
  });
  for (const k of kinds) {
    if (k === "frame") {
      const r = rel(el.getBoundingClientRect());
      out.push((c) => {
        c.lineWidth = 3;
        c.beginPath();
        c.roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 12);
        c.stroke();
      });
    } else if (k === "buttons") {
      el.querySelectorAll("button").forEach((b) => {
        const r = rel(b.getBoundingClientRect());
        if (r.w < 4) return;
        const label = (b.textContent || "").trim();
        const fs =
          parseFloat(getComputedStyle(b.querySelector("span") || b).fontSize) ||
          14;
        out.push((c) => {
          c.lineWidth = 2.5;
          c.beginPath();
          c.roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 12);
          c.stroke();
          if (label) {
            c.font = `700 ${fs}px ui-monospace, Menlo, monospace`;
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.fillText(label.split("").join(" "), r.x + r.w / 2, r.y + r.h / 2);
          }
        });
      });
    } else if (k === "text") {
      /* yazının yeri: içindeki başlık (data-avatar-name) varsa onun ortası */
      const h = el.querySelector<HTMLElement>("[data-avatar-name]");
      const r = rel((h || el).getBoundingClientRect());
      const text = el.dataset.buildText || "";
      const fs = Number(el.dataset.buildFont || 32);
      out.push((c) => {
        c.font = `700 ${fs}px ui-monospace, Menlo, monospace`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(text, r.x + r.w / 2, r.y + r.h / 2);
      });
    } else if (k === "icons") {
      const svgs = Array.from(
        el.querySelectorAll<SVGSVGElement>(
          "[data-build-icon] svg, svg[data-build-icon]",
        ),
      );
      svgs.forEach((s) => {
        const img = icons.get(s);
        if (!img) return;
        const r = rel(s.getBoundingClientRect());
        out.push((c) => c.drawImage(img, r.x, r.y, r.w, r.h));
      });
    } else if (k === "ring") {
      const x = Number(el.dataset.ringX);
      const y = Number(el.dataset.ringY);
      const rad = Number(el.dataset.ringR);
      out.push((c) => {
        c.lineWidth = 4;
        c.beginPath();
        c.arc(x, y, rad, 0, Math.PI * 2);
        c.stroke();
      });
    }
  }
  return out;
}

export default function PowerOnBuild({
  start,
  rootRef,
  onGroup,
  onDone,
  sourceSelector,
  onMeasured,
}: {
  /** true olunca açılış başlar */
  start: boolean;
  rootRef: RefObject<HTMLElement | null>;
  /** g. grup oluştuğunda çağrılır (0 menü, 1 isim, 2 sosyal, 3 çip) */
  onGroup?: (g: number) => void;
  onDone?: () => void;
  /** sürünün çıkacağı öğe (CSS seçici, kökün içinde) */
  sourceSelector?: string;
  /** yerler ölçüldü → kamera artık hareket edebilir */
  onMeasured?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef({ onGroup, onDone, onMeasured });
  const sourceRef = useRef(sourceSelector);

  /* En güncel callback / seçici (render sırasında değil, effect'te yazılır) */
  useEffect(() => {
    cbRef.current = { onGroup, onDone, onMeasured };
    sourceRef.current = sourceSelector;
  });

  useEffect(() => {
    if (!start) return;
    const root = rootRef.current;
    const cv = canvasRef.current;
    if (!root || !cv) return;
    const sourceSel = sourceRef.current;
    let cancelled = false;
    let raf = 0;
    const timers: number[] = [];
    /* hedefler: kamera katmanı + aynı bölümdeki (arka plandaki) yumuşak öğeler */
    const scope = root.closest<HTMLElement>(".pb-wait") || root;
    const all = Array.from(scope.querySelectorAll<HTMLElement>("[data-build]"));
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const finishAll = () => {
      all.forEach((el) => el.classList.add("pb-built"));
      cbRef.current.onMeasured?.();
      for (let g = 0; g < 4; g++) cbRef.current.onGroup?.(g);
      cbRef.current.onDone?.();
    };
    if (reduce || !root.closest(".pb-wait")) {
      finishAll();
      return;
    }

    (async () => {
      /* ikon resimlerini önceden hazırla (asenkron) */
      const iconSvgs = Array.from(
        root.querySelectorAll<SVGSVGElement>(
          "[data-build-icon] svg, svg[data-build-icon]",
        ),
      );
      const iconImgs = await Promise.all(iconSvgs.map(svgImage));
      const icons = new Map(
        iconSvgs.map((sv, k) => [sv, iconImgs[k]] as const),
      );
      if (cancelled) return;

      /* ÖLÇÜM: kök (kamera) yakınlaştırılmış olabilir → dönüşümü bir anlığına
         kaldırıp GERÇEK yerleri ölç, sonra geri koy (arada ekran çizilmez) */
      const prevT = root.style.transform;
      const prevTr = root.style.transition;
      root.style.transition = "none";
      root.style.transform = "none";
      const rr = root.getBoundingClientRect();
      const W = rr.width;
      const H = rr.height;

      /* yumuşak (parçacıksız) öğeler */
      for (const el of all) {
        if (el.dataset.build !== "soft") continue;
        const d = Number(el.dataset.buildDelay || 0);
        timers.push(
          window.setTimeout(() => el.classList.add("pb-built"), d * 1000),
        );
      }

      /* gruplar ve şekiller */
      const groups: { els: HTMLElement[]; shapes: Shape[]; pts: Pt[] }[] = [];
      for (const el of all) {
        if (el.dataset.build === "soft") continue;
        const g = Number(el.dataset.buildOrder || 0);
        (groups[g] ||= { els: [], shapes: [], pts: [] }).els.push(el);
      }
      const gs = groups.filter(Boolean);
      for (const g of gs)
        for (const el of g.els)
          g.shapes.push(...shapesFor(el, rr.left, rr.top, icons));
      /* sürünün çıkış yeri (ör. portre) */
      const src = sourceSel ? root.querySelector<HTMLElement>(sourceSel) : null;
      const sr = src?.getBoundingClientRect();
      const srcBox = sr
        ? {
            x: sr.left - rr.left,
            y: sr.top - rr.top,
            w: sr.width,
            h: sr.height,
          }
        : null;

      void root.offsetWidth;
      root.style.transform = prevT;
      void root.offsetWidth;
      root.style.transition = prevTr;
      cbRef.current.onMeasured?.();

      gs.forEach((g, gi) => {
        g.pts = sample(
          (c) => g.shapes.forEach((f) => f(c)),
          W,
          H,
          N,
          101 + gi * 17,
        );
      });
      if (cancelled) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      const ctx = cv.getContext("2d");
      if (!ctx) {
        finishAll();
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      let a = 4242;
      const rnd = () => (a = (a * 9301 + 49297) % 233280) / 233280;
      /* her parçacığın her gruptaki hedefi + başlangıç tozu */
      /* başlangıç: kaynak öğenin (portre) içinden kopan parçacıklar; yoksa toz */
      const dust: Pt[] = Array.from({ length: N }, () =>
        srcBox
          ? [
              srcBox.x + rnd() * srcBox.w,
              srcBox.y + srcBox.h * (0.08 + rnd() * 0.8),
            ]
          : [rnd() * W, rnd() * H],
      );
      const P = Array.from({ length: N }, () => ({
        lag: rnd() * 0.22, // sürü içinde hafif gecikme → akış dalgası
        curl: (rnd() - 0.5) * 1.1, // eğri yönü/şiddeti
        hot: rnd() < 0.28,
        size: 1 + rnd() * 1.2,
        ph: rnd() * 6.28,
      }));
      const path = [dust, ...gs.map((g) => (g.pts.length ? g.pts : dust))];

      /* grup zamanlayıcıları: oluşunca öğe belirir */
      gs.forEach((g, gi) => {
        const at = groupReadyAt(gi);
        timers.push(
          window.setTimeout(() => {
            g.els.forEach((el) => el.classList.add("pb-built"));
            cbRef.current.onGroup?.(gi);
          }, at * 1000),
        );
      });

      const last = gs.length - 1;
      const end = groupReadyAt(last) + HOLD + 0.35;
      const t0 = performance.now();
      const ease = (v: number) =>
        v <= 0
          ? 0
          : v >= 1
            ? 1
            : v < 0.5
              ? 4 * v * v * v
              : 1 - Math.pow(-2 * v + 2, 3) / 2;

      const frame = () => {
        const t = (performance.now() - t0) / 1000;
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < N; i++) {
          const p = P[i];
          /* hangi adımdayız: s. adım (dust→g0 = 0) */
          const tt = t - FIRST - p.lag;
          let step = Math.floor(tt / BUILD_STEP);
          let local = tt - step * BUILD_STEP;
          if (tt < 0) {
            step = 0;
            local = 0;
          }
          step = Math.min(step, last);
          const from = path[step][i];
          const to = path[step + 1][i];
          const m =
            tt < 0
              ? 0
              : step === last && tt > (last + 1) * BUILD_STEP
                ? 1
                : ease(Math.min(1, local / TRAVEL));
          /* eğri yol: ortada yana savrulur (girdap) */
          const dx = to[0] - from[0];
          const dy = to[1] - from[1];
          const bend = Math.sin(m * Math.PI) * p.curl * 0.35;
          let x = from[0] + dx * m - dy * bend;
          let y = from[1] + dy * m + dx * bend;
          /* şekildeyken hafif nefes */
          const holding = m >= 1;
          if (holding) {
            x += Math.sin(t * 4 + p.ph) * 0.6;
            y += Math.cos(t * 3.3 + p.ph) * 0.6;
          }
          let alpha = tt < 0 ? 0.22 : holding ? 0.95 : 0.45 + 0.5 * m;
          /* son şekil (çip halkası): PortraitMorph devralırken söner */
          const fade = Math.min(
            1,
            Math.max(0, (t - groupReadyAt(last) - HOLD * 0.5) / 0.35),
          );
          alpha *= 1 - fade;
          if (alpha <= 0.01) continue;
          const c = p.hot ? ICE : GOLD;
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
          const s = p.size * (holding ? 1.25 : 1);
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
        }
        ctx.globalCompositeOperation = "source-over";
        if (t < end) raf = requestAnimationFrame(frame);
        else {
          ctx.clearRect(0, 0, W, H);
          all.forEach((el) => el.classList.add("pb-built"));
          cbRef.current.onDone?.();
        }
      };
      raf = requestAnimationFrame(frame);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [start, rootRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-60 size-full"
    />
  );
}
