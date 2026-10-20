"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FaHome, FaPalette, FaFolderOpen, FaFileAlt } from "react-icons/fa";
import MenuSlot from "@/components/ui/MenuSlot";
import MobileMenu, { type MenuKey } from "@/components/layout/MobileMenu";

/* =========================================================
   SAYFA MENÜSÜ — hero dışındaki her sayfada (roadmap, projeler,
   footer, belgeler) sağ üstte.
   - Geniş ekran (fareli bilgisayar): hero'daki menünün butonları,
     yan yana ve küçük — mobil düğme DEĞİL.
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
          top: "calc(1.5% + 12px)",
          right: "calc(1% + 12px)",
          width: 58,
          height: 50,
        }}
      >
        <MobileMenu powered style={{ left: 0, top: 0 }} onNavigate={onNavigate} />
      </div>
    );

  return (
    <nav
      aria-label="Menü"
      className="fixed z-90 flex gap-2"
      style={{
        /* üst ortadaki fiş soketinin ALTINDA, sağ köşede */
        top: "calc(1.5% + 44px)",
        right: "calc(1% + 22px)",
      }}
    >
      {ITEMS.map((item) => (
        <div key={item.key} style={{ width: "clamp(108px, 10vw, 146px)" }}>
          <MenuSlot
            compact
            label={item.label}
            icon={item.icon}
            active={active === item.key}
            litFromTop
            height={40}
            onClick={() => {
              if (onNavigate?.(item.key)) return;
              if (item.href !== pathname) router.push(item.href);
            }}
          />
        </div>
      ))}
    </nav>
  );
}
