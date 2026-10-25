"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
import GlowConnector, { CONNECTOR_HEIGHT } from "@/components/ui/GlowConnector";
import { intro, T } from "@/components/ui/Intro";

/* =========================================================
   MOBİL MENÜ — telefon / dikey tablet
   Sol üstte işlemci soketi (LGA) düğmesi. Basınca SOLDAN metal bir çekmece
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

/** GlowConnector'ın ölçeksiz kalınlığı (yatay çevrilince yüksekliği olur) */
const CONN_T = 42;

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
  const drawerRef = useRef<HTMLDivElement>(null);
  /* yatay konnektörün ölçeği: çekmece genişliğine yayılsın */
  const [connScale, setConnScale] = useState(1.1);
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!open || !drawer) return;
    const observer = new ResizeObserver(() => {
      setConnScale(Math.min(1.6, (drawer.clientWidth - 48) / CONNECTOR_HEIGHT));
    });
    observer.observe(drawer);
    return () => observer.disconnect();
  }, [open]);

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
        .mm-sock:hover .mm-sock-line { box-shadow: 0 0 7px rgba(var(--c-46beff,70,190,255),1); }
      `}</style>

      {/* ---------- DÜĞME — İŞLEMCİ SOKETİ (LGA) ----------
          Anakarttaki işlemci yuvası: metal çerçevede sıra sıra altın
          temas noktaları, yanında kilit kolu; ortadaki boş yuvada
          menünün üç çizgisi yanar. Basınca soket içeri çöker. */}
      <button
        type="button"
        aria-label="Menüyü aç"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="mm-sock absolute z-60 cursor-pointer transition outline-hidden focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-78d2ff,255,180,84))] active:translate-y-px active:scale-95"
        style={{
          ...style,
          width: 50,
          height: 50,
          borderRadius: 7,
          background: metal,
          border: `1px solid rgba(var(--c-78dcff,120,220,255),${powered ? 0.55 : 0.3})`,
          boxShadow: `inset 0 1px 0 rgba(${ICE},.35), inset 0 -2px 0 rgba(0,0,0,.45), 0 6px 16px rgba(0,0,0,.45)${
            powered ? `, 0 0 14px rgba(${EDGE},.3)` : ""
          }`,
          ...intro("introDown", T.menu, 0.6, "back"),
        }}
      >
        {/* temas noktaları (altın pin dizisi) */}
        <span
          aria-hidden
          className="absolute rounded-[3px]"
          style={{
            inset: 6,
            background: `radial-gradient(circle, ${powered ? "#f0cd78" : "#9c8550"} 0.9px, transparent 1.3px) 0 0 / 4.4px 4.4px, rgb(var(--c-0a1a2c,10,26,44))`,
            boxShadow: "inset 0 0 0 2px rgba(var(--c-2b4c72,43,76,114),1)",
            transition: "background 400ms",
          }}
        />
        {/* ortadaki boş yuva + menü çizgileri */}
        <span
          aria-hidden
          className="absolute flex flex-col justify-center gap-0.75 rounded-[2px] px-1"
          style={{
            inset: 15,
            background: "rgb(var(--c-0b2b55,11,43,85))",
            boxShadow: powered
              ? "0 0 8px rgba(var(--c-6ef5e8,110,245,232),.6)"
              : "inset 0 1px 2px rgba(0,0,0,.6)",
            transition: "box-shadow 400ms",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="mm-sock-line block h-0.5 rounded-full"
              style={{
                background: powered
                  ? "rgb(var(--c-a8eef6,168,238,246))"
                  : "rgba(var(--c-a8eef6,168,238,246),.4)",
                boxShadow: powered ? `0 0 5px rgba(${EDGE},.95)` : "none",
                transition: `background 300ms ${150 + i * 90}ms, box-shadow 300ms ${150 + i * 90}ms`,
              }}
            />
          ))}
        </span>
        {/* kilit kolu */}
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            right: -4,
            top: 6,
            bottom: 6,
            width: 3,
            background:
              "linear-gradient(90deg, rgb(var(--c-dfe9f5,223,233,245)), rgb(var(--c-7b8da3,123,141,163)))",
            boxShadow: "0 1px 2px rgba(0,0,0,.5)",
          }}
        />
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
            ref={drawerRef}
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

            {/* YATAY KONNEKTÖR — masaüstündeki konnektör 90° çevrilmiş;
                pinleri yanar, ışığı aşağı, butonlara iner */}
            <div
              className="relative mx-auto shrink-0"
              style={{
                width: CONNECTOR_HEIGHT * connScale,
                height: CONN_T * connScale,
              }}
            >
              <div
                className="absolute top-0 left-0"
                style={{
                  width: CONN_T,
                  height: CONNECTOR_HEIGHT,
                  transformOrigin: "0 0",
                  transform: `translateX(${CONNECTOR_HEIGHT * connScale}px) scale(${connScale}) rotate(90deg)`,
                }}
              >
                <GlowConnector lit />
              </div>
            </div>

            {/* MENÜ */}
            <nav className="relative z-1 mt-6 flex flex-col gap-3 px-4">
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
