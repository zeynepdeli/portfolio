"use client";

import { TechLogos } from "@/components/ui/techIcons";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type KeyboardEvent as ReactKeyboardEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  BadgeCheck,
  ChevronsUp,
  Database,
  Map as MapIcon,
  Monitor,
  Server,
  Smartphone,
  Wrench,
} from "lucide-react";
import {
  GLASS_EDGE,
  GLASS_EDGE_GOLD,
  glassShadow,
  glassSurface,
} from "@/components/ui/Glass";
import { useLang, type Lang } from "@/i18n/lang";

/* =========================================================
   PALET — sitenin geri kalanıyla aynı
========================================================= */
const ICE = "168,238,246"; // poster turkuazı metin
const ICE_DIM = "95,184,208"; // pasif metin
const EDGE = GLASS_EDGE; // camgöbeği cam kenarı
const GOLD = GLASS_EDGE_GOLD; // aktif / akım çizgisi altını
const GOLD_LIGHT = "255,228,170";

/* =========================================================
   TİPLER
========================================================= */
/** iki dilli metin (her iki dilde aynıysa düz yazı) */
export type Txt = string | { tr: string; en: string };
/** metni seçili dilde verir */
export const txt = (v: Txt, lang: Lang) => (typeof v === "string" ? v : v[lang]);
/** iki dilden uzun olanı (yer hesabı dile göre değişmesin) */
export const txtMax = (v: Txt) =>
  typeof v === "string" ? v : v.tr.length >= v.en.length ? v.tr : v.en;

export type Tech = {
  name: Txt;
  /** Kısa not, örn. "App Router · SSR" */
  note?: Txt;
};

export type SkillCategory = {
  key: string;
  label: Txt;
  icon: ElementType;
  techs: Tech[];
};

type Props = {
  /** Sayfadaki yerleşim için ek sınıflar (örn. "mx-auto my-16") */
  className?: string;
  /** Yükseklik (px). Verilmezse 760. */
  height?: number;
  /** Yetenek kategorileri (sıra = zaman çizelgesi sırası).
   *  Verilmezse aşağıdaki DEFAULT_CATEGORIES kullanılır. */
  categories?: SkillCategory[];
  /** Kontrollü kullanım: aktif kategori key'i */
  activeKey?: string;
  onSelect?: (key: string) => void;
  /** Dar ekran (telefon): zaman çizelgesi yatay, içerik tam genişlik */
  compact?: boolean;
};

/* =========================================================
   VARSAYILAN YETENEKLER — CV'deki "Technical Skills" bölümünden
   (Zeynep_Deli_CV_EN). Kendi listene göre düzenle.
========================================================= */
export const DEFAULT_CATEGORIES: SkillCategory[] = [
  {
    key: "frontend",
    label: "FRONTEND",
    icon: Monitor,
    techs: [
      { name: "React", note: { tr: "Yeniden kullanılabilir bileşenler", en: "Reusable components" } },
      { name: "Next.js", note: { tr: "Full-stack web uygulamaları", en: "Full-stack web apps" } },
      { name: "Astro", note: { tr: "Hızlı, SEO dostu sayfalar", en: "Fast, SEO-friendly pages" } },
      { name: "JavaScript · TypeScript", note: { tr: "Tip güvenli kod", en: "Type-safe code" } },
      { name: "HTML5 · CSS3 · SCSS", note: "Tailwind CSS · Bootstrap" },
      { name: "Redux Toolkit · Zustand", note: { tr: "Context API · State yönetimi", en: "Context API · State management" } },
    ],
  },
  {
    key: "mobile",
    label: { tr: "MOBİL", en: "MOBILE" },
    icon: Smartphone,
    techs: [
      { name: "React Native", note: { tr: "Web & mobil uygulamalar", en: "Web & mobile apps" } },
      { name: "Expo", note: { tr: "Hızlı mobil geliştirme", en: "Fast mobile development" } },
      { name: "NativeWind", note: { tr: "Mobilde Tailwind", en: "Tailwind on mobile" } },
    ],
  },
  {
    key: "backend",
    label: "BACKEND",
    icon: Server,
    techs: [
      { name: "Node.js", note: { tr: "Sunucu tarafı geliştirme", en: "Server-side development" } },
      { name: "Express.js", note: "REST API" },
      { name: "NestJS", note: { tr: "Modüler mimari", en: "Modular architecture" } },
      {
        name: { tr: "REST API & Entegrasyon", en: "REST API & Integration" },
        note: {
          tr: "Ürün · sipariş · ödeme sistemleri",
          en: "Product · order · payment systems",
        },
      },
    ],
  },
  {
    key: "database",
    label: { tr: "VERİTABANI", en: "DATABASE" },
    icon: Database,
    techs: [
      { name: "PostgreSQL", note: { tr: "İlişkisel veritabanı", en: "Relational database" } },
      { name: "Prisma ORM", note: { tr: "Şema · migration", en: "Schema · migrations" } },
      { name: "Firebase", note: { tr: "Bulut veritabanı", en: "Cloud database" } },
      { name: "NoSQL", note: { tr: "Doküman tabanlı", en: "Document-based" } },
    ],
  },
  {
    key: "tools",
    label: { tr: "ARAÇLAR & YETKİNLİKLER", en: "TOOLS & PRACTICES" },
    icon: Wrench,
    techs: [
      { name: "Git", note: { tr: "Versiyon kontrolü", en: "Version control" } },
      {
        name: { tr: "UI Tasarım (kod ile)", en: "UI Design (in code)" },
        note: { tr: "Ayrı tasarım aracı olmadan", en: "Without a separate design tool" },
      },
      {
        name: { tr: "Responsive Web Tasarım", en: "Responsive Web Design" },
        note: { tr: "Her ekrana uyumlu arayüzler", en: "Interfaces for every screen" },
      },
      {
        name: { tr: "Performans Optimizasyonu", en: "Performance Optimization" },
        note: { tr: "Hızlı, optimize sayfalar", en: "Fast, optimized pages" },
      },
      {
        name: { tr: "Güvenli Geliştirme (OWASP)", en: "Secure Development (OWASP)" },
        note: {
          tr: "Kimlik doğrulama · API güvenliği",
          en: "Authentication · API security",
        },
      },
    ],
  },
];

/* =========================================================
   ÖLÇÜLER (px)
========================================================= */
type Geo = {
  W: number; // panel genişliği
  LINE_X: number; // dikey çizginin x'i
  KNOB_R: number; // topuzun yarıçapı
  KNOB_X: number; // topuz merkezi (çizginin sağında)
  BULGE: number; // çizginin topuz etrafında sola bükülme miktarı
  BULGE_H: number; // bükülmenin yarı yüksekliği
  CONTENT_X: number; // sağ içerik alanının solu
  LABEL_GAP: number; // etiketlerin çizgiden uzaklığı
  S: number; // yazı ölçeği
};

/** Masaüstü geometrisi */
const DESKTOP: Geo = {
  W: 610,
  LINE_X: 196,
  KNOB_R: 27,
  KNOB_X: 240,
  BULGE: 22,
  BULGE_H: 78,
  CONTENT_X: 318,
  LABEL_GAP: 44,
  S: 1,
};

/** Telefon: aynı tasarım (parıltılı dikey çizgi + topuz), dar ekrana göre */
const mobileGeo = (w: number): Geo => ({
  W: w,
  LINE_X: 90,
  KNOB_R: 17,
  KNOB_X: 116,
  BULGE: 13,
  BULGE_H: 52,
  CONTENT_X: 146,
  LABEL_GAP: 18,
  S: 0.78,
});

const PAD_Y = 0.12; // ilk/son etiketin üst/alttan uzaklığı (oran)

export default function CollectedSkillsPanel({
  className = "",
  height = 760,
  categories,
  activeKey,
  onSelect,
  compact = false,
}: Props) {
  const list = categories ?? DEFAULT_CATEGORIES;
  const { t, lang } = useLang();

  const [localKey, setLocalKey] = useState(activeKey ?? list[0]?.key ?? "");
  const current = activeKey ?? localKey;
  const activeIndex = Math.max(
    0,
    list.findIndex((s) => s.key === current),
  );
  const active = list[activeIndex];

  const select = (i: number) => {
    const n = (i + list.length) % list.length;
    setLocalKey(list[n].key);
    onSelect?.(list[n].key);
  };

  /* ---------- Yükseklik / genişlik ölçümü ----------
     ResizeObserver gözlemeye başlarken bir kez tetiklenir; ilk ölçüm de buradan. */
  const rootRef = useRef<HTMLElement>(null);
  const [H, setH] = useState(height);
  const [Wd, setWd] = useState(360);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setH(el.clientHeight);
      setWd(el.clientWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);

  const yOf = (i: number) =>
    H * PAD_Y + ((H * (1 - PAD_Y * 2)) / Math.max(1, list.length - 1)) * i;
  const knobY = yOf(activeIndex);

  /* Sağ içeriğin gerçek yüksekliği — içerik topuzun hizasına ortalanır,
     sabit tahmin (H - 470) yerine ölçülen yükseklikle sınırlanır;
     böylece alttaki bölümler (ör. ARAÇLAR) yukarı kaçmaz */
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(0);
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContentH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeIndex, compact]);

  /* ---------- Tekerlek / klavye ile gezinme ---------- */
  const lock = useRef(0);
  const onWheel = (e: ReactWheelEvent) => {
    const now = Date.now();
    if (now - lock.current < 350 || Math.abs(e.deltaY) < 8) return;
    /* uçtaki kategoride tekerlek sayfayı kaydırır (başa sarmaz) */
    if (e.deltaY > 0 && activeIndex >= list.length - 1) return;
    if (e.deltaY < 0 && activeIndex <= 0) return;
    lock.current = now;
    select(activeIndex + (e.deltaY > 0 ? 1 : -1));
  };
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      select(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      select(activeIndex - 1);
    }
  };

  /* Ara çentikler (büyük etiketler arasına 3'er küçük çentik) */
  const minorTicks: number[] = [];
  for (let i = 0; i < list.length - 1; i++) {
    for (let k = 1; k <= 3; k++) {
      minorTicks.push(yOf(i) + ((yOf(i + 1) - yOf(i)) * k) / 4);
    }
  }

  /* telefon: masaüstüyle aynı görünüm, dar geometriyle */
  const geo = compact ? mobileGeo(Wd) : DESKTOP;
  const { W, LINE_X, KNOB_R, KNOB_X, BULGE, BULGE_H, CONTENT_X, LABEL_GAP, S } =
    geo;

  if (!active) return null;
  const ActiveIcon = active.icon;

  return (
    <section
      ref={rootRef}
      className={`relative ${className}`}
      style={{ width: W, maxWidth: "100%", height }}
    >
      <style>{`
        @keyframes tlContentIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes tlRowIn {
          from { opacity: 0; transform: translate(-14px, 6px) scale(.98); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes tlKnobPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(${GOLD},0.0), 0 0 24px rgba(${GOLD},0.25); }
          50%      { box-shadow: 0 0 0 8px rgba(${GOLD},0.06), 0 0 34px rgba(${GOLD},0.4); }
        }
        .tl-move { transition: transform 650ms cubic-bezier(.16,1,.3,1); }
        @media (prefers-reduced-motion: reduce) {
          .tl-move { transition: none; }
          [style*="tlContentIn"], [style*="tlRowIn"], [style*="tlKnobPulse"] { animation: none !important; }
        }
      `}</style>

      {/* =====================================================
          ZEMİN YOK — doğrudan sayfanın üzerinde durur
      ===================================================== */}
      <div
        className="absolute inset-0 outline-hidden"
        tabIndex={0}
        role="tablist"
        aria-orientation="vertical"
        aria-label={t("skills.aria")}
        /* tekerlek panelde kategori değiştirir; ilk / son kategoride
           sayfa geçişine bırakılır (SiteFlow) */
        data-own-wheel=""
        data-end-up={activeIndex <= 0 ? "1" : undefined}
        data-end-down={activeIndex >= list.length - 1 ? "1" : undefined}
        onWheel={onWheel}
        onKeyDown={onKey}
      >
        {/* Panel başlığı */}
        <div
          className="pointer-events-none absolute flex items-center font-mono tracking-[.14em]"
          style={{
            left: compact ? 8 : CONTENT_X,
            top: compact ? 10 : 34,
            gap: 8 * S,
            fontSize: 15 * S,
            color: `rgb(${ICE})`,
            textShadow: `0 0 10px rgba(${EDGE},0.5)`,
          }}
        >
          {/* yol haritası ikonu */}
          <MapIcon
            aria-hidden
            size={Math.round(17 * S)}
            strokeWidth={1.6}
            style={{ filter: `drop-shadow(0 0 4px rgba(${EDGE},.7))`, flexShrink: 0 }}
          />
          {t("skills.header")}
        </div>

        {/* Sağ tarafta, topuzun hizasını takip eden yumuşak ışık */}
        <div
          className="tl-move pointer-events-none absolute"
          style={{
            left: CONTENT_X - 120 * S,
            top: 0,
            width: 520 * S,
            height: 520 * S,
            transform: `translateY(${knobY - 260 * S}px)`,
            background: `radial-gradient(closest-side, rgba(${EDGE},0.22), rgba(${EDGE},0.06) 55%, transparent)`,
            filter: "blur(10px)",
          }}
        />

        {/* =================================================
            ZAMAN ÇİZELGESİ (SVG)
        ================================================= */}
        <svg
          className="pointer-events-none absolute top-0 left-0"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden
        >
          <defs>
            {/* Düz çizgiden bükülme bölgesini çıkaran maske */}
            <mask
              id="tlGap"
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={W}
              height={H}
            >
              <rect x="0" y="0" width={W} height={H} fill="white" />
              <g
                className="tl-move"
                style={{ transform: `translateY(${knobY}px)` }}
              >
                <rect
                  x={LINE_X - 6}
                  y={-BULGE_H}
                  width="12"
                  height={BULGE_H * 2}
                  fill="black"
                />
              </g>
            </mask>
            {/* parıltı için daha geniş boşluk maskesi (saçılan noktalar da kesilsin) */}
            <mask
              id="tlGapWide"
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={W}
              height={H}
            >
              <rect x="0" y="0" width={W} height={H} fill="white" />
              <g
                className="tl-move"
                style={{ transform: `translateY(${knobY}px)` }}
              >
                <rect
                  x={LINE_X - 40}
                  y={-BULGE_H + 2}
                  width="80"
                  height={BULGE_H * 2 - 4}
                  fill="black"
                />
              </g>
            </mask>

            {/* Bükülmenin altın ışığı: ortada parlak, uçlarda sönük */}
            <linearGradient
              id="tlBulge"
              x1="0"
              y1={-BULGE_H}
              x2="0"
              y2={BULGE_H}
              gradientUnits="userSpaceOnUse"
            >
              <stop
                offset="0"
                stopColor={`rgb(${ICE_DIM})`}
                stopOpacity="0.35"
              />
              <stop offset="0.3" stopColor={`rgb(${GOLD})`} stopOpacity="0.9" />
              <stop
                offset="0.5"
                stopColor={`rgb(${GOLD_LIGHT})`}
                stopOpacity="1"
              />
              <stop offset="0.7" stopColor={`rgb(${GOLD})`} stopOpacity="0.9" />
              <stop
                offset="1"
                stopColor={`rgb(${ICE_DIM})`}
                stopOpacity="0.35"
              />
            </linearGradient>

            {/* Çizginin üst/alt uçlarda sönmesi */}
            <linearGradient
              id="tlLine"
              x1="0"
              y1="0"
              x2="0"
              y2={H}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor={`rgb(${ICE_DIM})`} stopOpacity="0" />
              <stop
                offset="0.08"
                stopColor={`rgb(${ICE_DIM})`}
                stopOpacity="0.35"
              />
              <stop
                offset="0.92"
                stopColor={`rgb(${ICE_DIM})`}
                stopOpacity="0.35"
              />
              <stop offset="1" stopColor={`rgb(${ICE_DIM})`} stopOpacity="0" />
            </linearGradient>

            {/* parıltının üst/alt uçlarda sönmesi */}
            <linearGradient
              id="tlFadeG"
              x1="0"
              y1="0"
              x2="0"
              y2={H}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset="0.07" stopColor="white" stopOpacity="1" />
              <stop offset="0.93" stopColor="white" stopOpacity="1" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <mask
              id="tlFade"
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={W}
              height={H}
            >
              <rect x="0" y="0" width={W} height={H} fill="url(#tlFadeG)" />
            </mask>

            <filter id="tlGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Çizginin yanındaki ince noktalı doku (referanstaki gibi) */}
          <line
            x1={LINE_X + 7}
            y1={H * 0.04}
            x2={LINE_X + 7}
            y2={H * 0.96}
            stroke={`rgba(${ICE_DIM},0.18)`}
            strokeWidth="1"
            strokeDasharray="1 5"
          />

          {/* Düz ana çizgi (bükülme bölgesi maskeli) */}
          <line
            x1={LINE_X}
            y1={0}
            x2={LINE_X}
            y2={H}
            stroke="url(#tlLine)"
            strokeWidth="1.2"
            mask="url(#tlGap)"
          />

          {/* Büyük etiket çentikleri */}
          {list.map((s, i) => (
            <line
              key={s.key}
              x1={LINE_X - (compact ? 14 : 34)}
              y1={yOf(i)}
              x2={LINE_X - 14}
              y2={yOf(i)}
              stroke={
                i === activeIndex ? `rgba(${GOLD},0.9)` : `rgba(${ICE_DIM},0.4)`
              }
              strokeWidth="1"
              style={{ transition: "stroke 400ms" }}
            />
          ))}

          {/* Ara çentikler */}
          {minorTicks.map((y, i) => (
            <line
              key={i}
              x1={LINE_X - 12}
              y1={y}
              x2={LINE_X - 6}
              y2={y}
              stroke={`rgba(${ICE_DIM},0.18)`}
              strokeWidth="1"
            />
          ))}

          {/* Topuzla birlikte kayan bükülme + ışık */}
          <g
            className="tl-move"
            style={{ transform: `translateY(${knobY}px)` }}
          >
            {/* yumuşak altın hale */}
            <path
              d={bulgePath(LINE_X, BULGE, BULGE_H)}
              fill="none"
              stroke={`rgba(${GOLD},0.35)`}
              strokeWidth="6"
              style={{ filter: "blur(6px)" }}
            />
            {/* bükülmüş çizgi */}
            <path
              d={bulgePath(LINE_X, BULGE, BULGE_H)}
              fill="none"
              stroke="url(#tlBulge)"
              strokeWidth="1.8"
              strokeLinecap="round"
              filter="url(#tlGlow)"
            />
          </g>
        </svg>

        {/* =================================================
            ETİKETLER
        ================================================= */}
        {list.map((s, i) => {
          const on = i === activeIndex;
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => select(i)}
              className="absolute -translate-y-1/2 cursor-pointer text-right font-mono tracking-[.08em] outline-hidden transition-all duration-300 hover:brightness-125 focus-visible:underline"
              style={{
                right: W - (LINE_X - LABEL_GAP),
                top: yOf(i),
                fontSize: (on ? 14 : 12) * (compact ? 0.78 : 1),
                color: on ? `rgb(${ICE})` : `rgba(${ICE_DIM},0.7)`,
                textShadow: on ? `0 0 10px rgba(${EDGE},0.6)` : "none",
              }}
            >
              {txt(s.label, lang)}
            </button>
          );
        })}

        {/* =================================================
            TOPUZ — kalın cam düğme, çizginin kucağında
        ================================================= */}
        <div
          className="tl-move absolute top-0 left-0"
          style={{ transform: `translate(${KNOB_X}px, ${knobY}px)` }}
        >
          {/* Dış koyu halka */}
          <div
            className="pointer-events-none absolute rounded-full"
            style={{
              width: (KNOB_R + 14) * 2,
              height: (KNOB_R + 14) * 2,
              left: -(KNOB_R + 14),
              top: -(KNOB_R + 14),
              background:
                "radial-gradient(circle, rgba(4,14,30,0.75) 60%, rgba(4,14,30,0) 100%)",
              border: `1px solid rgba(${ICE_DIM},0.12)`,
            }}
          />
          <button
            type="button"
            aria-label={t("skills.prev")}
            onClick={() => select(activeIndex - 1)}
            className="absolute flex cursor-pointer items-center justify-center rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-[#cfe6ff]/60"
            style={{
              width: KNOB_R * 2,
              height: KNOB_R * 2,
              left: -KNOB_R,
              top: -KNOB_R,
              background: glassSurface("10,30,58", 0.8),
              border: "1px solid rgba(255,255,255,0.25)",
              boxShadow: glassShadow({ depth: 4, glow: 0.25, drop: false }),
              animation: "tlKnobPulse 2.8s ease-in-out infinite",
            }}
          >
            <ChevronsUp
              size={20}
              strokeWidth={1.6}
              style={{
                color: `rgb(${GOLD_LIGHT})`,
                filter: `drop-shadow(0 0 5px rgba(${GOLD},0.8))`,
              }}
            />
          </button>
        </div>

        {/* =================================================
            SAĞ İÇERİK — aktif bölüm
        ================================================= */}
        <div
          key={active.key}
          ref={contentRef}
          className="absolute"
          style={{
            left: CONTENT_X,
            right: compact ? 12 : 24,
            top: Math.max(
              compact ? 50 : 84,
              Math.min(
                knobY - contentH / 2,
                H - contentH - (compact ? 12 : 24),
              ),
            ),
            animation: "tlContentIn 800ms cubic-bezier(.22,1,.36,1) both",
          }}
        >
          {/* Başlık satırı: ikon + bölüm adı + rozet */}
          <div className="mb-2 flex items-center gap-3">
            <span
              className="flex size-10 items-center justify-center rounded-full"
              style={{
                background: glassSurface("10,30,58", 0.7),
                border: "1px solid rgba(255,255,255,0.28)",
                boxShadow: glassShadow({ depth: 3, glow: 0.3, drop: false }),
              }}
            >
              <ActiveIcon
                size={19}
                strokeWidth={1.4}
                style={{
                  color: `rgb(${ICE})`,
                  filter: `drop-shadow(0 0 5px rgba(${EDGE},0.7))`,
                }}
              />
            </span>
            <span
              className="font-mono tracking-[.06em]"
              style={{ color: `rgb(${ICE})`, fontSize: 17 * S }}
            >
              {txt(active.label, lang)}
            </span>
            <BadgeCheck
              size={18}
              strokeWidth={1.6}
              style={{
                color: `rgb(${EDGE})`,
                filter: `drop-shadow(0 0 4px rgba(${EDGE},0.8))`,
              }}
            />
          </div>

          {/* Teknoloji listesi */}
          <TechList techs={active.techs} />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   BÜKÜLME YOLU — topuz merkezine göre (y = 0)
   Çizgi yukarıdan düz iner, topuzun solunda yumuşakça sola
   bükülür ve tekrar düz devam eder.
========================================================= */
function bulgePath(x: number, b: number, h: number) {
  return `
    M ${x} ${-h}
    C ${x} ${-h * 0.55}, ${x - b} ${-h * 0.55}, ${x - b} 0
    C ${x - b} ${h * 0.55}, ${x} ${h * 0.55}, ${x} ${h}
  `;
}

/* =========================================================
   TEKNOLOJİ LİSTESİ — cam kartlar, sırayla belirir
========================================================= */
function TechList({ techs }: { techs: Tech[] }) {
  const { lang } = useLang();
  return (
    <div className="flex flex-col gap-1.75 font-mono">
      {techs.map((t, i) => (
        <div
          key={txtMax(t.name)}
          className="flex min-h-11 items-center gap-2.5 rounded-[10px] px-3"
          style={{
            background: glassSurface("8,26,52", 0.45),
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: glassShadow({ depth: 3, glow: 0.18, drop: false }),
            animation: `tlRowIn .75s cubic-bezier(.22,1,.36,1) ${220 + i * 95}ms both`,
          }}
        >
          {/* teknolojinin logosu (tek renk, sitenin turkuazı) */}
          <TechLogos
            name={txt(t.name, "en")}
            size={16}
            gap={4}
            className="text-[rgb(var(--c-a8eef6,168,238,246))] opacity-90"
          />
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-[13px]"
              style={{ color: `rgb(${ICE})` }}
            >
              {txt(t.name, lang)}
            </div>
            {t.note && (
              <div
                className="truncate text-[10px]"
                style={{ color: `rgba(${ICE_DIM},0.75)` }}
              >
                {txt(t.note, lang)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
