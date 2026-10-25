"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
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
   Sol üstte panele vidalı braket düğmesi. Basınca SOL ÜSTTEN metal bir çekmece
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

/** menü düğmesi (panele vidalı braket) ölçüleri */
export const MENU_BTN_W = 62;
export const MENU_BTN_H = 34;
const BTN_W = MENU_BTN_W;
const BTN_H = MENU_BTN_H;
/** braketin içindeki küçük soket */
const SOCK = 24;
/** kapanış animasyonu (ms) */
const CLOSE_MS = 320;

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
  /* açık / kapanıyor: kapanırken çekmece animasyonla düğmeye geri
     toplanır, sonra kaldırılır */
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(0);
  const close = useCallback(() => {
    setClosing(true);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  /* konnektörün pinleri çekmece açıldıktan sonra yanar */
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setLit(true), 260);
    return () => {
      window.clearTimeout(t);
      setLit(false);
    };
  }, [open]);
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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <style>{`
        /* AÇILIŞ: çekmece düğmenin olduğu köşeden açılır (perde gibi
           açılan kesim + hafif büyüme), içerik sırayla ışıkla gelir */
        @keyframes mmOpen {
          0%   { clip-path: inset(0 92% 94% 0 round 22px); transform: translateY(-6px) scale(.94); opacity: .4; }
          55%  { opacity: 1; }
          100% { clip-path: inset(0 0 0 0 round 22px); transform: none; opacity: 1; }
        }
        @keyframes mmClose {
          0%   { clip-path: inset(0 0 0 0 round 22px); transform: none; opacity: 1; }
          100% { clip-path: inset(0 92% 94% 0 round 22px); transform: translateY(-6px) scale(.94); opacity: 0; }
        }
        @keyframes mmItem {
          0%   { opacity: 0; transform: translateX(-18px); filter: brightness(2.2); }
          60%  { opacity: 1; filter: brightness(1.35); }
          100% { opacity: 1; transform: none; filter: none; }
        }
        @keyframes mmItemOut { to { opacity: 0; transform: translateX(-12px); } }
        @keyframes mmFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mmFadeOut { to { opacity: 0; } }
        /* açılırken çekmecenin kenarında bir ışık süpürmesi */
        @keyframes mmSweep {
          0%   { transform: translateY(-100%); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        .mm-btn:hover .mm-line { box-shadow: 0 0 7px rgba(var(--c-46beff,70,190,255),1); }
        @media (prefers-reduced-motion: reduce) {
          .mm-drawer, .mm-drawer * { animation-duration: 1ms !important; animation-delay: 0ms !important; }
        }
      `}</style>

      {/* ---------- DÜĞME — PANELE VİDALI BRAKET ----------
          Üst ortadaki güç soketinin braketiyle AYNI parça: cam panelin üst
          kenarından sarkan, iki vidalı fırçalanmış metal braket. İçinde
          küçük bir işlemci soketi (altın temas noktaları) ve onun
          ortasında menünün üç çizgisi yanar. Panelin donanımının bir
          parçası gibi durur. */}
      <button
        type="button"
        aria-label="Menüyü aç"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="mm-btn absolute z-60 cursor-pointer outline-hidden transition active:translate-y-px focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-78d2ff,255,180,84))]"
        style={{
          ...style,
          width: BTN_W,
          height: BTN_H,
          borderRadius: "0 0 11px 11px",
          background: `
            repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px),
            linear-gradient(180deg, rgb(var(--c-154476,21,68,118)) 0%, rgb(var(--c-0b2b55,11,43,85)) 55%, rgb(var(--c-071c3b,7,28,59)) 100%)`,
          border: "1px solid rgba(var(--c-78dcff,120,220,255),.35)",
          borderTop: "none",
          boxShadow: `inset 0 -1px 0 rgba(${ICE},.25), inset 0 2px 4px rgba(0,0,0,.45), 0 6px 14px rgba(0,0,0,.5)`,
          ...intro("introDown", T.menu, 0.6, "back"),
        }}
      >
        {/* braket vidaları */}
        {[9, BTN_W - 9].map((x) => (
          <span
            key={x}
            aria-hidden
            className="absolute block rounded-full"
            style={{
              left: x - 4,
              top: BTN_H / 2 - 4,
              width: 8,
              height: 8,
              background:
                "radial-gradient(circle at 35% 30%, rgba(var(--c-cfe6ff,207,230,255),.95), rgba(var(--c-46beff,70,190,255),.5) 45%, rgba(var(--c-061f3a,6,31,58),1) 100%)",
              boxShadow: "0 1px 1px rgba(0,0,0,.6)",
            }}
          >
            <span
              className="absolute top-1/2 left-1/2 block h-[1.2px] w-[70%] -translate-x-1/2 -translate-y-1/2 rotate-45"
              style={{ background: "rgba(var(--c-061f3a,6,31,58),.95)" }}
            />
          </span>
        ))}
        {/* küçük işlemci soketi */}
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 rounded-[4px]"
          style={{
            top: (BTN_H - SOCK) / 2 - 1,
            width: SOCK,
            height: SOCK,
            background: `radial-gradient(circle, ${powered ? "#f0cd78" : "#9c8550"} 0.8px, transparent 1.2px) 0 0 / 3.6px 3.6px, rgb(var(--c-0a1a2c,10,26,44))`,
            boxShadow:
              "inset 0 0 0 1.5px rgba(var(--c-2b4c72,43,76,114),1), inset 0 2px 3px rgba(0,0,0,.6)",
          }}
        >
          {/* ortadaki yuva + menü çizgileri */}
          <span
            className="absolute flex flex-col justify-center gap-0.5 rounded-[2px] px-0.75"
            style={{
              inset: 5,
              background: "rgb(var(--c-0b2b55,11,43,85))",
              boxShadow: powered
                ? "0 0 7px rgba(var(--c-6ef5e8,110,245,232),.65)"
                : "inset 0 1px 2px rgba(0,0,0,.6)",
              transition: "box-shadow 400ms",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="mm-line block h-[1.6px] rounded-full"
                style={{
                  background: powered
                    ? "rgb(var(--c-a8eef6,168,238,246))"
                    : "rgba(var(--c-a8eef6,168,238,246),.4)",
                  boxShadow: powered ? `0 0 4px rgba(${EDGE},.95)` : "none",
                  transition: `background 300ms ${150 + i * 90}ms, box-shadow 300ms ${150 + i * 90}ms`,
                }}
              />
            ))}
          </span>
        </span>
        {/* durum LED'i */}
        <span
          aria-hidden
          className="absolute block rounded-full"
          style={{
            left: BTN_W / 2 - 2,
            bottom: 3,
            width: 4,
            height: 2,
            background: powered ? "#5df2a6" : "rgba(93,242,166,.3)",
            boxShadow: powered ? "0 0 5px #5df2a6" : "none",
          }}
        />
      </button>

      {/* ---------- ÇEKMECE (mobil sayfa) ----------
          Tepede YATAY konnektör: pinleri yanar, ışığı AŞAĞI, menü
          butonlarının üstüne düşer. Butonlar tam genişlikte alt alta,
          en altta sosyal bağlantılar. */}
      {open &&
        createPortal(
        <div
          className="mm-drawer fixed inset-0"
          /* sayfanın EN ÜSTÜNDE: hero'daki spot ışıkları ve avatar
             (kendi katmanlarında) menünün üzerine çıkmasın */
          style={{ zIndex: 100000 }}
          role="dialog"
          aria-modal="true"
          aria-label="Menü"
        >
          <div
            className="absolute inset-0 bg-[rgba(var(--c-010612,1,6,18),.35)]"
            style={{
              animation: closing
                ? `mmFadeOut ${CLOSE_MS}ms ease-in both`
                : "mmFade 420ms ease-out both",
            }}
            onClick={close}
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
              transformOrigin: "0 0",
              animation: closing
                ? `mmClose ${CLOSE_MS}ms cubic-bezier(.55,0,.75,.2) both`
                : "mmOpen 620ms cubic-bezier(.22,1,.36,1) both",
            }}
          >
            {/* üst şerit: başlık + kapat */}
            <div className="relative flex h-14.5 shrink-0 items-center justify-between px-5">
              <span aria-hidden />
              <button
                type="button"
                aria-label="Menüyü kapat"
                onClick={close}
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
                <GlowConnector lit={lit && !closing} />
              </div>
            </div>

            {/* MENÜ */}
            <nav className="relative z-1 mt-6 flex flex-col gap-3 px-4">
              {ITEMS.map((item, i) => (
                <div
                  key={item.key}
                  style={{
                    animation: closing
                      ? `mmItemOut 180ms ease-in ${(ITEMS.length - 1 - i) * 30}ms both`
                      : `mmItem 640ms cubic-bezier(.22,1,.36,1) ${300 + i * 90}ms both`,
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
                      close();
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
            {/* açılırken kenardan inen ışık süpürmesi */}
            {!closing && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-full"
                style={{
                  background: `linear-gradient(180deg, transparent, rgba(${EDGE},.18) 45%, rgba(${ICE},.25) 50%, transparent 56%)`,
                  animation: "mmSweep 900ms cubic-bezier(.4,0,.2,1) 120ms both",
                }}
              />
            )}
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
