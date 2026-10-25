"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FaHome,
  FaPalette,
  FaFolderOpen,
  FaFileAlt,
  FaLinkedin,
  FaGithub,
  FaInstagram,
  FaWhatsapp,
} from "react-icons/fa";
import {
  GITHUB,
  INSTAGRAM,
  LINKEDIN,
  WHATSAPP,
  linkProps,
} from "@/components/ui/SocialLinks";
import MenuSlot from "@/components/ui/MenuSlot";
import { intro, T } from "@/components/ui/Intro";

/* =========================================================
   MOBİL MENÜ — telefon / dikey tablet
   Sağ üstte işlemci (CPU) çipi düğmesi. Basınca SOLDAN metal bir çekmece
   kayarak açılır; içinde masaüstündeki menünün AYNISI (ışıklı
   konnektörler + faderlı butonlar) ekrana sığacak kadar ölçekli
   durur. Altında sosyal bağlantılar. Arkası kararır; dışına,
   ✕'e ya da Esc'ye basınca (veya bir sayfaya gidince) kapanır.
========================================================= */

/** Sosyal bağlantılar — adresler: components/ui/socialLinks.ts */
const SOCIALS = [
  { icon: FaLinkedin, label: "LinkedIn", href: LINKEDIN },
  { icon: FaGithub, label: "GitHub", href: GITHUB },
  { icon: FaInstagram, label: "Instagram", href: INSTAGRAM },
  { icon: FaWhatsapp, label: "WhatsApp", href: WHATSAPP },
];

const EDGE = "var(--c-46beff,70,190,255)";
const ICE = "var(--c-cfe6ff,207,230,255)";
/** Masaüstü menüsünün (konnektör + butonlar) ölçeksiz boyu */
const ITEMS = [
  { key: "home", label: "HOME", icon: FaHome, href: "/home" },
  { key: "skills", label: "SKILLS", icon: FaPalette, href: "/roadmap" },
  { key: "projects", label: "PROJECTS", icon: FaFolderOpen, href: "/projects" },
  { key: "documents", label: "DOCUMENTS", icon: FaFileAlt, href: "/documents" },
] as const;

const metal = `
  repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px),
  linear-gradient(180deg, rgb(var(--c-154476,21,68,118)) 0%, rgb(var(--c-0b2b55,11,43,85)) 55%, rgb(var(--c-071c3b,7,28,59)) 100%)
`;

export type MenuKey = "home" | "skills" | "projects" | "documents";

type Props = {
  powered?: boolean;
  /** sayfa içinde gezinme (site akışı): true dönerse adres değişmez,
   *  bölüm aynı sayfada açılır */
  onNavigate?: (key: MenuKey) => boolean;
  /** düğmenin ekrandaki yeri */
  style?: CSSProperties;
};

export default function MobileMenu({
  powered = false,
  style,
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  /* menüdeki sayfaları arka planda önceden indir: tıklayınca bekleme olmasın */
  useEffect(() => {
    ITEMS.forEach((m) => {
      if (m.href) router.prefetch(m.href);
    });
  }, [router]);
  const pathname = usePathname();
  const current =
    ITEMS.find((m) => m.href && pathname?.startsWith(m.href))?.key ?? "home";
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <style>{`
        @keyframes mmSlide { from { transform: translateX(-24px) scale(.96); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes mmItem { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
        @keyframes mmFade { from { opacity: 0; } to { opacity: 1; } }
        .mm-cpu:hover .mm-cpu-line { box-shadow: 0 0 7px rgba(var(--c-46beff,70,190,255),1); }
      `}</style>

      {/* ---------- DÜĞME — İŞLEMCİ (CPU) ÇİPİ ----------
          Anakartın kalbi: dört kenarında altın pinler, sol üst köşede
          1. pin işareti, ortasında metal kapak; kapağın üstünde menünün
          üç çizgisi. Sistem açılınca pinler ve çizgiler turkuaz yanar,
          çekirdekten hafif bir ışık yayılır; basınca çip içeri çöker. */}
      <button
        type="button"
        aria-label="Menüyü aç"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="mm-cpu absolute z-60 cursor-pointer transition outline-hidden focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-78d2ff,255,180,84))] active:translate-y-px active:scale-95"
        style={{
          ...style,
          marginLeft: 4,
          width: 50,
          height: 50,
          borderRadius: 6,
          ...intro("introDown", T.menu, 0.6, "back"),
        }}
      >
        {/* pinler: her kenarda 5 tane */}
        {(["top", "bottom", "left", "right"] as const).map((side) =>
          [0, 1, 2, 3, 4].map((k) => {
            const along = 10.5 + k * 6.5; // px, kenar boyunca (ortalı)
            const horiz = side === "top" || side === "bottom";
            return (
              <span
                key={`${side}${k}`}
                aria-hidden
                className="absolute block rounded-[1px]"
                style={{
                  width: horiz ? 3 : 5,
                  height: horiz ? 5 : 3,
                  ...(horiz ? { left: along } : { top: along }),
                  ...(side === "top"
                    ? { top: 0 }
                    : side === "bottom"
                      ? { bottom: 0 }
                      : side === "left"
                        ? { left: 0 }
                        : { right: 0 }),
                  background: powered
                    ? "linear-gradient(180deg, #ffe7a3, #d9a441)"
                    : "linear-gradient(180deg, #b89a5a, #7d6533)",
                  boxShadow: powered ? "0 0 3px rgba(255,214,120,.6)" : "none",
                  transition: `background 300ms ${k * 40}ms`,
                }}
              />
            );
          }),
        )}
        {/* çip gövdesi */}
        <span
          aria-hidden
          className="absolute rounded-[5px]"
          style={{
            inset: 4,
            background: metal,
            border: `1px solid rgba(var(--c-78dcff,120,220,255),${powered ? 0.6 : 0.3})`,
            boxShadow: `inset 0 1px 0 rgba(${ICE},.35), inset 0 -2px 0 rgba(0,0,0,.45), 0 6px 14px rgba(0,0,0,.5)${
              powered ? `, 0 0 14px rgba(${EDGE},.35)` : ""
            }`,
          }}
        >
          {/* 1. pin işareti */}
          <span
            className="absolute top-1 left-1 block size-1.5"
            style={{
              clipPath: "polygon(0 0, 100% 0, 0 100%)",
              background: powered
                ? "rgb(var(--c-6ef5e8,110,245,232))"
                : "rgba(var(--c-a8eef6,168,238,246),.45)",
            }}
          />
          {/* metal kapak + menü çizgileri */}
          <span
            className="absolute flex flex-col items-center justify-center gap-0.75 rounded-[3px]"
            style={{
              inset: 7,
              background:
                "linear-gradient(145deg, rgb(var(--c-1d4f86,29,79,134)), rgb(var(--c-0a2546,10,37,70)))",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 2px rgba(0,0,0,.6)",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="mm-cpu-line block h-0.5 rounded-full"
                style={{
                  width: 14,
                  background: powered
                    ? "rgb(var(--c-a8eef6,168,238,246))"
                    : "rgba(var(--c-a8eef6,168,238,246),.4)",
                  boxShadow: powered ? `0 0 5px rgba(${EDGE},.9)` : "none",
                  transition: `background 300ms ${150 + i * 90}ms, box-shadow 300ms ${150 + i * 90}ms`,
                }}
              />
            ))}
          </span>
        </span>
      </button>

      {/* ---------- ÇEKMECE (mobil sayfa) ----------
          Tepede YATAY konnektör: pinleri yanar, ışığı AŞAĞI, menü
          butonlarının üstüne düşer. Butonlar tam genişlikte alt alta,
          en altta sosyal bağlantılar. */}
      {open && (
        <div
          className="fixed inset-0 z-10000"
          role="dialog"
          aria-modal="true"
          aria-label="Menü"
        >
          <div
            className="absolute inset-0 bg-[rgba(var(--c-010612,1,6,18),.35)]"
            style={{ animation: "mmFade 450ms ease-out both" }}
            onClick={() => setOpen(false)}
          />

          <div
            /* sayfayı tamamen kapatmaz: soldan, genişliğin ~%72'si kadar */
            className="absolute top-2 left-2 flex max-h-[calc(100%-16px)] w-[min(72vw,340px)] flex-col overflow-hidden rounded-[22px]"
            style={{
              background: `
                radial-gradient(ellipse 80% 45% at 50% 18%, rgba(${EDGE},.14), transparent 70%),
                linear-gradient(180deg, rgb(var(--c-0b2a4a,11,42,74)) 0%, rgb(var(--c-071d36,7,29,54)) 60%, rgb(var(--c-04142a,4,20,42)) 100%)
              `,
              border: "1.5px solid rgba(var(--c-78dcff,120,220,255),.35)",
              boxShadow: `0 20px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(${ICE},.3)`,
              animation: "mmSlide 560ms cubic-bezier(.22,1,.36,1) both",
            }}
          >
            {/* üst şerit: başlık + kapat */}
            <div className="relative flex h-14.5 shrink-0 items-center justify-between px-5">
              <span aria-hidden />
              <button
                type="button"
                aria-label="Menüyü kapat"
                onClick={() => setOpen(false)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-[10px] text-[rgb(var(--c-a8eef6,168,238,246))] outline-hidden transition-colors hover:text-[rgb(var(--c-78d2ff,255,198,120))] focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-78d2ff,255,180,84))] active:scale-95"
                style={{
                  background: metal,
                  border: "1px solid rgba(var(--c-78dcff,120,220,255),.35)",
                }}
              >
                ✕
              </button>
            </div>

            {/* MENÜ */}
            <nav className="relative z-1 mt-1 flex flex-col gap-3 px-4">
              {ITEMS.map((item, i) => (
                <div
                  key={item.key}
                  style={{
                    animation: `mmItem 620ms cubic-bezier(.22,1,.36,1) ${260 + i * 90}ms both`,
                  }}
                >
                  <MenuSlot
                    compact
                    label={item.label}
                    icon={item.icon}
                    active={current === item.key}
                    litFromTop
                    height={58}
                    onClick={() => {
                      if (!item.href) return;
                      setOpen(false);
                      if (onNavigate?.(item.key)) return;
                      if (item.href !== pathname) router.push(item.href);
                    }}
                  />
                </div>
              ))}
            </nav>

            {/* sosyal bağlantılar */}
            <div className="relative z-1 shrink-0 px-4 py-5">
              <div className="mb-2 text-center font-mono text-[9px] tracking-[.26em] text-[rgb(var(--c-5fb8d0,95,184,208))]">
                CONNECT
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {SOCIALS.map(({ icon: Icon, label, href }) => (
                  <a
                    key={label}
                    {...linkProps(href)}
                    aria-label={label}
                    className="flex size-9 items-center justify-center rounded-[9px] text-[rgb(var(--c-c4f7fb,196,247,251))] outline-hidden transition hover:text-[rgb(var(--c-78d2ff,255,198,120))] focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-78d2ff,255,180,84))] active:scale-95"
                    style={{
                      background: metal,
                      border: "1px solid rgba(var(--c-78dcff,120,220,255),.3)",
                      boxShadow: `inset 0 1px 0 rgba(${ICE},.3), 0 4px 10px rgba(0,0,0,.4)`,
                    }}
                  >
                    <Icon
                      size={16}
                      style={{
                        filter: `drop-shadow(0 0 4px rgba(${EDGE},.8))`,
                      }}
                    />
                  </a>
                ))}
              </div>
            </div>

            {/* köşe vidaları */}
            {["top-3 left-3", "right-3 bottom-3", "bottom-3 left-3"].map(
              (c) => (
                <span
                  key={c}
                  aria-hidden
                  className={`absolute ${c} block size-2.25 rounded-full`}
                  style={{
                    background:
                      "radial-gradient(circle at 35% 30%, rgba(var(--c-cfe6ff,207,230,255),.95), rgba(var(--c-46beff,70,190,255),.5) 45%, rgba(var(--c-061f3a,6,31,58),1) 100%)",
                  }}
                />
              ),
            )}
          </div>
        </div>
      )}
    </>
  );
}
