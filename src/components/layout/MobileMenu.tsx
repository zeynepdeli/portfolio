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
} from "@/components/ui/SocialLinks"
import MenuSlot from "@/components/ui/MenuSlot";
import GlowConnector, { CONNECTOR_HEIGHT } from "@/components/ui/GlowConnector";
import { intro, T } from "@/components/ui/Intro";

/* =========================================================
   MOBİL MENÜ — telefon / dikey tablet
   Sol üstte DIP swiç bloğu düğmesi. Basınca SOLDAN metal bir çekmece
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

type Props = {
  powered?: boolean;
  /** düğmenin ekrandaki yeri */
  style?: CSSProperties;
};

export default function MobileMenu({ powered = false, style }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const current =
    ITEMS.find((m) => m.href && pathname?.startsWith(m.href))?.key ?? "home";
  const drawerRef = useRef<HTMLDivElement>(null);
  /* yatay konnektörün ölçeği: çekmece genişliğine yayılsın */
  const [connScale, setConnScale] = useState(1.1);
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!open || !drawer) return;
    /* ResizeObserver ilk ölçümü de verir; ayrıca resize dinlemek gerekmez */
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
      `}</style>

      {/* ---------- DÜĞME — DIP SWİÇ BLOĞU ----------
          Anakartlardaki ayar anahtarı gibi: vidalı kırmızı-değil
          lacivert gövde, üç sürgülü anahtar (= menü çizgileri), sağda
          LED'ler ve "ON" yazısı. Sistem açılınca anahtarlar sağa (ON)
          kayar ve LED'ler yanar; basınca bloğun tamamı içeri çöker. */}
      <button
        type="button"
        aria-label="Menüyü aç"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="absolute z-60 cursor-pointer rounded-[9px] p-1.25 transition outline-hidden focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-78d2ff,255,180,84))] active:translate-y-px active:scale-97"
        style={{
          ...style,
          width: 58,
          height: 50,
          background: metal,
          border: `1px solid rgba(var(--c-78dcff,120,220,255),${powered ? 0.55 : 0.3})`,
          boxShadow: `inset 0 1px 0 rgba(${ICE},.35), inset 0 -2px 0 rgba(0,0,0,.45), 0 6px 16px rgba(0,0,0,.45)${
            powered ? `, 0 0 14px rgba(${EDGE},.3)` : ""
          }`,
          ...intro("introDown", T.menu, 0.6, "back"),
        }}
      >
        {/* üst etiket */}
        <span className="absolute top-0.5 left-1.75 font-mono text-[5.5px] tracking-[.18em] text-[rgba(var(--c-a8eef6,168,238,246),0.7)]">
          SW1
        </span>
        <span
          className="absolute top-0.5 right-1.75 font-mono text-[5.5px] tracking-[.18em]"
          style={{
            color: powered
              ? "rgb(var(--c-6ef5e8,110,245,232))"
              : "rgba(var(--c-a8eef6,168,238,246),.4)",
          }}
        >
          ON
        </span>
        {/* anahtar yuvası */}
        <span
          className="absolute inset-x-1.75 top-2.75 bottom-1.5 flex flex-col justify-between rounded-[3px] p-0.75"
          style={{
            background: "rgb(var(--c-020b17,2,11,23))",
            boxShadow: "inset 0 2px 3px rgba(0,0,0,.8)",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="relative flex h-1.75 items-center gap-0.75"
            >
              {/* ray */}
              <span
                className="relative block h-full flex-1 rounded-[1.5px]"
                style={{
                  background: "rgba(var(--c-0a2c52,10,44,82),.9)",
                  border: "1px solid rgba(var(--c-78dcff,120,220,255),.18)",
                }}
              >
                {/* sürgü */}
                <span
                  className="absolute -top-px block h-1.75 w-2.75 rounded-[1.5px]"
                  style={{
                    left: powered ? "calc(100% - 10px)" : "-1px",
                    background: powered
                      ? "linear-gradient(180deg, rgb(var(--c-e1f8ff,225,248,255)), rgb(var(--c-6ef5e8,110,245,232)))"
                      : "linear-gradient(180deg, rgb(var(--c-8fb3d6,143,179,214)), rgb(var(--c-4a6b90,74,107,144)))",
                    boxShadow: powered
                      ? `0 0 6px rgba(${EDGE},.9)`
                      : "0 1px 1px rgba(0,0,0,.6)",
                    transition: `left 380ms cubic-bezier(.3,1.4,.5,1) ${i * 90}ms, background 300ms ${i * 90}ms`,
                  }}
                />
              </span>
              {/* LED */}
              <span
                className="block size-1 shrink-0 rounded-full"
                style={{
                  background: powered
                    ? "#5df2a6"
                    : "rgba(var(--c-7fb6e8,127,182,232),.25)",
                  boxShadow: powered ? "0 0 5px #5df2a6" : "none",
                  transition: `background 300ms ${200 + i * 90}ms`,
                }}
              />
            </span>
          ))}
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
              <span className="flex items-center gap-2 font-mono text-[10px] tracking-[.26em] text-[rgb(var(--c-5fb8d0,95,184,208))]">
                <span
                  className="block size-1.5 rounded-full"
                  style={{
                    background: "#5df2a6",
                    boxShadow: "0 0 6px #5df2a6",
                  }}
                />
                [ NAVIGATION ]
              </span>
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
                ışık hüzmesi aşağı, butonlara iner */}
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
            <nav className="relative z-1 mt-14 flex flex-col gap-3 px-4">
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
