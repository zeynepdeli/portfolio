"use client";

import { useState } from "react";
import type { IconType } from "react-icons";
import {
  GLASS_EDGE,
  GLASS_EDGE_GOLD,
  glassShadow,
  glassSurface,
  THIN_GLASS,
  glassSpecular,
  UI_STYLE,
  metalSurface,
  metalShadow,
} from "./Glass";
import { POWER_LIGHT_MS, POWER_FADE_MS } from "./GlowConnector";

/* Palet — ROADMAP NEHRİNİN renkleri
   kenar rgb(var(--c-46beff,70,190,255)) (70,190,255) · buz rgb(var(--c-cfe6ff,207,230,255)) · su rgb(var(--c-0a2c52,10,44,82)) / rgb(var(--c-0e3b6b,14,59,107)) */
const PALETTE = {
  ice: {
    glow: "var(--c-46beff,70,190,255)",
    light: "var(--c-cfe6ff,207,230,255)",
  }, // nehir camgöbeği / buz beyazı
  gold: {
    glow: "var(--c-78d2ff,120,210,255)",
    light: "var(--c-ffffff,255,255,255)",
  }, // aktif: daha parlak nehir ışığı + beyaz yazı
};
const NAVY = "var(--c-0a2c52,10,44,82)"; // nehir suyu laciverti (rgb(var(--c-0a2c52,10,44,82)))
/** Konnektörlerden gelen ışığın rengi */
const RIVER_LIGHT = "var(--c-d7f0ff,215,240,255)"; // çok açık mavi / beyaza yakın
/** Etiket rengi — "Ocean of Art" posterindeki açık turkuaz */
const LABEL = "var(--c-a8eef6,168,238,246)";

type MenuSlotProps = {
  label: string;
  /** Sağdaki yuvarlak sokette görünen ikon */
  icon?: IconType;
  /** Aktif sayfa için kalıcı yanık görünüm */
  active?: boolean;
  /** Konnektörler yanınca soldan gelen ışıkla aydınlanır */
  litFromLeft?: boolean;
  /** Buton yüksekliği (px, ölçeklenmeden önce). Varsayılan 80 */
  height?: number;
  onClick?: () => void;
  /** Mobil: faderlar yok, alçak ve dar buton (2×2 ızgara için) */
  compact?: boolean;
  /** Işık YUKARIDAN vurur (mobil menüde tepedeki konnektör):
   *  ortası beyazımsı, kenarları lacivert */
  litFromTop?: boolean;
};

/** Etikete göre sabit, ama her butonda farklı fader konumları (%18–%78) */
function faderPositions(label: string): number[] {
  let h = 7;
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return [0, 1, 2].map((i) => 18 + ((h >>> (i * 6)) % 61));
}

/* =====================================================
   SOL: 3 DİKEY FADER (mikser sürgüsü gibi)
   Hover'da sürgüler kayar, aktifken parlar.
===================================================== */
function Faders({
  label,
  lit,
  hovered,
  active,
}: {
  label: string;
  lit: boolean;
  hovered: boolean;
  active: boolean;
}) {
  const positions = faderPositions(label);
  const { glow: ICE, light: ICE_LIGHT } = active ? PALETTE.gold : PALETTE.ice;

  return (
    <div className="flex h-9.5 gap-2 px-3.5">
      {positions.map((pos, i) => {
        const top = hovered ? 100 - pos : pos;
        return (
          <div key={i} className="relative h-full w-0.75 rounded-full">
            {/* Ray */}
            <span
              className="absolute inset-0 rounded-full transition-all duration-300"
              style={{
                background: `rgba(${ICE_LIGHT}, ${lit ? 0.75 : 0.45})`,
                boxShadow: lit
                  ? `0 0 8px rgba(${ICE_LIGHT},0.8), 0 0 14px rgba(${ICE},0.7)`
                  : `0 0 5px rgba(${ICE},0.45)`,
              }}
            />
            {/* Sürgü */}
            <span
              className="absolute left-1/2 h-2.25 w-1.75 -translate-x-1/2 -translate-y-1/2 rounded-xs"
              style={{
                top: `${top}%`,
                background: `rgb(${ICE_LIGHT})`,
                border: `1px solid rgba(${NAVY},0.9)`,
                boxShadow: `0 0 8px rgba(${ICE_LIGHT},0.9)`,
                transition: "top 500ms cubic-bezier(.4,1.4,.5,1)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function MenuSlot({
  label,
  icon: Icon,
  active = false,
  litFromLeft = false,
  height = 68,
  onClick,
  compact = false,
  litFromTop = false,
}: MenuSlotProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const lit = isPressed || active;
  const { glow: ICE, light: ICE_LIGHT } = active ? PALETTE.gold : PALETTE.ice;
  const EDGE = active ? GLASS_EDGE_GOLD : GLASS_EDGE;

  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsPressed(false);
        setIsHovered(false);
      }}
      className={`group relative flex w-full cursor-pointer items-stretch ${compact ? "min-w-0 rounded-[11px] p-1" : "min-w-85 rounded-[14px] p-1.5"} transition-all duration-500 ease-out outline-hidden select-none active:scale-98.5 focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-f4f8fd,244,248,253))]/60`}
      style={{
        height,
        /* Dış kasa — KALIN CAM: şeffaf gövde, altta renkli cam kalınlığı.
           Aktif sayfada kalınlık bandı altın. */
        ...(UI_STYLE === "metal"
          ? {
              /* CAM DEĞİL: opak fırçalanmış metal kasa */
              background: metalSurface(lit ? 6 : 0),
              border: `1px solid rgba(var(--c-78dcff,120,220,255),${lit ? 0.5 : 0.25})`,
              boxShadow: metalShadow({ lit }),
            }
          : {
              background: glassSurface(NAVY, 0.55),
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: `1px solid rgba(var(--c-ffffff,255,255,255),${lit ? 0.5 : 0.3})`,
              boxShadow:
                glassShadow({ depth: 6, edge: EDGE, glow: lit ? 0.55 : 0.3 }) +
                (lit && !THIN_GLASS ? `, 0 0 22px rgba(${ICE},0.45)` : ""),
            }),
        transition:
          "box-shadow 600ms cubic-bezier(.22,1,.36,1), border-color 600ms cubic-bezier(.22,1,.36,1)",
      }}
    >
      {/* Speküler parlama */}
      {UI_STYLE === "glass" && (
        <span
          style={glassSpecular({ w: 46, h: 5 }, { right: "12%", top: 4 })}
        />
      )}

      {/* SOLDAN GELEN KONNEKTÖR IŞIĞI — butonun sol kenarından içeri
          vurup sağa doğru sönen nehir mavisi aydınlatma */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          opacity: litFromLeft ? 1 : 0,
          transition: litFromLeft
            ? `opacity ${POWER_FADE_MS}ms ease ${POWER_LIGHT_MS}ms` /* konnektör ışığıyla aynı anda */
            : "opacity 300ms ease",
          background: `
            radial-gradient(ellipse 55% 120% at 0% 50%, rgba(${RIVER_LIGHT},0.38), transparent 70%),
            linear-gradient(90deg, rgba(${RIVER_LIGHT},0.22) 0%, rgba(${RIVER_LIGHT},0.06) 45%, transparent 75%)
          `,
          boxShadow: `inset 2px 0 0 rgba(${RIVER_LIGHT},0.65), inset 10px 0 18px -8px rgba(${RIVER_LIGHT},0.45)`,
          mixBlendMode: "screen",
        }}
      />

      {/* YUKARIDAN GELEN IŞIK — ortası beyaz, kenarlara doğru lacivert */}
      {litFromTop && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-1 rounded-[inherit]"
          style={{
            background: `
              radial-gradient(ellipse 42% 120% at 50% 0%, rgba(var(--c-ffffff,255,255,255),0.78) 0%, rgba(${RIVER_LIGHT},0.5) 30%, rgba(${RIVER_LIGHT},0.12) 60%, transparent 78%),
              linear-gradient(90deg, rgba(var(--c-04142e,4,20,46),0.95) 0%, rgba(${NAVY},0.55) 18%, rgba(${NAVY},0) 36%, rgba(${NAVY},0) 64%, rgba(${NAVY},0.55) 82%, rgba(var(--c-04142e,4,20,46),0.95) 100%)
            `,
            boxShadow: `inset 0 1px 0 rgba(var(--c-ffffff,255,255,255),0.75), inset 0 -10px 16px -10px rgba(${NAVY},0.9)`,
            mixBlendMode: "normal",
          }}
        />
      )}

      {/* Sol faderlar */}
      <div className="pointer-events-none relative flex items-center">
        {!compact && (
          <Faders label={label} lit={lit} hovered={isHovered} active={active} />
        )}
      </div>

      {/* Orta: iç cam panel + sağ kenarına oturan ikon soketi */}
      <div className={`relative flex-1 ${compact ? "min-w-0" : "min-w-55"}`}>
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-300 ${compact ? "rounded-lg pr-7 pl-2" : "rounded-[11px] pr-10 pl-6"}`}
          style={{
            /* --btn-inner (theme.tsx) tanımlıysa iç panel o yüzeyi kullanır */
            background: lit
              ? `var(--btn-inner-lit, linear-gradient(135deg, rgba(${ICE_LIGHT},0.16) 0%, rgba(${ICE},0.22) 50%, rgba(${NAVY},0.9) 100%))`
              : `var(--btn-inner, linear-gradient(135deg, rgba(${ICE},0.10) 0%, rgba(${NAVY},0.9) 55%, rgba(${ICE},0.06) 100%))`,
            border: `1px solid rgba(${ICE_LIGHT}, ${lit ? 0.45 : 0.22})`,
            boxShadow: `
              inset 0 1px 2px rgba(var(--c-ffffff,255,255,255),0.18),
              inset 0 -1px 3px rgba(var(--c-000000,0,0,0),0.5)
            `,
          }}
        >
          {/* Tıklama anı ışık çakması */}
          {isPressed && (
            <div
              className="pointer-events-none absolute inset-0 animate-pulse"
              style={{
                background: `radial-gradient(circle, rgba(var(--c-ffffff,255,255,255),0.3) 0%, rgba(${ICE_LIGHT},0.15) 50%, transparent 80%)`,
              }}
            />
          )}

          {/* Hover'da süzülen ışık */}
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: `linear-gradient(90deg, transparent 0%, rgba(${ICE_LIGHT},0.12) 50%, transparent 100%)`,
            }}
          />

          {/* Etiket */}
          <span
            className={`relative z-2 font-mono font-bold whitespace-nowrap transition-all duration-200 ${compact ? (height >= 56 ? "text-base tracking-[0.14em]" : "text-[13px] tracking-[0.12em]") : "text-xl tracking-[0.16em]"}`}
            style={{
              color:
                isPressed && !active
                  ? "rgb(var(--btn-label,var(--c-e1f8ff,225,248,255)))"
                  : `rgb(var(--btn-label,${LABEL}))`,
              transform: isPressed ? "scale(0.97)" : "scale(1)",
              textShadow: lit
                ? `var(--btn-label-glow-lit, 0 0 10px rgba(${LABEL},0.85), 0 0 20px rgba(var(--c-4fd8ff,79,216,255),0.7), 0 0 30px rgba(var(--c-4fd8ff,79,216,255),0.6))`
                : `var(--btn-label-glow, 0 0 6px rgba(${LABEL},0.6), 0 0 14px rgba(var(--c-4fd8ff,79,216,255),0.55))`,
            }}
          >
            {label}
          </span>
        </div>

        {/* İkon soketi — panelin sağ kenarının üstüne yarı yarıya biner */}
        <div
          className={`pointer-events-none absolute top-1/2 z-2 flex -translate-y-1/2 items-center justify-center rounded-full transition-all duration-300 ${compact ? "size-6" : "size-7"}`}
          style={{
            right: compact ? "-12px" : "-14px",
            background: `radial-gradient(circle at 35% 30%, rgba(${ICE},0.45), rgba(${NAVY},0.95) 75%)`,
            border: `1px solid rgba(${ICE_LIGHT}, ${lit ? 0.85 : 0.45})`,
            boxShadow: lit
              ? `0 0 12px rgba(${ICE_LIGHT},0.7), inset 0 0 6px rgba(${ICE_LIGHT},0.4)`
              : `0 0 6px rgba(${ICE},0.4), inset 0 1px 1px rgba(var(--c-ffffff,255,255,255),0.25)`,
          }}
        >
          {Icon && (
            <Icon
              className="size-3.5"
              style={{
                color: `rgb(${ICE_LIGHT})`,
                filter: `drop-shadow(0 0 4px rgba(${ICE_LIGHT},0.8))`,
              }}
            />
          )}
        </div>
      </div>

      {/* Soketin taşması için sağda boşluk */}
      <div className={compact ? "w-3 shrink-0" : "w-5 shrink-0"} />
    </button>
  );
}
