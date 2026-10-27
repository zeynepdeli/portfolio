"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { isPerfLite } from "./perfTier";
import { usePerfLite } from "./usePerfLite";
import type { CSSProperties, ReactNode } from "react";

type PanelInset = {
  left: string;
  right: string;
  top: string;
  bottom: string;
};

type SciFiBackgroundProps = {
  children?: ReactNode;
  panelBottom?: string;
  backdrop?: ReactNode;
  panelInset?: PanelInset;
  hudOnFrame?: boolean;
  /** Üst sokete fiş TAKILI çizilsin mi. Ana sayfada fişi avatar kendisi
   *  taktığı için HeroSection false verir; diğer sayfalarda takılı görünür. */
  plugged?: boolean;
  /** Üst orta soket hiç çizilmesin (ör. footer) */
  connector?: boolean;
};

/* =========================================================
   TEMA
   "ocean"  → "Ocean of Art" posterinin renkleri: siyaha yakın gece
              laciverti zemin + dağınık parlayan turkuaz ışık tozu
   "studio" → önceki çelik mavi stüdyo arka planı
========================================================= */
const THEME: "ocean" | "studio" = "ocean";

const OCEAN = {
  /* parçacık renkleri */
  cyan: [79, 216, 255],
  teal: [110, 245, 232],
  white: [225, 248, 255],
  /* ışık tozu nokta sayısı (0 = kapalı) */
  count: 700,
};

/* =========================================================
   PANEL GÖRÜNÜMÜ
   "metal" → cam DEĞİL: opak, gece laciverti dolgulu kasa paneli
             (fırçalanmış metal kenar, vidalar, havalandırma delikleri)
   "glass" → önceki şeffaf cam panel
========================================================= */
const PANEL_STYLE: "metal" | "glass" = "glass";

/* =========================================================
   CAM KALINLIĞI (PANEL_STYLE = "glass" iken)
   "thin"  → fotoğraftaki gibi: ince kenarlı, hafif renkli, arkadaki
             nebula içinden görünen tek parça cam kart. Zemin ile kart
             aynı bulutları paylaşır, böylece ikisi bir bütün olur.
   "thick" → önceki kalın, kırılmalı cam kenar + kasa vidaları
========================================================= */
const GLASS_LOOK: "thin" | "thick" = "thin";

/** Sağdaki süs HUD yazıları ([ANTIBUS | SKILLS HUB], [CONTACT CONN]) */
const SHOW_HUD = false;
const SHOW_CONNECTOR = true;

/* =========================================================
   REFERANS KART — "TRANSPARENT GLASS EFFECT" AYARLARI
   Renksiz: sadece bulanıklaştırır ve arkayı aydınlatır
========================================================= */

const GLASS = {
  radius: 30,
  blur: 4, // camın ortası: çok az bulanık, arkası net görünür
  thickness: 30, // cam kenarının kalınlığı (px)
  rimBlur: 12, // kalın kenardaki kırılma bulanıklığı
  rimBrightness: 1.22, // kenarda ışığın camın içinde toplanması
  edge: 0.55, // dış kenar çizgisi
  edgeWidth: 1.5,
};

/* =========================================================
   ARKA PLAN — REFERANS GÖRSELDEKİ ÇELİK MAVİ STÜDYO RENGİ
   Üst: koyu lacivert-çelik
   Orta: açık gri-mavi sis
   Alt: tekrar koyulaşan mavi + köşe vinyeti
========================================================= */

function Background() {
  if (THEME === "ocean") return <OceanBackground />;
  return (
    <>
      {/* Ana lacivert gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              180deg,
              rgb(var(--c-1e4d76,30,77,118)) 0%,
              rgb(var(--c-366486,54,100,134)) 14%,
              rgb(var(--c-46628a,70,98,138)) 30%,
              rgb(var(--c-627b9e,98,123,158)) 46%,
              rgb(var(--c-7a8faf,122,143,175)) 58%,
              rgb(var(--c-7489a8,116,137,168)) 68%,
              rgb(var(--c-5d7395,93,115,149)) 80%,
              rgb(var(--c-366486,54,100,134)) 90%,
              rgb(var(--c-1e4d76,30,77,118)) 100%
            )
          `,
        }}
      />

      {/* Ortadaki hafif stüdyo ışığı */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 70% 36% at 50% 60%,
              rgba(var(--c-aabad0,170,186,208),.42),
              rgba(var(--c-96a8c2,150,168,194),.18) 45%,
              transparent 75%
            )
          `,
        }}
      />

      {/* Köşe vinyeti */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 85% 75% at 50% 55%,
              transparent 50%,
              rgba(var(--c-366486,54,100,134),.45) 72%,
              rgba(var(--c-1e4d76,30,77,118),.85) 100%
            )
          `,
        }}
      />
    </>
  );
}

/* =========================================================
   İÇ KUTU — referanstaki "Lorem ipsum" kutusu
   Camdan daha koyu, kenarsız, yumuşak lacivert gölge gibi.
   Kullanım: <GlassInset>...</GlassInset>
========================================================= */

export function GlassInset({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl px-5 py-4 ${className}`}
      style={{
        background: `
          linear-gradient(
            100deg,
            rgba(var(--c-162a4a,22,42,74),.32) 0%,
            rgba(var(--c-162a4a,22,42,74),.22) 100%
          )
        `,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "inset 0 1px 0 rgba(var(--c-ffffff,255,255,255),.04)",
      }}
    >
      {children}
    </div>
  );
}

/* =========================================================
   MAVİ TİK İKONU — iç kutudaki işaret
========================================================= */

export function GlassCheck() {
  return (
    <span
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full"
      style={{
        background:
          "radial-gradient(circle at 35% 30%, rgb(var(--c-7fb0ec,127,176,236)), rgb(var(--c-4a82cc,74,130,204)))",
        boxShadow:
          "0 0 0 2px rgba(var(--c-ffffff,255,255,255),.18), 0 2px 6px rgba(var(--c-142850,20,40,80),.3)",
      }}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
        <path
          d="M3.5 8.5l3 3 6-7"
          stroke="rgb(var(--c-eaf2fc,234,242,252))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/* =========================================================
   CAMIN ARKASINDAKİ VARSAYILAN NESNELER
   Cam etkisinin görünmesi için arkada detay olmalı.
   `backdrop` prop'u verilirse bunun yerine o kullanılır.
========================================================= */

/* =========================================================
   OCEAN — gece laciverti zemin
========================================================= */

function OceanBackground() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 65% 55% at 60% 45%, rgb(var(--bg-glow-1,11,31,85)) 0%, rgb(var(--bg-glow-2,7,21,64)) 35%, transparent 75%),
            radial-gradient(ellipse 45% 35% at 25% 80%, rgba(var(--c-2896d2,40,150,210),.16), transparent 70%),
            radial-gradient(ellipse 35% 30% at 80% 20%, rgba(var(--c-4fd8ff,79,216,255),.08), transparent 70%),
            linear-gradient(180deg, rgb(var(--bg-1,2,4,15)) 0%, rgb(var(--bg-2,4,10,34)) 45%, rgb(var(--bg-3,3,8,32)) 70%, rgb(var(--bg-4,1,3,11)) 100%)
          `,
        }}
      />
      {/* BULANIK IŞIK BULUTLARI — palet tanımlarsa (--bg-blobs) panelin
          arkasında yumuşak, geçişli parlamalar (statik gradyan: performans dostu) */}
      <div
        className="absolute inset-0"
        style={{ background: "var(--bg-blobs, none)" }}
      />
      {/* DOKULU NEBULA — fractal noise ile çizilmiş lavanta bulut dokusu,
          bulutların şekliyle (--bg-blobs) maskelenir: düz gradyan yerine
          fotoğraftaki gibi tozlu, dağınık bulutlar. Statik SVG, bir kez
          çizilir. Yalnızca palet --bg-nebula tanımlarsa görünür. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: "var(--bg-nebula, 0)",
          WebkitMaskImage: "var(--bg-nebula-mask, var(--bg-blobs, none))",
          maskImage: "var(--bg-nebula-mask, var(--bg-blobs, none))",
        }}
      >
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 900 600"
          preserveAspectRatio="none"
        >
          {/* 1) koyu boşluklar: bulutların arasındaki derin indigo yarıklar */}
          <filter id="sfb-neb-dark" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.006 0.012"
              numOctaves={5}
              seed={4}
            />
            <feColorMatrix values="0 0 0 0 0.07  0 0 0 0 0.06  0 0 0 0 0.2  -2.6 0 0 0 1.25" />
          </filter>
          {/* 2) tozlu bulut dokusu: arduvaz-lavanta, ince yatay lifler */}
          <filter id="sfb-neb-light" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.007 0.016"
              numOctaves={6}
              seed={11}
            />
            <feColorMatrix values="0 0 0 0 0.58  0 0 0 0 0.5  0 0 0 0 0.74  3 0 0 0 -1.3" />
          </filter>
          <rect
            width="900"
            height="600"
            filter="url(#sfb-neb-dark)"
            opacity=".55"
          />
          <rect
            width="900"
            height="600"
            filter="url(#sfb-neb-light)"
            style={{ mixBlendMode: "screen" }}
          />
        </svg>
      </div>
      {/* SU IŞIĞI (caustic) — suyun dibine vuran kırık ışık ağı. Gürültünün
          yalnızca orta değerleri ince parlak çizgilere çevrilir; iki katman
          üst üste binince su yüzeyi dokusu çıkar. Yukarıda güçlü, derine
          indikçe söner. Statik SVG. Yalnızca palet --bg-caustic tanımlarsa. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: "var(--bg-caustic, 0)",
          mixBlendMode: "screen",
          /* palet --bg-caustic-filter ile rengini (ör. daha beyaz),
             --bg-caustic-mask ile nerede görüneceğini değiştirebilir */
          filter: "var(--bg-caustic-filter, none)",
          WebkitMaskImage:
            "var(--bg-caustic-mask, linear-gradient(180deg, #000 0%, rgba(0,0,0,.8) 40%, rgba(0,0,0,.3) 78%, transparent 100%))",
          maskImage:
            "var(--bg-caustic-mask, linear-gradient(180deg, #000 0%, rgba(0,0,0,.8) 40%, rgba(0,0,0,.3) 78%, transparent 100%))",
        }}
      >
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 900 600"
          preserveAspectRatio="xMidYMid slice"
        >
          {[
            { id: "sfb-caustic-a", f: "0.011 0.014", seed: 3, o: 1 },
            { id: "sfb-caustic-b", f: "0.02 0.026", seed: 8, o: 0.55 },
          ].map((l) => (
            <g key={l.id}>
              <filter id={l.id} x="0" y="0" width="100%" height="100%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={l.f}
                  numOctaves={2}
                  seed={l.seed}
                />
                <feComponentTransfer>
                  <feFuncR
                    type="table"
                    tableValues="0 0 0 0 .55 1 .55 0 0 0 0"
                  />
                </feComponentTransfer>
                <feColorMatrix values="0 0 0 0 .5  0 0 0 0 .9  0 0 0 0 1  1 0 0 0 0" />
                <feGaussianBlur stdDeviation=".45" />
              </filter>
              <rect
                width="900"
                height="600"
                filter={`url(#${l.id})`}
                opacity={l.o}
              />
            </g>
          ))}
        </svg>
      </div>
      {/* turkuaz ışık tozu — metal panelde panelin içinde çizilir (tek kopya) */}
      {OCEAN.count > 0 && PANEL_STYLE === "glass" && <ParticleOcean />}
      {/* köşe vinyeti */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 55%, rgba(var(--c-000000,0,0,0),var(--bg-vignette,.55)) 100%)",
        }}
      />
    </>
  );
}

/* =========================================================
   OCEAN — posterin renkleri: gecenin içinde dağınık turkuaz
   ışık tozu. Şekil/desen yok; noktalar rastgele dağılır,
   yavaşça yanıp söner ve hafifçe süzülür.
========================================================= */

/* PERFORMANS: noktalar bir kez çizilir (animasyon döngüsü yok).
   Işıltı, iki tuvalin opaklığının CSS ile karşılıklı değişmesiyle
   yapılır — bu yalnızca GPU'da birleştirme, işlemciyi yormaz. */
function drawDust(cv: HTMLCanvasElement, seed: number) {
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const r = cv.getBoundingClientRect();
  if (!r.width || !r.height) return;
  /* hafif modda (telefon vb.) tozlar yumuşak noktalar: 1x çözünürlük
     yeter. Her bölümde iki tam ekran tuval var; 2x'te ekran kartı
     belleğini 4 kat dolduruyor, telefonda takılmaya yol açıyordu. */
  const dpr = isPerfLite() ? 1 : Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);

  /* tohumlu rastgele: her çizimde aynı desen */
  let a = seed;
  const rand = () => {
    a = (a * 9301 + 49297) % 233280;
    return a / 233280;
  };
  /* tuval CSS değişkeni okuyamaz: tema paleti tanımlıysa oradan al */
  const cs = getComputedStyle(document.documentElement);
  const tone = (hex: string, fb: number[]) => {
    const v = cs.getPropertyValue(`--c-${hex}`).trim();
    return v ? v.split(",").map(Number) : fb;
  };
  const cyan = tone("4fd8ff", OCEAN.cyan);
  const teal = tone("6ef5e8", OCEAN.teal);
  const white = tone("e1f8ff", OCEAN.white);
  const n = Math.round(OCEAN.count / 2);
  for (let i = 0; i < n; i++) {
    const pick = rand();
    const big = rand() < 0.06;
    const c = pick < 0.55 ? cyan : pick < 0.9 ? teal : white;
    const x = rand() * r.width;
    const y = rand() * r.height;
    const rad = big ? 1.1 + rand() * 0.7 : 0.4 + rand() * 0.6;
    const alpha = big ? 0.5 + rand() * 0.4 : 0.12 + rand() * 0.38;
    if (big) {
      /* hâle: büyük, saydam bir daire (shadowBlur yerine — çok daha ucuz) */
      ctx.fillStyle = `rgba(${cyan.join(",")},${(alpha * 0.18).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, rad * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
    ctx.fillRect(x - rad / 2, y - rad / 2, rad * 1.6, rad * 1.6);
  }
}

function ParticleOcean() {
  const refA = useRef<HTMLCanvasElement>(null);
  const refB = useRef<HTMLCanvasElement>(null);
  /* hafif mod sonradan açılınca (SiteFlow ölçer) 1x çözünürlükle yeniden çiz */
  const lite = usePerfLite();

  useEffect(() => {
    const a = refA.current;
    const b = refB.current;
    if (!a || !b) return;
    let raf = 0;
    const redraw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        drawDust(a, 11);
        drawDust(b, 97);
      });
    };
    redraw();
    const ro = new ResizeObserver(redraw);
    ro.observe(a);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [lite]);

  return (
    <>
      <style>{`
        @keyframes poTw { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        .po-tw { animation: poTw 5s ease-in-out infinite; will-change: opacity; }
        @media (prefers-reduced-motion: reduce) { .po-tw { animation: none; } }
      `}</style>
      <canvas
        ref={refA}
        className="po-tw pointer-events-none absolute inset-0 size-full"
      />
      <canvas
        ref={refB}
        className="po-tw pointer-events-none absolute inset-0 size-full"
        style={{ animationDelay: "-2.5s" }}
      />
    </>
  );
}

function DefaultBackdrop() {
  /* ocean temasında ışık tozu zeminin parçası (Background içinde) */
  if (THEME === "ocean") return null;
  // Küçük, sade toplar — hepsi ekran içinde, cam üzerinden hero'da görünür
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Üst sol */}
      <div
        className="absolute rounded-full"
        style={{
          left: "7%",
          top: "9%",
          width: "9%",
          aspectRatio: "1",
          background:
            "radial-gradient(circle at 35% 30%, rgb(var(--c-5b88c4,91,136,196)), rgb(var(--c-2c548f,44,84,143)) 58%, rgb(var(--c-1b3866,27,56,102)) 100%)",
          boxShadow: "0 14px 30px rgba(var(--c-0a1832,10,24,50),.35)",
        }}
      />

      {/* Üst sağ */}
      <div
        className="absolute rounded-full"
        style={{
          right: "9%",
          top: "7%",
          width: "6%",
          aspectRatio: "1",
          background:
            "radial-gradient(circle at 35% 30%, rgb(var(--c-dbe5f2,219,229,242)), rgb(var(--c-9fb4d2,159,180,210)) 60%, rgb(var(--c-6d87ad,109,135,173)) 100%)",
          boxShadow: "0 14px 30px rgba(var(--c-0a1832,10,24,50),.35)",
        }}
      />

      {/* Sol alt köşe */}
      <div
        className="absolute rounded-full"
        style={{
          left: "5%",
          bottom: "9%",
          width: "11%",
          aspectRatio: "1",
          background:
            "radial-gradient(circle at 35% 30%, rgb(var(--c-5b88c4,91,136,196)), rgb(var(--c-2c548f,44,84,143)) 58%, rgb(var(--c-1b3866,27,56,102)) 100%)",
          boxShadow: "0 14px 30px rgba(var(--c-0a1832,10,24,50),.35)",
        }}
      />

      {/* Sağ alt */}
      <div
        className="absolute rounded-full"
        style={{
          right: "12%",
          bottom: "14%",
          width: "5%",
          aspectRatio: "1",
          background:
            "radial-gradient(circle at 35% 30%, rgb(var(--c-7d9fcf,125,159,207)), rgb(var(--c-4a6fa5,74,111,165)) 60%, rgb(var(--c-2c4a78,44,74,120)) 100%)",
          boxShadow: "0 14px 30px rgba(var(--c-0a1832,10,24,50),.35)",
        }}
      />

      {/* Üst orta küçük */}
      <div
        className="absolute rounded-full"
        style={{
          left: "44%",
          top: "5%",
          width: "3%",
          aspectRatio: "1",
          background:
            "radial-gradient(circle at 35% 30%, rgb(var(--c-dbe5f2,219,229,242)), rgb(var(--c-9fb4d2,159,180,210)) 60%, rgb(var(--c-6d87ad,109,135,173)) 100%)",
          boxShadow: "0 14px 30px rgba(var(--c-0a1832,10,24,50),.35)",
        }}
      />
    </div>
  );
}

/* =========================================================
   CAM KENARLARI
   Referansta kenar düzgün ve tek parça; sadece içte
   çok hafif bir parlama var. Dağınık ışık çizgisi yok.
========================================================= */

function GlassEdges() {
  // Ortaya renk verilmez; kalınlık kenar bloğundan gelir.
  const t = useRimThickness();
  const rim = `blur(${GLASS.rimBlur}px) brightness(${GLASS.rimBrightness})`;

  return (
    <>
      {/* 1) Kalın kenar bloğu: ışık camın kenarında kırılıp toplanır */}
      <div
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
        style={{
          padding: t,
          backdropFilter: rim,
          WebkitBackdropFilter: rim,
          WebkitMask:
            "linear-gradient(rgb(var(--c-000000,0,0,0)) 0 0) content-box, linear-gradient(rgb(var(--c-000000,0,0,0)) 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(rgb(var(--c-000000,0,0,0)) 0 0) content-box exclude, linear-gradient(rgb(var(--c-000000,0,0,0)) 0 0)",
        }}
      />

      {/* 2) Pah: üst-sol ışık alır, alt-sağ gölgede kalır — hacim hissi */}
      <div
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
        style={{
          boxShadow:
            THEME === "ocean"
              ? `
            inset 3px 3px 0 rgba(var(--c-8ce1ff,140,225,255),.22),
            inset -3px -3px 0 rgba(var(--c-000000,0,0,0),.45),
            inset 12px 12px 22px rgba(var(--c-4fd8ff,79,216,255),.06),
            inset -14px -14px 24px rgba(var(--c-000000,0,0,0),.35)
          `
              : `
            inset 4px 4px 0 rgba(var(--c-ffffff,255,255,255),.38),
            inset -4px -4px 0 rgba(var(--c-0e1a32,14,26,50),.32),
            inset 12px 12px 22px rgba(var(--c-ffffff,255,255,255),.12),
            inset -14px -14px 24px rgba(var(--c-0e1a32,14,26,50),.26)
          `,
        }}
      />

      {/* 3) Kenar bloğunun iç sınırı — camın düz yüzeyinin başladığı yer */}
      <div
        className="pointer-events-none absolute z-20"
        style={{
          inset: t,
          borderRadius: Math.max(GLASS.radius - t, 8),
          boxShadow: `
            0 0 0 1px rgba(var(--c-ffffff,255,255,255),.18),
            -2px -2px 0 1px rgba(var(--c-0e1a32,14,26,50),.22),
            2px 2px 0 0 rgba(var(--c-ffffff,255,255,255),.10)
          `,
        }}
      />
    </>
  );
}

/* =========================================================
   ANA CAM PANEL
========================================================= */

/* =========================================================
   METAL (CAM OLMAYAN) PANEL
   İçi posterin gece laciverti + ışık tozu; kenarı opak fırçalanmış
   metal çerçeve, iç kenarda ince pah çizgisi.
   Palet --panel-nebula tanımlarsa panelin içinden de yumuşak
   nebula bulutları geçer; --frame-opacity metal çerçeveyi
   arka plana iter (ikisi de yoksa görünüm aynen eskisi).
========================================================= */
function MetalPanel({
  children,
  inset,
  backdrop,
}: {
  children?: ReactNode;
  inset: PanelInset;
  backdrop?: ReactNode;
}) {
  const t = useRimThickness();
  const neg = (v: string) => `calc(${v} * -1)`;
  return (
    <div
      className="absolute z-10 overflow-hidden"
      style={{
        left: inset.left,
        right: inset.right,
        top: inset.top,
        bottom: inset.bottom,
        borderRadius: GLASS.radius,
        border: "1.5px solid rgba(var(--c-78dcff,120,220,255),.32)",
        background: `
          radial-gradient(ellipse 60% 55% at 58% 45%, rgb(var(--panel-glow-1,12,34,88)) 0%, rgb(var(--panel-glow-2,8,24,70)) 40%, transparent 78%),
          radial-gradient(ellipse 45% 35% at 22% 85%, rgba(var(--c-2896d2,40,150,210),.14), transparent 70%),
          linear-gradient(180deg, rgb(var(--panel-1,4,11,38)) 0%, rgb(var(--panel-2,6,18,55)) 50%, rgb(var(--panel-3,3,9,32)) 100%)
        `,
        /* paletin --panel-halo'su varsa panel arkadaki bulanık ışığa karışır */
        boxShadow:
          "var(--panel-halo, 0 30px 70px rgba(var(--c-000000,0,0,0),.65), 0 0 0 1px rgba(var(--c-000000,0,0,0),.5))",
        isolation: "isolate",
      }}
    >
      {/* panelin içindeki nebula bulutları (yalnızca palet tanımlarsa) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--panel-nebula, none)" }}
      />

      {/* ışık tozu panelin içinde de */}
      {THEME === "ocean" && OCEAN.count > 0 && <ParticleOcean />}

      {/* sayfanın arka katmanı (ör. hero'daki arka devre izleri):
          cam yokken panelin içinde, ekran koordinatlarında çizilir */}
      {backdrop && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: neg(inset.left),
            right: neg(inset.right),
            top: neg(inset.top),
            bottom: neg(inset.bottom),
          }}
        >
          {backdrop}
        </div>
      )}

      <div className="absolute inset-0 z-10">{children}</div>

      {/* opak metal çerçeve */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
        style={{
          padding: t,
          background: `
            repeating-linear-gradient(90deg, rgba(var(--c-ffffff,255,255,255),.03) 0 1px, transparent 1px 3px),
            linear-gradient(180deg, rgb(var(--c-123d6e,18,61,110)) 0%, rgb(var(--c-0a2850,10,40,80)) 45%, rgb(var(--c-061a38,6,26,56)) 100%)
          `,
          WebkitMask:
            "linear-gradient(rgb(var(--c-000000,0,0,0)) 0 0) content-box, linear-gradient(rgb(var(--c-000000,0,0,0)) 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(rgb(var(--c-000000,0,0,0)) 0 0) content-box exclude, linear-gradient(rgb(var(--c-000000,0,0,0)) 0 0)",
          boxShadow:
            "inset 0 1px 0 rgba(var(--c-cfe6ff,207,230,255),.35), inset 0 -2px 0 rgba(var(--c-000000,0,0,0),.4)",
          opacity: "var(--frame-opacity, 1)",
        }}
      />
      {/* çerçevenin iç kenarı: ekranın başladığı yer (içe pah) */}
      <div
        aria-hidden
        className="pointer-events-none absolute z-20"
        style={{
          inset: t,
          borderRadius: Math.max(GLASS.radius - t, 8),
          boxShadow: `
            0 0 0 1px rgba(var(--c-78dcff,120,220,255),.28),
            0 -1px 0 1px rgba(var(--c-000000,0,0,0),.45),
            inset 0 8px 18px rgba(var(--c-000000,0,0,0),.45),
            inset 0 0 0 1px rgba(var(--c-000000,0,0,0),.35)
          `,
        }}
      />
    </div>
  );
}

/* =========================================================
   İNCE CAM KART — fotoğraftaki görünüm
   Opak değil: zemin rengiyle aynı tonda, yarı saydam lacivert-indigo
   bir cam. Arkadaki nebula bulutları ve ışık tozu camın içinden
   görünür, bu yüzden zemin ve kart tek parça gibi akar. Kenarda tek
   ince açık çizgi, üstte cam yansıması, içte hafif ışıma.
========================================================= */
function ThinGlassPanel({
  children,
  inset,
}: {
  children?: ReactNode;
  inset: PanelInset;
}) {
  const blur = "blur(var(--glass-blur, 2px)) saturate(1.15)";
  return (
    <div
      className="absolute z-10 overflow-hidden"
      style={{
        left: inset.left,
        right: inset.right,
        top: inset.top,
        bottom: inset.bottom,
        borderRadius: "var(--glass-radius, 18px)",
        /* --panel-fill: paletin tam panel dolgusu (ör. ortası açık, kenarı
           zemin tonuna eriyen geçiş). Yoksa yarı saydam varsayılan renk. */
        background: `var(--panel-fill,
          radial-gradient(ellipse 70% 55% at 62% 40%, rgba(var(--panel-glow-1,12,34,88),calc(var(--glass-alpha,.55) * .6)), transparent 75%),
          linear-gradient(180deg,
            rgba(var(--panel-1,4,11,38),var(--glass-alpha,.55)) 0%,
            rgba(var(--panel-2,6,18,55),calc(var(--glass-alpha,.55) * 1.05)) 55%,
            rgba(var(--panel-3,3,9,32),calc(var(--glass-alpha,.55) * 1.2)) 100%))
        `,
        backdropFilter: blur,
        WebkitBackdropFilter: blur,
        border:
          "1px solid rgba(var(--c-78dcff,120,220,255),var(--glass-edge,.3))",
        /* --panel-rim: kenarlardan içeri süzülen ışık (paletten gelir;
           yoksa eski hafif ışıma) */
        boxShadow: `
          var(--panel-halo, 0 30px 70px rgba(0,0,0,.6)),
          inset 0 1px 0 rgba(255,255,255,.14),
          var(--panel-rim, inset 0 0 80px rgba(var(--c-4fd8ff,79,216,255),.05))
        `,
        isolation: "isolate",
      }}
    >
      {/* camın üst kenarından süzülen yansıma */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0))",
        }}
      />
      <div className="absolute inset-0 z-10">{children}</div>
    </div>
  );
}

function GlassPanel({
  children,
  inset,
}: {
  children?: ReactNode;
  inset: PanelInset;
}) {
  if (GLASS_LOOK === "thin")
    return <ThinGlassPanel inset={inset}>{children}</ThinGlassPanel>;

  /* ocean: parçacıklar net kalsın diye cam neredeyse hiç bulanıklaştırmaz */
  const filter = `blur(${THEME === "ocean" ? 0.6 : GLASS.blur}px)`;

  const style: CSSProperties = {
    left: inset.left,
    right: inset.right,
    top: inset.top,
    bottom: inset.bottom,

    borderRadius: GLASS.radius,
    background: "transparent",

    // Düzgün, her tarafta eşit kenar çizgisi
    border:
      THEME === "ocean"
        ? `${GLASS.edgeWidth}px solid rgba(var(--c-78dcff,120,220,255),.38)`
        : `${GLASS.edgeWidth}px solid rgba(var(--c-e1ecff,225,236,255),${GLASS.edge})`,

    backdropFilter: filter,
    WebkitBackdropFilter: filter,

    // Referanstaki gibi kartın altında yumuşak koyu gölge
    boxShadow:
      THEME === "ocean"
        ? `0 30px 70px rgba(var(--c-000000,0,0,0),.6), 0 0 40px rgba(var(--c-4fd8ff,79,216,255),.08), inset 0 0 60px rgba(var(--c-4fd8ff,79,216,255),.05)`
        : `
      0 30px 60px rgba(var(--c-0e1c34,14,28,52),.4),
      0 8px 18px rgba(var(--c-0e1c34,14,28,52),.2)
    `,

    isolation: "isolate",
  };

  return (
    <div className="absolute z-10 overflow-hidden" style={style}>
      <div className="absolute inset-0 z-10">{children}</div>

      <GlassEdges />
    </div>
  );
}

/* =========================================================
   ÜST BAĞLANTI SOKETİ
========================================================= */

function TopConnector({ plugged = false }: { plugged?: boolean }) {
  if (!SHOW_CONNECTOR) return null;

  /* GERÇEKÇİ GÜÇ SOKETİ — footer'daki PSU girişi gibi:
     vidalı fırçalanmış metal braket, ortasında pahlı köşeli koyu
     soket ağzı ve içinde altın kontaklar. Ağız avatarın fişiyle aynı
     ölçüde (≈32×8, panel kenarının 2px altında) — SiteAvatar'daki
     SLOT_W / SLOT_TOP / SLOT_H ile birlikte değiştir. */
  return (
    <div
      data-part="connector"
      className="pointer-events-none absolute top-0 left-1/2 z-30 h-5.5 w-24 -translate-x-1/2"
      aria-hidden
    >
      {/* braket */}
      <div
        className="absolute inset-0 rounded-b-lg"
        style={{
          background: `
            repeating-linear-gradient(90deg, rgba(var(--c-ffffff,255,255,255),.035) 0 1px, transparent 1px 3px),
            linear-gradient(180deg, rgb(var(--c-154476,21,68,118)) 0%, rgb(var(--c-0b2b55,11,43,85)) 55%, rgb(var(--c-071c3b,7,28,59)) 100%)
          `,
          border: "1px solid rgba(var(--c-78dcff,120,220,255),.35)",
          borderTop: "none",
          boxShadow:
            "inset 0 -1px 0 rgba(var(--c-cfe6ff,207,230,255),.25), inset 0 2px 4px rgba(var(--c-000000,0,0,0),.45), 0 6px 14px rgba(var(--c-000000,0,0,0),.5)",
        }}
      />
      {/* braket vidaları */}
      {[11, 85].map((x) => (
        <span
          key={x}
          className="absolute block rounded-full"
          style={{
            left: x - 4,
            top: 7,
            width: 8,
            height: 8,
            background:
              "radial-gradient(circle at 35% 30%, rgba(var(--c-cfe6ff,207,230,255),.95), rgba(var(--c-46beff,70,190,255),.5) 45%, rgba(var(--c-061f3a,6,31,58),1) 100%)",
            boxShadow: "0 1px 1px rgba(var(--c-000000,0,0,0),.6)",
          }}
        >
          <span
            className="absolute top-1/2 left-1/2 block h-[1.2px] w-[70%] -translate-x-1/2 -translate-y-1/2 rotate-45"
            style={{ background: "rgba(var(--c-061f3a,6,31,58),.95)" }}
          />
        </span>
      ))}
      {/* soket ağzı */}
      <svg
        className="absolute top-px left-1/2 -translate-x-1/2 overflow-visible"
        width="38"
        height="12"
        viewBox="0 0 38 12"
      >
        <defs>
          <linearGradient id="sockHole" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--c-000000,0,0,0))" />
            <stop offset="1" stopColor="rgb(var(--c-06122a,6,18,42))" />
          </linearGradient>
        </defs>
        {/* dış çerçeve (pahlı alt köşeler) */}
        <path
          d="M 1 0.5 H 37 V 8 L 34 11 H 4 L 1 8 Z"
          fill="rgb(var(--c-030a1a,3,10,26))"
          stroke="rgba(var(--c-cfe6ff,207,230,255),.5)"
          strokeWidth="1"
        />
        {/* iç delik */}
        <path
          d="M 3.5 1.5 H 34.5 V 7.5 L 32.5 9.5 H 5.5 L 3.5 7.5 Z"
          fill="url(#sockHole)"
        />
        {/* altın kontaklar */}
        {Array.from({ length: 9 }, (_, i) => (
          <rect
            key={i}
            x={7 + i * 3}
            y={3}
            width={1.2}
            height={2.6}
            rx={0.3}
            fill="rgb(var(--c-b89650,184,150,80))"
            opacity=".9"
          />
        ))}
      </svg>
      {/* TAKILI FİŞ — kablo yukarıdan iner, metal gövde soketin üstünde,
          başlık soketin ağzına oturur (ağız ≈32×8) */}
      {plugged && <PluggedJack />}

      {/* güç LED'i — fiş takılıyken yanık */}
      <span
        className="absolute block rounded-full"
        style={{
          left: 46,
          top: 15,
          width: 4,
          height: 4,
          background: plugged
            ? "rgb(var(--c-4fd8ff,79,216,255))"
            : "rgba(var(--c-4fd8ff,79,216,255),.35)",
          boxShadow: plugged
            ? "0 0 6px rgba(var(--c-4fd8ff,79,216,255),.9), 0 0 12px rgba(var(--c-4fd8ff,79,216,255),.5)"
            : "0 0 4px rgba(var(--c-4fd8ff,79,216,255),.5)",
        }}
      />
    </div>
  );
}

/** Sokete takılı fiş + kablo (soketin koordinatlarında; y=0 panelin üst kenarı).
 *  Ana sayfada avatarın taktığı fişin AYNISI (SiteAvatar > Connector /
 *  CableStroke, kenarda EDGE_SCALE = 0.5 ölçeğiyle): fiş sokete üstten
 *  oturmuş, kablosu portun biraz solundan panelin arkasına iniyor ve
 *  içinden turkuaz akım akıyor. */
const JACK_SCALE = 0.5; // SiteAvatar EDGE_SCALE ile aynı
const JACK_W = 62; // SiteAvatar CONN_W
const JACK_BODY = 12; // SiteAvatar CONN_BODY
const JACK_PINS = 6; // SiteAvatar CONN_PINS
const JACK_IN_Y = -6; // gövde üstü: kenarın 6px üstünde (SiteAvatar CONN_IN_Y)
const JACK_CYAN = "79,216,255"; // SiteAvatar PLUG_CYAN

function PluggedJack() {
  const x0 = -JACK_W / 2;
  const x1 = JACK_W / 2;
  const B = JACK_BODY;
  const P = JACK_PINS;
  const contacts: number[] = [];
  for (let x = x0 + 6; x <= x1 - 6; x += 3.2) contacts.push(x);
  const boot = JACK_IN_Y - 13;
  /* kovandan yukarı kalkar, portun biraz soluna kıvrılıp panelin
     ARKASINA iner (panel kenarında biter). SiteAvatar PLUG_CABLE_D ile aynı */
  const cable = `M 0 ${boot} C 0 ${boot - 9}, -20 ${boot - 11}, -36 ${boot - 5} S -53 -8, -54 0`;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-1/2 overflow-visible"
      /* 0 boyutlu svg hiç çizilmez: 1px, içerik taşar (overflow-visible) */
      style={{ top: 0, zIndex: 2 }}
      width="1"
      height="1"
    >
      <defs>
        <linearGradient id="pjBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a2e52" />
          <stop offset=".45" stopColor="#0c1a33" />
          <stop offset="1" stopColor="#050c1c" />
        </linearGradient>
        <linearGradient id="pjShell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d8ea" />
          <stop offset=".5" stopColor="#8197b4" />
          <stop offset="1" stopColor="#4b5f7c" />
        </linearGradient>
        <linearGradient id="pjBoot" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#050c1c" />
          <stop offset=".5" stopColor="#1a2e52" />
          <stop offset="1" stopColor="#050c1c" />
        </linearGradient>
      </defs>
      <g
        transform={`scale(${JACK_SCALE})`}
        style={{ filter: "drop-shadow(0 0 3px rgba(200,214,232,.45))" }}
      >
        {/* KABLO — kılıf, yansıma ve içinden akan turkuaz akım;
            panel kenarında biter: kablo panelin arkasına iner */}
        <g fill="none" strokeLinecap="butt">
          <path d={cable} stroke="#020b17" strokeWidth={6.5} />
          <path d={cable} stroke="#0a1a33" strokeWidth={4.2} />
          <path
            d={cable}
            stroke="rgba(207,230,255,.28)"
            strokeWidth={0.9}
            transform="translate(-0.8 -1.2)"
          />
          <path
            d={cable}
            stroke={`rgb(${JACK_CYAN})`}
            strokeWidth={1.4}
            strokeDasharray="6 12"
            /* SVG <animate> yerine CSS: gizli bölümde / hafif modda durur
               (SMIL hiçbir zaman durmuyordu) */
            className="cable-flow"
            style={{ filter: `drop-shadow(0 0 3px rgba(${JACK_CYAN},1))` }}
            opacity={0.95}
          />
        </g>

        {/* FİŞ */}
        <g transform={`translate(0 ${JACK_IN_Y})`}>
          {/* metal kılıf — sokete giren kısım */}
          <path
            d={`M ${x0 + 2} ${B - 1} H ${x1 - 2} V ${B + P - 2} L ${x1 - 4} ${B + P} H ${x0 + 4} L ${x0 + 2} ${B + P - 2} Z`}
            fill="url(#pjShell)"
            stroke="rgba(10,20,40,.8)"
            strokeWidth={0.6}
          />
          {contacts.map((x) => (
            <rect
              key={x}
              x={x}
              y={B + P - 3.2}
              width={1.4}
              height={2.6}
              rx={0.3}
              fill="#ffe39a"
            />
          ))}
          {/* kablo koruması (lastik kovan) */}
          <path
            d="M -4.5 -13 L 4.5 -13 L 9 0 L -9 0 Z"
            fill="url(#pjBoot)"
            stroke="rgba(207,230,255,.25)"
            strokeWidth={0.6}
          />
          {[0, 1, 2, 3].map((k) => (
            <line
              key={k}
              x1={-5 - k * 1.1}
              x2={5 + k * 1.1}
              y1={-10 + k * 3}
              y2={-10 + k * 3}
              stroke="rgba(0,0,0,.6)"
              strokeWidth={0.9}
            />
          ))}
          {/* gövde */}
          <rect
            x={x0}
            y={0}
            width={JACK_W}
            height={B}
            rx={2.5}
            fill="url(#pjBody)"
            stroke="rgba(150,175,205,.9)"
            strokeWidth={1}
          />
          <rect
            x={x0 + 3}
            y={1.1}
            width={JACK_W - 6}
            height={1.2}
            rx={0.6}
            fill="rgba(207,230,255,.35)"
          />
          {[0, 1, 2, 3, 4].map((k) => (
            <g key={k}>
              <line
                x1={x0 + 4 + k * 2.4}
                x2={x0 + 4 + k * 2.4}
                y1={3.5}
                y2={B - 2.5}
                stroke="rgba(0,0,0,.55)"
                strokeWidth={1}
              />
              <line
                x1={x1 - 4 - k * 2.4}
                x2={x1 - 4 - k * 2.4}
                y1={3.5}
                y2={B - 2.5}
                stroke="rgba(0,0,0,.55)"
                strokeWidth={1}
              />
            </g>
          ))}
          {/* durum LED'i — takılı: turkuaz yanar */}
          <rect
            x={-10}
            y={B / 2 - 1}
            width={20}
            height={2}
            rx={1}
            fill={`rgb(${JACK_CYAN})`}
            style={{
              filter: `drop-shadow(0 0 3px rgba(${JACK_CYAN},1)) drop-shadow(0 0 6px rgba(${JACK_CYAN},.7))`,
            }}
          />
        </g>
      </g>
    </svg>
  );
}

/** Panel kenarının (çerçeve) kalınlığı: telefonda ince, büyük ekranda kalın */
export const RIM_PHONE = 16;

const PHONE_QUERY = "(max-width: 639px)";
const subscribePhone = (onChange: () => void) => {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const readRimThickness = () =>
  window.matchMedia(PHONE_QUERY).matches ? RIM_PHONE : GLASS.thickness;

function useRimThickness() {
  return useSyncExternalStore(
    subscribePhone,
    readRimThickness,
    () => GLASS.thickness,
  );
}

/* =========================================================
   KASA DONANIMI — footer'daki bilgisayar kasası gibi:
   köşelerde vidalar, üst/alt kenarda delikli havalandırma şeridi,
   cam kenarında fırçalanmış metal dokusu.
   Palet --case-opacity tanımlarsa donanım geri planda kalır.
========================================================= */

const SHOW_CASE = true;

function Screw({ style }: { style: CSSProperties }) {
  return (
    <span
      aria-hidden
      className="absolute block rounded-full"
      style={{
        width: 13,
        height: 13,
        background:
          "radial-gradient(circle at 35% 30%, rgba(var(--c-cfe6ff,207,230,255),.95), rgba(var(--c-46beff,70,190,255),.55) 45%, rgba(var(--c-061f3a,6,31,58),1) 100%)",
        boxShadow:
          "0 1px 2px rgba(var(--c-000000,0,0,0),.65), 0 0 0 2px rgba(var(--c-030a1e,3,10,30),.55)",
        ...style,
      }}
    >
      <span
        className="absolute top-1/2 left-1/2 block h-[1.5px] w-[70%] -translate-x-1/2 -translate-y-1/2 rotate-45"
        style={{ background: "rgba(var(--c-061f3a,6,31,58),.95)" }}
      />
      <span
        className="absolute top-1/2 left-1/2 block h-[1.5px] w-[70%] -translate-x-1/2 -translate-y-1/2 -rotate-45"
        style={{ background: "rgba(var(--c-061f3a,6,31,58),.95)" }}
      />
    </span>
  );
}

/** delikli havalandırma şeridi */
function Vent({ style }: { style: CSSProperties }) {
  const fade =
    "linear-gradient(90deg, transparent, rgb(var(--c-000000,0,0,0)) 10%, rgb(var(--c-000000,0,0,0)) 90%, transparent)";
  return (
    <div
      aria-hidden
      className="absolute"
      style={{
        height: 10,
        backgroundImage:
          "radial-gradient(circle, rgba(var(--c-000000,0,0,0),.6) 2px, transparent 2.5px)",
        backgroundSize: "11px 10px",
        boxShadow: "none",
        maskImage: fade,
        WebkitMaskImage: fade,
        opacity: 0.85,
        ...style,
      }}
    />
  );
}

function CaseHardware() {
  const t = useRimThickness();
  /* ince cam kartta kasa donanımı yok (fotoğraftaki gibi sade kenar) */
  if (!SHOW_CASE || (PANEL_STYLE === "glass" && GLASS_LOOK === "thin"))
    return null;
  const c = t / 2 - 6.5; // vidalar cam kenarının ortasında
  return (
    <div
      className="pointer-events-none absolute inset-0 z-25"
      style={{ opacity: "var(--case-opacity, 1)" }}
    >
      {/* fırçalanmış metal kenar dokusu (sadece kalın cam kenarında) */}
      {PANEL_STYLE === "glass" && (
        <div
          className="absolute inset-0"
          style={{
            borderRadius: GLASS.radius,
            padding: t,
            background:
              "repeating-linear-gradient(90deg, rgba(var(--c-ffffff,255,255,255),.035) 0 1px, transparent 1px 3px), linear-gradient(180deg, rgba(var(--c-0e3b6b,14,59,107),.22), rgba(var(--c-061f3a,6,31,58),.3))",
            WebkitMask:
              "linear-gradient(rgb(var(--c-000000,0,0,0)) 0 0) content-box, linear-gradient(rgb(var(--c-000000,0,0,0)) 0 0)",
            WebkitMaskComposite: "xor",
            mask: "linear-gradient(rgb(var(--c-000000,0,0,0)) 0 0) content-box exclude, linear-gradient(rgb(var(--c-000000,0,0,0)) 0 0)",
          }}
        />
      )}

      {/* köşe vidaları */}
      <Screw style={{ left: c + 4, top: c + 4 }} />
      <Screw style={{ right: c + 4, top: c + 4 }} />
      <Screw style={{ left: c + 4, bottom: c + 4 }} />
      <Screw style={{ right: c + 4, bottom: c + 4 }} />

      {/* üst kenar: konnektörün iki yanında havalandırma delikleri */}
      <Vent style={{ top: t / 2 - 5, left: "7%", width: "33%" }} />
      <Vent style={{ top: t / 2 - 5, right: "7%", width: "33%" }} />
      {/* alt kenar */}
      <Vent style={{ bottom: t / 2 - 5, left: "30%", width: "40%" }} />
    </div>
  );
}

/* =========================================================
   HUD ELEMANLARI
========================================================= */

function Hud() {
  if (!SHOW_HUD) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 font-mono text-[rgb(var(--c-eef3fa,238,243,250))]"
      style={
        THEME === "ocean"
          ? { color: "rgb(var(--c-bdf3ff,189,243,255))" }
          : undefined
      }
    >
      {/* ENVATO / PORTFOLIO / VIDEOHIVE yazıları ve sağ üstteki daire
          sembolleri kaldırıldı */}

      {/* süs HUD'ları: küçük ekranlarda içeriğin üstüne bindiği için gizli */}
      <div className="absolute top-[55%] right-0 hidden h-32.5 w-7 rounded-l-md border-[1.5px] border-r-0 border-white/50 bg-white/6 backdrop-blur-md lg:block">
        <span
          className="absolute top-1/2 -left-px whitespace-nowrap text-[11px] tracking-wider"
          style={{ transform: "translate(-100%,-50%) rotate(-90deg)" }}
        >
          [ANTIBUS | SKILLS HUB]
        </span>
      </div>

      <div className="absolute right-11 bottom-9 hidden w-50 lg:block">
        <div className="mb-1.5 text-right text-[11px]">[CONTACT CONN]</div>

        <div className="relative h-2 rounded-full border-[1.5px] border-white/50 bg-white/6">
          <div className="absolute top-1/2 right-1 flex -translate-y-1/2 gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-[rgb(var(--c-e2eaf4,226,234,244))]"
                style={{
                  boxShadow: "0 0 6px rgba(var(--c-ffffff,255,255,255),.45)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ANA COMPONENT
========================================================= */

export default function SciFiBackground({
  children,
  panelBottom = "1.5%",
  backdrop,
  panelInset,
  hudOnFrame = false,
  plugged = true,
  connector = true,
}: SciFiBackgroundProps) {
  const inset = panelInset ?? {
    left: "1%",
    right: "1%",
    top: "1.5%",
    bottom: panelBottom,
  };

  return (
    <div className="sfb-root absolute inset-0 isolate overflow-hidden">
      {/* TELEFON / TABLET: cam bulanıklığı (backdrop-filter) ve sürekli
          yanıp sönen ışık tozu kapalı. Arkasında hareket olan her karede
          bulanıklığı yeniden hesaplamak telefonu en çok kasan işti. */}
      <style>{`
        @media (max-width: 1023px), (hover: none) {
          .sfb-root, .sfb-root * {
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
          }
          .sfb-root .po-tw { animation: none !important; will-change: auto !important; }
        }
        /* Safari / Firefox masaüstünde de aynı hafif görünüm (html.engine-lite:
           perfTier). Bu tarayıcılar canlı bulanıklığı ve eğik, maskeli
           katmanları Chrome kadar hızlı çizemiyor. */
        html.engine-lite .sfb-root,
        html.engine-lite .sfb-root * {
                    -webkit-backdrop-filter: none !important;
                    backdrop-filter: none !important;
                  }
        html.engine-lite .sfb-root .po-tw { animation: none !important; will-change: auto !important; }
      `}</style>
      <Background />

      {PANEL_STYLE === "glass" && (
        <div className="absolute inset-0 z-1">
          {backdrop ?? <DefaultBackdrop />}
        </div>
      )}

      {PANEL_STYLE === "metal" ? (
        <MetalPanel inset={inset} backdrop={backdrop}>
          {children}
        </MetalPanel>
      ) : (
        <GlassPanel inset={inset}>{children}</GlassPanel>
      )}

      <div
        className="pointer-events-none absolute z-20"
        style={{
          left: inset.left,
          right: inset.right,
          top: inset.top,
          bottom: inset.bottom,
        }}
      >
        <CaseHardware />
        {connector && <TopConnector plugged={plugged} />}
        {!hudOnFrame && <Hud />}
      </div>

      {hudOnFrame && <Hud />}
    </div>
  );
}
