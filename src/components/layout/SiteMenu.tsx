"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FaHome, FaPalette, FaFolderOpen, FaFileAlt } from "react-icons/fa";
import MobileMenu, {
  MENU_BTN_H,
  MENU_BTN_W,
  type MenuKey,
} from "@/components/layout/MobileMenu";

/* =========================================================
   SAYFA MENÜSÜ — hero dışındaki her sayfada (roadmap, projeler,
   footer, belgeler). Geniş ekranda üst ortada (fiş soketinin altında),
   telefonda sol üstte.
   - Geniş ekran (fareli bilgisayar): küçük yuvarlak soket düğmeler
     (ikon; üstüne gelince adı görünür) — mobil düğme DEĞİL.
   - Telefon / tablet: sol üstteki gibi açılan çekmeceli mobil menü.
========================================================= */

const ITEMS = [
  { key: "home", label: "HOME", icon: FaHome, href: "/home" },
  { key: "skills", label: "SKILLS", icon: FaPalette, href: "/roadmap" },
  { key: "projects", label: "PROJECTS", icon: FaFolderOpen, href: "/projects" },
  { key: "documents", label: "DOCUMENTS", icon: FaFileAlt, href: "/documents" },
] as const;

const WIDE_QUERY = "(min-width: 1024px) and (hover: hover)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const readWide = () => window.matchMedia(WIDE_QUERY).matches;

type Props = {
  /** şu an ekrandaki bölüm (aktif buton); null: hiçbiri (footer) */
  current?: MenuKey | null;
  /** sayfa içinde gezinme: true dönerse adres değişmez */
  onNavigate?: (key: MenuKey) => boolean;
};

export default function SiteMenu({ current, onNavigate }: Props) {
  const wide = useSyncExternalStore(subscribe, readWide, () => false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    ITEMS.forEach((m) => router.prefetch(m.href));
  }, [router]);

  const active =
    current !== undefined
      ? current
      : (ITEMS.find((m) => pathname?.startsWith(m.href))?.key ?? "home");

  if (!wide)
    return (
      <div
        className="fixed z-90"
        style={{
          /* telefonda SOL üstte: cam panelin üst kenarına vidalı braket
             (üst ortadaki güç soketinin braketi gibi) */
          top: "1.5%",
          left: "calc(1% + 18px)",
          width: MENU_BTN_W,
          height: MENU_BTN_H,
        }}
      >
        <MobileMenu powered style={{ left: 0, top: 0 }} onNavigate={onNavigate} />
      </div>
    );

  /* GENİŞ EKRAN: sitenin port / soket diliyle küçük yuvarlak düğmeler
     (yalnızca ikon). Üstüne gelince adı alttan belirir, bulunduğun
     bölüm turkuaz yanar. */
  return (
    <nav
      aria-label="Menü"
      className="fixed z-90 flex items-center gap-1.5 rounded-full px-2 py-1.5"
      style={{
        /* ORTADA: üst ortadaki fiş soketinin hemen altında, ona kısa bir
           kabloyla bağlı */
        top: "calc(1.5% + 40px)",
        left: "50%",
        transform: "translateX(-50%)",
        background:
          "linear-gradient(180deg, rgb(var(--c-0b2a4a,11,42,74)), rgb(var(--c-04142a,4,20,42)))",
        border: "1px solid rgba(var(--c-78dcff,120,220,255),.3)",
        boxShadow:
          "inset 0 1px 0 rgba(var(--c-cfe6ff,207,230,255),.25), 0 8px 22px rgba(0,0,0,.45)",
      }}
    >
      <style>{`
        .sm-btn { transition: transform .2s ease, box-shadow .25s ease, color .25s ease; }
        .sm-btn:hover { transform: translateY(-1px); }
        .sm-tip { opacity: 0; transform: translate(-50%, -4px); transition: opacity .2s ease, transform .2s ease; }
        .sm-btn:hover .sm-tip, .sm-btn:focus-visible .sm-tip { opacity: 1; transform: translate(-50%, 0); }
      `}</style>
      {/* sokete bağlayan kısa kablo */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2"
        style={{
          width: 3,
          height: 12,
          borderRadius: 2,
          background:
            "linear-gradient(180deg, rgba(var(--c-78dcff,120,220,255),.15), rgba(var(--c-78dcff,120,220,255),.7))",
          boxShadow: "0 0 6px rgba(var(--c-78dcff,120,220,255),.5)",
        }}
      />
      {ITEMS.map((item) => {
        const on = active === item.key;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            aria-label={item.label}
            aria-current={on ? "page" : undefined}
            onClick={() => {
              if (onNavigate?.(item.key)) return;
              if (item.href !== pathname) router.push(item.href);
            }}
            className="sm-btn relative flex size-9 cursor-pointer items-center justify-center rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-a8eef6,168,238,246))]"
            style={{
              color: on
                ? "rgb(var(--c-04142a,4,20,42))"
                : "rgb(var(--c-a8eef6,168,238,246))",
              background: on
                ? "radial-gradient(circle at 40% 35%, rgb(var(--c-e1f8ff,225,248,255)), rgb(var(--c-a8eef6,168,238,246)) 70%)"
                : "radial-gradient(circle at 40% 35%, rgb(var(--c-154476,21,68,118)), rgb(var(--c-071c3b,7,28,59)) 75%)",
              border: "1px solid rgba(var(--c-78dcff,120,220,255),.45)",
              boxShadow: on
                ? "0 0 12px rgba(var(--c-a8eef6,168,238,246),.7)"
                : "inset 0 2px 3px rgba(0,0,0,.5)",
            }}
          >
            <Icon size={14} />
            <span
              aria-hidden
              className="sm-tip pointer-events-none absolute top-full left-1/2 mt-2 rounded-md px-2 py-1 font-mono text-[10px] tracking-[.18em] whitespace-nowrap"
              style={{
                color: "rgb(var(--c-a8eef6,168,238,246))",
                background: "rgba(3,11,26,.85)",
                border: "1px solid rgba(var(--c-78dcff,120,220,255),.3)",
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
