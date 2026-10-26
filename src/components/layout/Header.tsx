"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FaHome, FaPalette, FaFolderOpen, FaFileAlt } from "react-icons/fa";
import MenuSlot from "@/components/ui/MenuSlot";
import GlowConnector, { CONNECTOR_HEIGHT } from "@/components/ui/GlowConnector";
import { intro, T } from "@/components/ui/Intro";
import { useLang } from "@/i18n/lang";

/* Konnektör sütunu: 2 × konnektör boyu + 8px boşluk. Menü bu yüksekliğe
   yayılır; MENU_INSET_Y kadar üstten ve alttan içeride durur */
const CONNECTOR_H = CONNECTOR_HEIGHT;
const CONNECTOR_GAP = 8;
const COLUMN_H = CONNECTOR_H * 2 + CONNECTOR_GAP;

/* Menü butonları biraz daha büyük ölçekte ve daha uzun çizilir; böylece
   üst/alt hizası konnektörlerle aynı kalırken aradaki boşluk azalır.
   Boşluk (görünen px) = (COLUMN_H − 4 × BUTTON_H × MENU_SCALE) / 3 */
const MENU_SCALE = 0.85;
const MENU_W = 340; // MenuSlot min genişliği
/** Menünün üstten ve alttan içeri çekilme payı (görünen px):
 *  ilk buton konnektörün üst ucundan, son buton alt ucundan bu kadar içeride */
const MENU_INSET_Y = 16;
const BUTTON_H = 68; // ölçeklenmeden önceki buton yüksekliği (daha ince, zarif butonlar)

/* href: menüden tıklanınca gidilecek sayfa (null = şimdilik boş) */
const menuItems = [
  { key: "home", label: "HOME", icon: FaHome, href: "/home" },
  { key: "skills", label: "SKILLS", icon: FaPalette, href: "/roadmap" },
  { key: "projects", label: "PROJECTS", icon: FaFolderOpen, href: "/projects" },
  { key: "documents", label: "DOCUMENTS", icon: FaFileAlt, href: "/documents" },
] as const;

type HeaderProps = {
  powered?: boolean;
  /** Giriş animasyonunu oynat */
  animateIn?: boolean;
  /** Aktif sayfanın key'i (örn. "home"). Verilmezse tıklamayla değişir. */
  activeKey?: string;
  onNavigate?: (key: string) => void;
  /** Mobil: konnektörsüz, 2×2 ızgara halinde alçak butonlar */
  compact?: boolean;
  /** compact modda buton yüksekliği (px) */
  buttonHeight?: number;
};

export default function Header({
  powered = false,
  animateIn = true,
  activeKey,
  onNavigate,
  compact = false,
  buttonHeight = 46,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();

  /* menüdeki sayfaları arka planda önceden indir: tıklayınca sayfa
     hazır olsun, bekleme olmasın */
  useEffect(() => {
    menuItems.forEach((m) => {
      if (m.href) router.prefetch(m.href);
    });
  }, [router]);
  const fromPath =
    menuItems.find((m) => m.href && pathname?.startsWith(m.href))?.key ??
    "home";
  const [localActive, setLocalActive] = useState<string>(fromPath);
  const current = activeKey ?? localActive;

  const go = (item: (typeof menuItems)[number]) => {
    if (!item.href) return; // adresi olmayan buton (şu an yok)
    setLocalActive(item.key);
    onNavigate?.(item.key);
    if (item.href !== pathname) router.push(item.href);
  };

  /* ---- MOBİL: 2×2 ızgara ---- */
  if (compact)
    return (
      <nav className="grid w-full grid-cols-2 gap-x-4 gap-y-3">
        {menuItems.map((item, idx) => (
          <div
            key={item.key}
            style={
              animateIn
                ? intro("introUp", T.menu + idx * T.menuStagger, 0.7)
                : undefined
            }
          >
            <MenuSlot
              compact
              label={t(`nav.${item.key}`)}
              icon={item.icon}
              active={current === item.key}
              litFromLeft={powered}
              height={buttonHeight}
              onClick={() => go(item)}
            />
          </div>
        ))}
      </nav>
    );

  return (
    <div
      className="relative flex items-start gap-2"
      style={{ height: COLUMN_H }}
    >
      {/* Sol: iki konnektör, alt alta */}
      <div
        className="flex flex-col"
        style={{
          gap: CONNECTOR_GAP,
          height: COLUMN_H,
          ...(animateIn ? intro("introLeft", T.connectors, 0.9) : {}),
        }}
      >
        <GlowConnector lit={powered} />
        <GlowConnector lit={powered} />
      </div>

      {/* Sağ: menü — ölçeklenmiş hali konnektör sütunuyla birebir aynı boyda.
          Dış kutu görünen (ölçekli) boyutu tutar, iç nav ölçeklenmeden önce
          COLUMN_H / MENU_SCALE yüksekliğinde ve butonlar uçlara yaslı. */}
      <div
        className="relative"
        style={{ width: MENU_W * MENU_SCALE, height: COLUMN_H }}
      >
        <nav
          className="absolute left-0 top-0 flex flex-col justify-between origin-top-left"
          style={{
            width: MENU_W,
            height: COLUMN_H / MENU_SCALE,
            paddingTop: MENU_INSET_Y / MENU_SCALE,
            paddingBottom: MENU_INSET_Y / MENU_SCALE,
            boxSizing: "border-box",
            transform: `scale(${MENU_SCALE})`,
          }}
        >
          {menuItems.map((item, idx) => (
            <div
              key={item.key}
              style={
                animateIn
                  ? intro("introLeft", T.menu + idx * T.menuStagger, 0.8)
                  : undefined
              }
            >
              <MenuSlot
                label={t(`nav.${item.key}`)}
                icon={item.icon}
                active={current === item.key}
                litFromLeft={powered}
                height={BUTTON_H}
                onClick={() => {
                  if (!item.href) return; // adresi olmayan buton (şu an yok)
                  setLocalActive(item.key);
                  onNavigate?.(item.key);
                  /* sayfaya git — orada animasyon oynamaz, bitmiş hali görünür
                   (HOME → /home: Hero'nun bitmiş hali) */
                  if (item.href !== pathname) router.push(item.href);
                }}
              />
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
