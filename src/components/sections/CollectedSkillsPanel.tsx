"use client";

import { SparkleStroke } from "@/components/ui/Sparkle";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type KeyboardEvent as ReactKeyboardEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  BadgeCheck,
  Boxes,
  Brain,
  ChevronsUp,
  Database,
  Monitor,
  PenTool,
  Server,
} from "lucide-react";
import {
  GLASS_EDGE,
  GLASS_EDGE_GOLD,
  glassShadow,
  glassSurface,
} from "@/components/ui/Glass";

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
export type Tech = {
  name: string;
  /** Kısa not, örn. "App Router · SSR" */
  note?: string;
};

export type SkillCategory = {
  key: string;
  label: string;
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
   VARSAYILAN YETENEKLER — kendi listene göre düzenle
========================================================= */
export const DEFAULT_CATEGORIES: SkillCategory[] = [
  {
    key: "frontend",
    label: "FRONTEND",
    icon: Monitor,
    techs: [
      { name: "React", note: "Hooks · Context · Performans" },
      { name: "Next.js", note: "App Router · SSR · SSG" },
      { name: "TypeScript", note: "Tip güvenli arayüzler" },
      { name: "Tailwind CSS", note: "Tasarım sistemleri" },
      { name: "Framer Motion", note: "Etkileşim & animasyon" },
    ],
  },
  {
    key: "backend",
    label: "BACKEND",
    icon: Server,
    techs: [
      { name: "Node.js", note: "Event loop · Streams" },
      { name: "NestJS", note: "Modüler mimari · DI" },
      { name: "Express", note: "REST API" },
      { name: "GraphQL", note: "Şema & resolver tasarımı" },
    ],
  },
  {
    key: "database",
    label: "VERİTABANI",
    icon: Database,
    techs: [
      { name: "PostgreSQL", note: "İlişkisel modelleme" },
      { name: "MongoDB", note: "Doküman tabanlı" },
      { name: "Prisma", note: "ORM · Migration" },
      { name: "Redis", note: "Cache · Kuyruk" },
    ],
  },
  {
    key: "devops",
    label: "DEVOPS",
    icon: Boxes,
    techs: [
      { name: "Docker", note: "Container · Compose" },
      { name: "Git", note: "GitHub · Akışlar" },
      { name: "CI/CD", note: "GitHub Actions" },
      { name: "Vercel / AWS", note: "Dağıtım & barındırma" },
    ],
  },
  {
    key: "ai",
    label: "YAPAY ZEKA",
    icon: Brain,
    techs: [
      { name: "Python", note: "Veri & otomasyon" },
      { name: "LLM & RAG", note: "Ajanlar · Değerlendirme" },
      { name: "LangChain", note: "Orkestrasyon" },
      { name: "OpenAI / Claude API", note: "Entegrasyon" },
    ],
  },
  {
    key: "design",
    label: "TASARIM",
    icon: PenTool,
    techs: [
      { name: "Figma", note: "Prototip · Bileşenler" },
      { name: "UI / UX", note: "Kullanıcı akışları" },
      { name: "Design Systems", note: "Token · Tutarlılık" },
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

  /* ---------- Tekerlek / klavye ile gezinme ---------- */
  const lock = useRef(0);
  const onWheel = (e: ReactWheelEvent) => {
    const now = Date.now();
    if (now - lock.current < 350 || Math.abs(e.deltaY) < 8) return;
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
          from { opacity: 0; transform: translateY(14px); filter: blur(4px); }
          to   { opacity: 1; transform: none;             filter: blur(0); }
        }
        @keyframes tlRowIn {
          from { opacity: 0; transform: translateX(-10px); }
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
        aria-label="Yetenekler"
        onWheel={onWheel}
        onKeyDown={onKey}
      >
        {/* Panel başlığı */}
        <div
          className="pointer-events-none absolute font-mono tracking-[.14em]"
          style={{
            left: compact ? 8 : CONTENT_X,
            top: compact ? 10 : 34,
            fontSize: 15 * S,
            color: `rgb(${ICE})`,
            textShadow: `0 0 10px rgba(${EDGE},0.5)`,
          }}
        >
          [YETENEKLER / SKILLS]
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

          {/* PARILTI — dik çubuk boyunca posterdeki gibi turkuaz parçacıklar
              (koyu lacivert çizginin üstünde); bükülme bölgesi maskeli */}
          <g mask="url(#tlFade)">
            <g mask="url(#tlGapWide)">
              <SparkleStroke
                d={`M ${LINE_X} 0 L ${LINE_X} ${H}`}
                spread={7}
                density={1.7}
              />
            </g>
          </g>

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
            {/* bükülmede de parıltı */}
            <SparkleStroke
              d={bulgePath(LINE_X, BULGE, BULGE_H)}
              spread={7}
              density={1.7}
            />
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
              {s.label}
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
            aria-label="Önceki kategori"
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
          className="absolute"
          style={{
            left: CONTENT_X,
            right: compact ? 12 : 24,
            top: compact
              ? Math.min(Math.max(knobY - 60, 50), H - 380)
              : Math.min(Math.max(knobY - 90, 84), H - 470),
            animation: "tlContentIn 520ms cubic-bezier(.16,1,.3,1) both",
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
              {active.label}
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

          {/* Büyük dönen sayı: kategorideki teknoloji sayısı */}
          <div className="flex items-end gap-3">
            <RollingNumber
              value={active.techs.length}
              digits={2}
              size={compact ? 52 : 76}
            />
          </div>
          <div
            className="mb-6 font-mono text-[12px] tracking-[.12em]"
            style={{ color: `rgba(${ICE_DIM},0.8)` }}
          >
            TEKNOLOJİ / TECHNOLOGY
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
   DÖNEN SAYI — her basamak bir şerit gibi kayar
   (referanstaki kayan/kırpılmış rakam etkisi)
========================================================= */
function RollingNumber({
  value,
  digits,
  size = 76,
}: {
  value: number;
  digits: number;
  size?: number;
}) {
  const str = String(Math.max(0, value)).padStart(digits, "0");
  const [shown, setShown] = useState("0".repeat(str.length));

  /* İlk açılışta ve değer değişince 0'dan hedefe kaydır */
  useEffect(() => {
    const t = setTimeout(() => setShown(str), 40);
    return () => clearTimeout(t);
  }, [str]);

  return (
    <div
      className="flex font-mono leading-none font-semibold"
      style={{
        fontSize: size,
        height: size,
        color: `rgb(${ICE})`,
        textShadow: `0 0 18px rgba(${EDGE},0.45)`,
        letterSpacing: "0.02em",
      }}
      aria-label={str}
    >
      {str.split("").map((_, i) => {
        const d = Number(shown[i] ?? 0);
        return (
          <span
            key={i}
            className="relative inline-block overflow-hidden"
            style={{
              height: size,
              width: "0.62em",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
            }}
          >
            <span
              className="absolute top-0 left-0 flex flex-col"
              style={{
                transform: `translateY(${-d * size}px)`,
                transition: `transform ${900 + i * 180}ms cubic-bezier(.16,1,.3,1)`,
              }}
            >
              {Array.from({ length: 10 }).map((__, n) => (
                <span key={n} style={{ height: size, lineHeight: `${size}px` }}>
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* =========================================================
   TEKNOLOJİ LİSTESİ — cam kartlar, sırayla belirir
========================================================= */
function TechList({ techs }: { techs: Tech[] }) {
  return (
    <div className="flex flex-col gap-1.75 font-mono">
      {techs.map((t, i) => (
        <div
          key={t.name}
          className="flex min-h-11 items-center rounded-[10px] px-3"
          style={{
            background: glassSurface("8,26,52", 0.45),
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: glassShadow({ depth: 3, glow: 0.18, drop: false }),
            animation: `tlRowIn .4s ease-out ${150 + i * 70}ms both`,
          }}
        >
          <span
            className="mr-3 flex size-6 shrink-0 items-center justify-center rounded-full text-[9px]"
            style={{
              border: `1px solid rgba(${GOLD},0.55)`,
              color: `rgb(${GOLD_LIGHT})`,
              background: `rgba(${GOLD},0.08)`,
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-[13px]"
              style={{ color: `rgb(${ICE})` }}
            >
              {t.name}
            </div>
            {t.note && (
              <div
                className="truncate text-[10px]"
                style={{ color: `rgba(${ICE_DIM},0.75)` }}
              >
                {t.note}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
