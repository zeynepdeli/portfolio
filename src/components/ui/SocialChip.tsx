"use client";

import { useState } from "react";
import { linkProps } from "@/components/ui/SocialLinks";
import type { IconType } from "react-icons";
import {
  GLASS_EDGE,
  glassShadow,
  glassSurface,
  glassSpecular,
  UI_STYLE,
  metalSurface,
  metalShadow,
} from "./Glass";
import { intro } from "./Intro";

type SocialChipProps = {
  icon: IconType;
  href: string;
  label: string;
  /** Giriş animasyonu gecikmesi (sn). Verilmezse animasyon yok. */
  introDelay?: number;
  /** Avatarla senkron giriş: false iken görünmez (yeri ayrılır),
   *  true olunca aşağıdan "pop" ile çıkar. Verilmezse introDelay geçerli. */
  shown?: boolean;
};

/* Üst/alt pin sırası — çip pinleri ve akım çizgileriyle aynı
   altın/bakır tonda ince bacaklar */
const PIN_INDEXES = Array.from({ length: 9 }, (_, i) => i);

/* Renkler header menüsüyle (MenuSlot) aynı değişkenlerden — tasarım aynı,
   yalnızca tonlar menüyle eşleşir */
const ICE = "var(--c-46beff,70,190,255)"; // menü iç paneli ışığı
const NAVY = "var(--c-0a2c52,10,44,82)"; // menü gövde suyu
const LABEL = "var(--c-a8eef6,168,238,246)"; // menü etiket rengi

function PinRow() {
  return (
    <div className="relative flex h-2.25 items-end justify-center gap-0.75">
      {PIN_INDEXES.map((i) => (
        <span
          key={i}
          className="block h-1.75 w-0.5 rounded-[0.5px]"
          style={{
            /* gerçekçi bakır bacak: uç lehimli, gövdeye doğru gölgede */
            background:
              "linear-gradient(to right, rgb(var(--c-6b3a1f,107,58,31)), rgb(var(--c-e2a679,226,166,121)) 45%, rgb(var(--c-b87333,184,115,51)) 60%, rgb(var(--c-5a2f18,90,47,24))), linear-gradient(to bottom, rgb(var(--c-ffffff,255,255,255)) 0%, rgb(var(--c-dddddd,221,221,221)) 30%, rgb(var(--c-555555,85,85,85)) 100%)",
            backgroundBlendMode: "multiply",
          }}
        />
      ))}
    </div>
  );
}

export default function SocialChip({
  icon: Icon,
  href,
  label,
  introDelay,
  shown,
}: SocialChipProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      {...linkProps(href)}
      aria-label={label}
      style={
        shown === false
          ? { opacity: 0, pointerEvents: "none" }
          : shown === true
            ? intro("introPop", 0, 0.32, "back")
            : introDelay !== undefined
              ? intro("introPop", introDelay, 0.7, "back")
              : undefined
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group inline-flex flex-col items-center rounded-xl transition-transform duration-300 select-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-f4f8fd,244,248,253))]/60 focus-visible:outline-hidden"
    >
      {/* TOP CONNECTORS */}
      <PinRow />

      {/* ==================================================
          DIŞ GÖVDE — KALIN CAM
          Şeffaf lacivert yüzey, altta/sağda camgöbeği cam kalınlığı,
          parlak üst kenar ve speküler parlama (glass.ts)
      ================================================== */}
      {/* data-avatar-hop: avatar bu cam gövdeye basarak geçer.
          data-part: palet bu parçaya özel renk verebilir (theme.tsx) */}
      <div
        data-avatar-hop
        data-part="social"
        className="relative size-19.5 rounded-xl"
        style={{
          ...(UI_STYLE === "metal"
            ? {
                /* CAM DEĞİL: opak fırçalanmış metal */
                background: metalSurface(hovered ? 6 : 0),
                border: `1px solid rgba(var(--c-78dcff,120,220,255),${hovered ? 0.6 : 0.35})`,
                boxShadow: metalShadow({ lit: hovered }),
              }
            : {
                background: glassSurface(NAVY, 0.55),
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: `1px solid rgba(var(--c-ffffff,255,255,255),${hovered ? 0.5 : 0.3})`,
                boxShadow: glassShadow({
                  depth: 5,
                  glow: hovered ? 0.6 : 0.3,
                  drop: true,
                }),
              }),
          transition: "box-shadow 300ms, border-color 300ms",
        }}
      >
        {/* Speküler parlama */}
        {UI_STYLE === "glass" && (
          <span
            style={glassSpecular({ w: 22, h: 3.5 }, { right: 9, top: 3 })}
          />
        )}

        {/* ==================================================
            İÇ CAM BUTON — dış camın içine hafifçe gömülü
        ================================================== */}
        <div
          className="absolute top-1.75 left-1.75 size-15.5 overflow-hidden rounded-[9px]"
          style={{
            background:
              UI_STYLE === "metal"
                ? "var(--social-well, radial-gradient(circle at 50% 40%, rgb(var(--c-0b2250,11,34,80)) 0%, rgb(var(--c-051333,5,19,51)) 70%, rgb(var(--c-030b22,3,11,34)) 100%))"
                : `
              linear-gradient(180deg,
                rgba(var(--c-ffffff,255,255,255),0.10) 0%,
                rgba(var(--c-ffffff,255,255,255),0.02) 45%,
                rgba(${GLASS_EDGE},0.10) 100%),
              rgba(${NAVY},0.45)
            `,
            border:
              UI_STYLE === "metal"
                ? "1px solid rgba(var(--c-000000,0,0,0),var(--social-well-line,0.55))"
                : "1px solid rgba(var(--c-ffffff,255,255,255),0.18)",
            boxShadow: `
              inset 0 2px 5px rgba(var(--c-000000,0,0,0),var(--social-well-shade,0.45)),
              inset 0 -1px 0 rgba(var(--c-ffffff,255,255,255),0.08) /* ince cam: alttan renkli parlama yok */
            `,
            transition: "box-shadow 300ms",
          }}
        >
          {/* Merkezden yayılan ışık */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: hovered ? 1 : 0.7,
              background: `radial-gradient(ellipse at 50% 50%,
                rgba(${ICE},0.28) 0%,
                rgba(${ICE},0.1) 40%,
                transparent 72%)`,
            }}
          />

          {/* ICON */}
          <div
            data-build-icon
            className="relative z-10 flex size-full items-center justify-center"
          >
            <Icon
              size={30}
              style={{
                color: `rgba(var(--social-icon,${LABEL}),.97)`,
                filter: `var(--social-icon-fx,
                  drop-shadow(0 0 2px rgba(${LABEL},.95))
                  drop-shadow(0 0 6px rgba(var(--c-4fd8ff,79,216,255),.75))
                  drop-shadow(0 0 12px rgba(var(--c-4fd8ff,79,216,255),.35)))`,
              }}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM CONNECTORS — cam kalınlığı bandının altına yer açılır */}
      <div className="mt-1.25 rotate-180">
        <PinRow />
      </div>
    </a>
  );
}
