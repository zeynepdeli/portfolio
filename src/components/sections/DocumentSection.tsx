"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { FaDownload, FaEye, FaArrowLeft, FaFilePdf } from "react-icons/fa";

import SciFiBackground, { LangHotspots } from "@/components/ui/ScifiBackground";
import { useLang } from "@/i18n/lang";

/* =========================================================
   DOCUMENTS — indirilebilir özgeçmişler
   Dosyalar: public/documents/
     Zeynep_Deli_CV_EN.pdf  + cv-en.jpg (ilk sayfa önizlemesi)
     Zeynep_Deli_CV_TR.pdf  + cv-tr.jpg
   Yeni belge eklemek için DOCS listesine bir satır ekle.
========================================================= */

type Doc = {
  lang: string;
  langName: string;
  title: string;
  file: string;
  /** indirilen dosyanın adı */
  downloadName: string;
  preview: string;
  meta: string;
  /** buton yazıları (belgenin dilinde) */
  download: string;
  view: string;
  /** öne çıkan rakamlar: [değer, açıklama] */
  stats: [string, string][];
  /** deneyim zaman çizelgesi: [yıl, rol, şirket] (en yeni üstte) */
  timeline: [string, string, string][];
  /** başlıklar (belgenin dilinde) */
  timelineTitle: string;
  stackTitle: string;
};

/** CV'deki ana teknolojiler (iki dilde aynı) */
const STACK = [
  "React",
  "Next.js",
  "TypeScript",
  "React Native",
  "Node.js",
  "NestJS",
  "PostgreSQL",
  "Prisma",
  "Tailwind",
  "OWASP",
];

const DOCS: Doc[] = [
  {
    lang: "TR",
    langName: "TÜRKÇE",
    title: "Özgeçmiş",
    file: "/documents/Zeynep_Deli_CV_TR.pdf",
    downloadName: "Zeynep_Deli_CV_TR.pdf",
    preview: "/documents/cv-tr.jpg",
    meta: "PDF · 1 sayfa · 140 KB",
    download: "İNDİR",
    view: "GÖRÜNTÜLE",
    stats: [
      ["3+", "yıl deneyim"],
      ["3", "rol"],
      ["20+", "teknoloji"],
    ],
    timeline: [
      [
        "2025",
        "Freelance Full-Stack Geliştirici",
        "Web & Mobil · Devam ediyor",
      ],
      [
        "2024",
        "Frontend Geliştirici & UI Tasarımcı",
        "Orbis Guard Cyber Security",
      ],
      ["2023", "React / React Native Geliştirici", "Yurotek · Remote"],
    ],
    timelineTitle: "DENEYİM",
    stackTitle: "TEKNOLOJİLER",
  },
  {
    lang: "EN",
    langName: "ENGLISH",
    title: "Curriculum Vitae",
    file: "/documents/Zeynep_Deli_CV_EN.pdf",
    downloadName: "Zeynep_Deli_CV_EN.pdf",
    preview: "/documents/cv-en.jpg",
    meta: "PDF · 1 page · 138 KB",
    download: "DOWNLOAD",
    view: "VIEW",
    stats: [
      ["3+", "years exp."],
      ["3", "roles"],
      ["20+", "technologies"],
    ],
    timeline: [
      ["2025", "Freelance Full-Stack Developer", "Web & Mobile · Present"],
      [
        "2024",
        "Frontend Developer & UI Designer",
        "Orbis Guard Cyber Security",
      ],
      ["2023", "React / React Native Developer", "Yurotek · Remote"],
    ],
    timelineTitle: "EXPERIENCE",
    stackTitle: "TECH STACK",
  },
];

/* ---- renkler: footer ile aynı ---- */
const EDGE = "70,190,255";
const ICE = "207,230,255";
const NAVY = "10,44,82";
const DEEP = "6,31,58";
/** sitedeki açık mavi yazı rengi (menü etiketleri) */
const T = "var(--c-a8eef6, 168, 238, 246)";

const metal = (light = 0): CSSProperties => ({
  background: `
    repeating-linear-gradient(90deg, rgba(255,255,255,.018) 0 1px, transparent 1px 3px),
    linear-gradient(180deg, rgba(${14 + light},${59 + light},${107 + light},1) 0%, rgba(${NAVY},1) 55%, rgba(${DEEP},1) 100%)
  `,
  border: `1px solid rgba(${ICE},.22)`,
  boxShadow: `inset 0 1px 0 rgba(255,255,255,.16), inset 0 -2px 0 rgba(0,0,0,.35), 0 14px 34px rgba(0,0,0,.38)`,
});

const CSS = `
  @keyframes dcIn {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes dcScan {
    from { transform: translateY(-100%); }
    to   { transform: translateY(100%); }
  }
  @keyframes dcFlow { to { background-position: 0 40px; } }
  @keyframes dcPop {
    from { opacity: 0; transform: translateY(6px) scale(.96); }
    to   { opacity: 1; transform: none; }
  }
  .dc-card { animation: dcIn .7s cubic-bezier(.2,.8,.3,1) both; }
  .dc-pop { animation: dcPop .5s cubic-bezier(.2,.8,.3,1) both; }
  .dc-chip { transition: border-color .2s, color .2s, box-shadow .2s; }
  .dc-chip:hover { color: #fff; border-color: rgba(${T},.9); box-shadow: 0 0 10px rgba(${T},.35); }
  .dc-paper img { transition: transform .5s cubic-bezier(.2,.8,.3,1), filter .5s; }
  .dc-card:hover .dc-paper img { transform: scale(1.03); filter: brightness(1.05); }
  .dc-card:hover .dc-scan { opacity: 1; }
  .dc-btn { cursor: pointer; transition: transform .2s, filter .2s, background .2s, color .2s; }
  .dc-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
  .dc-ghost:hover { background: rgba(${T},.14); color: #fff; }
  @media (prefers-reduced-motion: reduce) {
    .dc-card, .dc-scan, .dc-pop, .dc-flow { animation: none !important; }
  }
`;

export default function DocumentsSection() {
  const { t } = useLang();
  return (
    <div className="relative size-full overflow-hidden">
      {/* soket braketindeki TR · EN'in dokunma alanı */}
      <LangHotspots />
      <style>{CSS}</style>
      <SciFiBackground>
        <div className="absolute inset-0 overflow-y-auto">
          <div className="mx-auto flex min-h-full max-w-275 flex-col justify-center gap-6 px-5 py-12 sm:px-10 md:gap-7">
            {/* ÜST: geri + başlık */}
            <div className="flex flex-col gap-3">
              <a
                href="/home"
                className="inline-flex items-center gap-2 self-start font-mono text-[11px] tracking-[.2em] transition hover:text-white"
                style={{ color: `rgba(${T},.7)` }}
              >
                <FaArrowLeft className="size-3" /> {t("nav.home")}
              </a>
              <span
                className="font-mono text-[10px] tracking-[.3em]"
                style={{ color: `rgba(${T},.6)` }}
              >
                {t("docs.tag")}
              </span>
              <h1
                className="font-mono text-[clamp(24px,2.8vw,42px)] font-bold leading-[1.1] text-[#c4f7fb]"
                style={{ textShadow: `0 0 22px rgba(${EDGE},.35)` }}
              >
                {t("docs.title")}{" "}
                <span style={{ color: "#6ef5e8" }}>{t("docs.title2")}</span>
              </h1>
              <p
                className="max-w-150 font-mono text-[clamp(11px,0.85vw,13px)] leading-relaxed"
                style={{ color: `rgba(${T},.8)` }}
              >
                {t("docs.desc")}
              </p>
            </div>

            {/* BELGELER */}
            <div className="grid gap-5 md:grid-cols-2 md:gap-7">
              {DOCS.map((d, i) => (
                <DocCard key={d.lang} doc={d} index={i} />
              ))}
            </div>
          </div>
        </div>
      </SciFiBackground>
    </div>
  );
}

function DocCard({ doc, index }: { doc: Doc; index: number }) {
  const base = 150 + index * 140; // kartın beliriş gecikmesi (ms)
  /* önizleme resmi (public/documents/cv-xx.jpg) bulunamazsa çizimle göster */
  const [previewOk, setPreviewOk] = useState(true);
  return (
    <article
      className="dc-card relative flex flex-col gap-4 rounded-xl p-4 sm:gap-5 sm:p-5"
      style={{ ...metal(6), animationDelay: `${base}ms` }}
    >
      {[
        "left-2 top-2",
        "right-2 top-2",
        "left-2 bottom-2",
        "right-2 bottom-2",
      ].map((c) => (
        <Screw key={c} className={`absolute ${c}`} />
      ))}

      {/* ===== ÜST: önizleme + başlık + butonlar ===== */}
      <div className="flex gap-4 sm:gap-5">
        <a
          href={doc.file}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${doc.title} (${doc.langName}) — ${doc.view}`}
          className="dc-paper relative block aspect-210/297 w-[clamp(84px,8vw,118px)] shrink-0 overflow-hidden rounded-sm"
          style={{
            boxShadow: `0 0 0 1px rgba(${ICE},.35), 0 10px 24px rgba(0,0,0,.5), 0 0 22px rgba(${EDGE},.18)`,
            background: "#fff",
          }}
        >
          {previewOk ? (
            <Image
              src={doc.preview}
              alt=""
              fill
              sizes="150px"
              draggable={false}
              className="object-cover object-top"
              onError={() => setPreviewOk(false)}
            />
          ) : (
            /* önizleme resmi yüklenemezse: CV'nin çizimle küçük kopyası */
            <PaperMock lang={doc.lang} />
          )}
          <span
            aria-hidden
            className="dc-scan pointer-events-none absolute inset-0 opacity-0 transition-opacity"
          >
            <span
              className="absolute inset-x-0 h-1/3"
              style={{
                background: `linear-gradient(180deg, transparent, rgba(${EDGE},.35), transparent)`,
                animation: "dcScan 1.6s linear infinite",
              }}
            />
          </span>
        </a>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span
              className="inline-flex items-center gap-2 self-start rounded-md px-2 py-1 font-mono text-[10px] font-bold tracking-[.2em]"
              style={{
                color: `rgb(${DEEP})`,
                background: `rgb(${T})`,
                boxShadow: `0 0 12px rgba(${T},.35)`,
              }}
            >
              {doc.lang} · {doc.langName}
            </span>
            <h2
              className="font-mono text-[clamp(16px,1.5vw,22px)] font-bold leading-tight"
              style={{ color: `rgb(${T})` }}
            >
              {doc.title}
            </h2>
            <span
              className="flex items-center gap-2 font-mono text-[clamp(10px,0.8vw,12px)] tracking-[.06em]"
              style={{ color: `rgba(${T},.65)` }}
            >
              <FaFilePdf className="size-3.5 shrink-0" /> {doc.meta}
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <a
              href={doc.file}
              download={doc.downloadName}
              className="dc-btn inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-mono text-[11px] font-bold tracking-[.16em]"
              style={{
                color: `rgb(${DEEP})`,
                background: `linear-gradient(135deg, #eefcff, rgb(${T}) 55%, rgba(${T},.85))`,
                border: `1px solid rgba(${T},.9)`,
                boxShadow: `0 0 16px rgba(${T},.4), inset 0 1px 0 rgba(255,255,255,.45)`,
              }}
            >
              <FaDownload className="size-3" /> {doc.download}
            </a>
            <a
              href={doc.file}
              target="_blank"
              rel="noopener noreferrer"
              className="dc-btn dc-ghost inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-mono text-[11px] tracking-[.16em]"
              style={{
                color: `rgb(${T})`,
                border: `1px solid rgba(${T},.55)`,
                background: `rgba(${NAVY},.5)`,
              }}
            >
              <FaEye className="size-3" /> {doc.view}
            </a>
          </div>
        </div>
      </div>

      {/* ===== RAKAMLAR — saat ekranı gibi parlak göstergeler ===== */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {doc.stats.map(([v, label], k) => (
          <div
            key={label}
            className="dc-pop flex flex-col items-center justify-center rounded-md px-1 py-2.5"
            style={{
              animationDelay: `${base + 250 + k * 90}ms`,
              background: `linear-gradient(180deg, rgba(${EDGE},.16), rgba(${DEEP},.85))`,
              border: `1px solid rgba(${T},.3)`,
              boxShadow: `inset 0 0 14px rgba(${EDGE},.14)`,
            }}
          >
            <span
              className="font-mono text-[clamp(20px,1.9vw,28px)] font-bold leading-none"
              style={{
                color: `rgb(${T})`,
                textShadow: `0 0 12px rgba(${T},.55)`,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {v}
            </span>
            <span
              className="mt-1 text-center font-mono text-[clamp(9px,0.7vw,11px)] tracking-[.12em] uppercase"
              style={{ color: `rgba(${T},.65)` }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ===== DENEYİM ZAMAN ÇİZELGESİ ===== */}
      <div className="flex flex-col gap-2">
        <SectionLabel>{doc.timelineTitle}</SectionLabel>
        <ol className="relative flex flex-col gap-3 pl-5">
          {/* akım çizgisi: yukarıdan aşağı turkuaz ışık akar */}
          <span
            aria-hidden
            className="dc-flow absolute top-1.5 bottom-1.5 left-1.25 w-0.5 rounded-full"
            style={{
              background: `repeating-linear-gradient(180deg, rgba(${T},.9) 0 8px, rgba(${T},.15) 8px 20px)`,
              backgroundSize: "2px 40px",
              animation: "dcFlow 1.2s linear infinite",
              boxShadow: `0 0 6px rgba(${T},.5)`,
            }}
          />
          {doc.timeline.map(([year, role, org], k) => (
            <li
              key={year}
              className="dc-pop relative flex flex-col"
              style={{ animationDelay: `${base + 420 + k * 110}ms` }}
            >
              {/* durak */}
              <span
                aria-hidden
                className="absolute top-1 -left-5 block size-3 rounded-full"
                style={{
                  background:
                    k === 0
                      ? `radial-gradient(circle, #fff 0 25%, rgb(${T}) 45%, rgba(${T},.4) 100%)`
                      : `rgb(${DEEP})`,
                  border: `2px solid rgba(${T},${k === 0 ? 1 : 0.7})`,
                  boxShadow: k === 0 ? `0 0 10px rgba(${T},.9)` : "none",
                }}
              />
              <span className="flex flex-wrap items-baseline gap-x-2.5">
                <span
                  className="font-mono text-[clamp(10px,0.8vw,12px)] font-bold tracking-widest"
                  style={{ color: `rgb(${T})` }}
                >
                  {year}
                </span>
                <span
                  className="font-mono text-[clamp(11px,0.88vw,13px)] font-bold"
                  style={{ color: "#e6f6ff" }}
                >
                  {role}
                </span>
              </span>
              <span
                className="font-mono text-[clamp(10px,0.78vw,12px)]"
                style={{ color: `rgba(${T},.6)` }}
              >
                {org}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* ===== TEKNOLOJİ ÇİPLERİ ===== */}
      <div className="flex flex-col gap-2">
        <SectionLabel>{doc.stackTitle}</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {STACK.map((t, k) => (
            <span
              key={t}
              className="dc-chip dc-pop rounded-full px-2.5 py-1 font-mono text-[clamp(10px,0.78vw,12px)]"
              style={{
                animationDelay: `${base + 700 + k * 40}ms`,
                color: `rgb(${T})`,
                background: "rgba(6,22,46,.72)",
                border: `1px solid rgba(${T},.28)`,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   KAĞIT ÇİZİMİ — önizleme resmi yoksa CV'nin düzeni küçük ölçekte
   çizilir: fotoğraf, isim, unvan, iletişim; solda dar, sağda geniş sütun.
   Tüm ölçüler kağıt genişliğine oranla (container query birimi: cqw).
========================================================= */
const INK = "#1d2433";
const GRAY = "#c9ced8";

/** çizgi uzunlukları (%) — sabit desen */
const mockLines = (n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => 55 + ((i * 37 + seed * 13) % 45));

/** kağıttaki bölüm başlığı + altındaki ince çizgi */
function MockHeading({ t }: { t: string }) {
  return (
    <div style={{ marginTop: "3.2cqw" }}>
      <div
        style={{
          fontSize: "3.4cqw",
          fontWeight: 800,
          letterSpacing: ".08em",
          color: INK,
          lineHeight: 1,
        }}
      >
        {t}
      </div>
      <div style={{ height: "0.5cqw", background: GRAY, marginTop: "1cqw" }} />
    </div>
  );
}

/** kağıttaki metin satırları (gri çubuklar) */
function MockLines({ n, seed }: { n: number; seed: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.3cqw",
        marginTop: "1.8cqw",
      }}
    >
      {mockLines(n, seed).map((w, i) => (
        <div
          key={i}
          style={{
            height: "1.1cqw",
            width: `${w}%`,
            background: GRAY,
            borderRadius: 99,
          }}
        />
      ))}
    </div>
  );
}

function PaperMock({ lang }: { lang: string }) {
  const tr = lang === "TR";
  const left = tr
    ? ["EĞİTİM", "YETKİNLİKLER", "DİLLER", "SERTİFİKALAR", "REFERANSLAR"]
    : ["EDUCATION", "SKILLS", "LANGUAGES", "CERTIFICATES", "REFERENCES"];
  const right = tr ? ["HAKKIMDA", "İŞ DENEYİMİ"] : ["PROFILE", "EXPERIENCE"];
  return (
    /* dış kutu "container": içerideki cqw birimleri kağıdın genişliğine göre */
    <div
      className="absolute inset-0 overflow-hidden bg-white font-sans"
      style={{ containerType: "inline-size" }}
    >
      {/* kağıdın TAMAMINI doldurur: bölümler sütun boyunca eşit dağılır */}
      <div
        style={{
          padding: "6cqw",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* başlık: fotoğraf + isim */}
        <div style={{ display: "flex", alignItems: "center", gap: "4cqw" }}>
          <div
            style={{
              width: "17cqw",
              height: "17cqw",
              borderRadius: "50%",
              flexShrink: 0,
              background:
                "radial-gradient(circle at 50% 38%, #8a6a5a 0 28%, #3a2a24 30% 60%, #d9dde5 62%)",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "7.2cqw",
                fontWeight: 900,
                color: INK,
                lineHeight: 1,
                letterSpacing: ".02em",
              }}
            >
              ZEYNEP DELİ
            </div>
            <div
              style={{
                fontSize: "2.6cqw",
                letterSpacing: ".22em",
                color: "#5b6476",
                marginTop: "1.6cqw",
                whiteSpace: "nowrap",
              }}
            >
              {tr
                ? "FULL-STACK YAZILIM GELİŞTİRİCİ"
                : "FULL-STACK SOFTWARE DEVELOPER"}
            </div>
            <div style={{ display: "flex", gap: "3cqw", marginTop: "2cqw" }}>
              {[0, 1].map((k) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.2cqw",
                  }}
                >
                  {[0, 1].map((j) => (
                    <div
                      key={j}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1cqw",
                      }}
                    >
                      <div
                        style={{
                          width: "2.2cqw",
                          height: "2.2cqw",
                          borderRadius: "50%",
                          background: INK,
                        }}
                      />
                      <div
                        style={{
                          width: `${14 + ((k + j) % 2) * 6}cqw`,
                          height: "1cqw",
                          background: GRAY,
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ height: "0.7cqw", background: INK, marginTop: "4cqw" }} />

        {/* iki sütun */}
        <div
          style={{
            display: "flex",
            gap: "5cqw",
            marginTop: "1cqw",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              width: "34%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {left.map((t, i) => (
              <div key={t}>
                <MockHeading t={t} />
                <MockLines n={i === 1 ? 9 : i === 4 ? 4 : 3} seed={i} />
              </div>
            ))}
          </div>
          <div
            style={{
              width: "0.3cqw",
              background: GRAY,
              alignSelf: "stretch",
              marginTop: "3cqw",
            }}
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <MockHeading t={right[0]} />
              <MockLines n={5} seed={7} />
            </div>
            <MockHeading t={right[1]} />
            {[0, 1, 2].map((k) => (
              <div key={k}>
                <div
                  style={{
                    height: "1.6cqw",
                    width: "70%",
                    background: "#7d8697",
                    borderRadius: 99,
                  }}
                />
                <div
                  style={{
                    height: "1.1cqw",
                    width: "40%",
                    background: GRAY,
                    borderRadius: 99,
                    marginTop: "1.3cqw",
                  }}
                />
                <MockLines n={k === 0 ? 6 : 5} seed={10 + k} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** kart içi küçük bölüm başlığı: yazı + sağa uzanan ince çizgi */
function SectionLabel({ children }: { children: string }) {
  return (
    <span
      className="flex items-center gap-3 font-mono text-[10px] tracking-[.26em]"
      style={{ color: `rgba(${T},.6)` }}
    >
      {children}
      <span
        aria-hidden
        className="h-px flex-1"
        style={{
          background: `linear-gradient(90deg, rgba(${T},.35), transparent)`,
        }}
      />
    </span>
  );
}

function Screw({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2.5 shrink-0 rounded-full ${className}`}
      style={{
        background: `radial-gradient(circle at 35% 30%, rgba(${ICE},.9), rgba(${EDGE},.5) 45%, rgba(${DEEP},1) 100%)`,
        boxShadow: "0 1px 2px rgba(0,0,0,.6)",
      }}
    >
      <span
        className="absolute top-1/2 left-1/2 block h-px w-7/10 -translate-x-1/2 -translate-y-1/2 rotate-45"
        style={{ background: `rgba(${DEEP},.9)` }}
      />
    </span>
  );
}
