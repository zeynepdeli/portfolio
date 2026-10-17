"use client";

import { Fragment, type CSSProperties } from "react";

import {
  CHIP,
  chipLead,
  chipThick,
  pinSpan,
  PIN_W,
  PIN_GAP,
  PIN_LEN,
} from "./ChipLayout";

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

type ChipPlatformProps = {
  powered?: boolean;
  size?: number;
  tilt?: number;
  spin?: number;
  turn?: number;
  photo?: string;
  photoPosition?: string;
  photoZoom?: number;
  /** "noir": fotoğraf siyah-lacivert tonlu, kenarından altın ışık vurur
   *  (referanstaki siyah silüet etkisi). "natural": renkli */
  photoTone?: "natural" | "noir";
  /** Fotoğrafı ekranda kaydır (plaka boyuna oran): çipin taşan kısmı
   *  ekran dışında kalıyorsa yüzü görünür tarafa almak için */
  photoShift?: { x: number; y: number };
  assembleDelay?: number;
  hollow?: boolean;
};

type Side = "top" | "right" | "bottom" | "left";

/* Palet — ROADMAP NEHRİNİN renkleri (RoadmapSection: rm-water / C.edge / C.ice)
   kenar: 70,190,255   buz: 207,230,255   çelik: 91,143,201 */

const RIVER_EDGE = "var(--c-46beff,70,190,255)"; // nehrin camgöbeği kenar ışığı
const ICE = RIVER_EDGE; // çip kenar parlaması
const ICE_LIGHT = "var(--c-cfe6ff,207,230,255)"; // buz beyazı yansıma
const FRAME = "var(--c-0b3058,11,48,88)"; // iç çerçeve
const GOLD = "var(--c-a9cdf5,169,205,245)"; // pinler: açık buz mavisi

const { innerZ } = CHIP;

/* Çip panelin içine gömülü değil, üstünde kabarık durur: altına gölge düşer.
   Gövde düz (cam değil): mat, opak koyu lacivert yüzey. */

/* =========================================================
   BAKIR PİNLER — SocialChip'teki pinlerin BİREBİR aynısı
   Aynı eleman (span), aynı ölçü (2px × 7px, 3px boşluk), aynı renk
   geçişi ve köşe yuvarlaklığı. Çipin her kenarı boyunca dizilir.
   Pinin gövde kalınlığından aşağı inen kısmı (etek) aynı adımla çizilir.
   Hiçbir animasyon yok → GPU'yu yormaz.
========================================================= */

/** SocialChip PinRow ile aynı bakır renkleri */
const PIN_ACROSS = (dir: string) =>
  `linear-gradient(${dir}, rgb(var(--c-6b3a1f,107,58,31)), rgb(var(--c-e2a679,226,166,121)) 45%, rgb(var(--c-b87333,184,115,51)) 60%, rgb(var(--c-5a2f18,90,47,24)))`;
const PIN_ALONG = (toBody: string) =>
  `linear-gradient(${toBody}, rgb(var(--c-ffffff,255,255,255)) 0%, rgb(var(--c-dddddd,221,221,221)) 30%, rgb(var(--c-555555,85,85,85)) 100%)`;

const TO_BODY: Record<Side, string> = {
  top: "to bottom",
  bottom: "to top",
  left: "to right",
  right: "to left",
};

const horizontal = (side: Side) => side === "top" || side === "bottom";

const SIDES: Side[] = ["top", "right", "bottom", "left"];

/** Pin sırasının kenardaki yeri (plakaya göre %) */
function spanEdges() {
  const { from, to } = pinSpan();
  return {
    a: `${(from * 100).toFixed(3)}%`,
    b: `${((1 - to) * 100).toFixed(3)}%`,
  };
}

/** Bir kenardaki pin sırası — sosyal PinRow'un aynısı, kenar boyunca */
function PinRow({
  side,
  plate,
  thick,
  powered,
}: {
  side: Side;
  plate: number;
  thick: number;
  powered: boolean;
}) {
  const { from, to } = pinSpan();
  const len = plate * (to - from);
  const count = Math.max(1, Math.floor((len + PIN_GAP) / (PIN_W + PIN_GAP)));
  const { a, b } = spanEdges();
  const h = horizontal(side);
  const box: CSSProperties = {
    top: h ? { left: a, right: b, bottom: "100%", height: PIN_LEN } : {},
    bottom: h ? { left: a, right: b, top: "100%", height: PIN_LEN } : {},
    left: !h ? { top: a, bottom: b, right: "100%", width: PIN_LEN } : {},
    right: !h ? { top: a, bottom: b, left: "100%", width: PIN_LEN } : {},
  }[side];

  return (
    <div
      data-chip-pins
      style={{
        position: "absolute",
        display: "flex",
        ...box,
        flexDirection: h ? "row" : "column",
        gap: PIN_GAP,
        transform: `translateZ(${-thick}px)`,
        filter: powered
          ? "brightness(1.08) saturate(1.05)"
          : "brightness(.82) saturate(.85)",
        transition: "filter 700ms",
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        /* span DEĞİL div: sayfanın açılış (build) CSS'i span'leri
           gizleyebiliyor — pinler her durumda görünsün */
        <div
          key={i}
          style={{
            display: "block",
            flexShrink: 0,
            width: h ? PIN_W : PIN_LEN,
            height: h ? PIN_LEN : PIN_W,
            borderRadius: 0.5,
            background: `${PIN_ACROSS(h ? "to right" : "to bottom")}, ${PIN_ALONG(TO_BODY[side])}`,
            backgroundBlendMode: "multiply",
          }}
        />
      ))}
    </div>
  );
}

/** Pinin çip kalınlığı boyunca inen kısmı (etek) — aynı 2px/5px adım */
function skirtStyle(side: Side, thick: number): CSSProperties {
  const { a, b } = spanEdges();
  const across = horizontal(side) ? "90deg" : "180deg";
  const pitch = PIN_W + PIN_GAP;
  const mask = `repeating-linear-gradient(${across}, #000 0 ${PIN_W}px, transparent ${PIN_W}px ${pitch}px)`;
  const look: CSSProperties = {
    backgroundImage: `linear-gradient(${TO_BODY[side]}, rgb(var(--c-777777,119,119,119)) 0%, rgb(var(--c-444444,68,68,68)) 100%), repeating-linear-gradient(${across}, rgb(var(--c-6b3a1f,107,58,31)) 0, rgb(var(--c-e2a679,226,166,121)) ${PIN_W * 0.45}px, rgb(var(--c-b87333,184,115,51)) ${PIN_W * 0.6}px, rgb(var(--c-5a2f18,90,47,24)) ${PIN_W}px, transparent ${PIN_W}px ${pitch}px)`,
    backgroundBlendMode: "multiply",
    WebkitMaskImage: mask,
    maskImage: mask,
  };
  const geo: CSSProperties = {
    top: {
      left: a,
      right: b,
      bottom: "100%",
      height: thick,
      transformOrigin: "bottom",
      transform: "rotateX(90deg)",
    },
    bottom: {
      left: a,
      right: b,
      top: "100%",
      height: thick,
      transformOrigin: "top",
      transform: "rotateX(-90deg)",
    },
    left: {
      top: a,
      bottom: b,
      right: "100%",
      width: thick,
      transformOrigin: "right",
      transform: "rotateY(-90deg)",
    },
    right: {
      top: a,
      bottom: b,
      left: "100%",
      width: thick,
      transformOrigin: "left",
      transform: "rotateY(90deg)",
    },
  }[side];
  return { ...geo, ...look };
}

/* Fotoğraf yokken görünen köşe vidaları */
const CORNER_SCREWS: CSSProperties[] = [
  { left: "5%", top: "5%" },
  { right: "5%", top: "5%" },
  { left: "5%", bottom: "5%" },
  { right: "5%", bottom: "5%" },
];

const slabBackground = (photo: boolean, i: number, last: boolean) => {
  if (photo) {
    /* taban kenarı: katmanlı kart */
    return last ? "rgb(10,13,24)" : i % 2 ? "rgb(18,23,40)" : "rgb(24,30,50)";
  }

  return last
    ? "rgb(var(--c-04162e,4,22,46))"
    : i % 2
      ? "rgb(var(--c-072444,7,36,68))"
      : "rgb(var(--c-0a2c52,10,44,82))";
};

export default function ChipPlatform({
  powered = false,
  size = 640,
  tilt = 0,
  spin = -8,
  turn = 0,
  photo,
  photoPosition = "50% 22%",
  photoZoom = 1,
  photoTone = "natural",
  photoShift = { x: 0, y: 0 },
  assembleDelay = 0.6,
  hollow = false,
}: ChipPlatformProps) {
  const plate = size * CHIP.plateRatio;
  const ringR = plate * CHIP.ringRatio;
  /* çip boyutuna ORANLI pin ve kalınlık (ekran küçülünce birlikte küçülür) */
  const lead = chipLead(size);
  const thick = chipThick(size);
  /* Taban kenarındaki katmanlar (2px'lik) */
  const SLAB_COUNT = thick / 2;

  /* Kabarık çipin gölgesi: ekranda aşağı kayar */
  const shadowAngle = ((45 + spin) * Math.PI) / 180;
  const shadowDist = 26; // px
  const shadowDx = shadowDist * Math.sin(shadowAngle);
  const shadowDy = shadowDist * Math.cos(shadowAngle);

  const holeMask = hollow
    ? `radial-gradient(circle at center, transparent ${ringR}px, #000 ${ringR + 1}px)`
    : undefined;

  return (
    <div
      className="pointer-events-none"
      style={{
        position: "relative",
        width: size,
        height: size * 0.9,
        perspective: `${CHIP.perspective}px`,
      }}
    >
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: plate,
          height: plate,
          transform: `translate(-50%, -50%) rotateY(${turn}deg) rotateZ(${spin}deg) rotateX(${tilt}deg) rotateZ(45deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {SIDES.map((s) => (
          <Fragment key={`lead-${s}`}>
            <PinRow side={s} plate={plate} thick={thick} powered={powered} />
            <div className="absolute" style={skirtStyle(s, thick)} />
          </Fragment>
        ))}

        {/* GÖVDE — ortadaki delik maskesi YALNIZCA burada. Pinler bu
            kutunun dışına taştığı için maskenin dışında kalmalı; maske
            tüm kaba uygulanınca pinler tamamen siliniyordu. */}
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            WebkitMaskImage: holeMask,
            maskImage: holeMask,
          }}
        >
          {/* Çipin altına düşen gölge */}
          <div
            className="absolute rounded-[26px]"
            style={{
              inset: -lead * 0.4,
              transform: `translateZ(${-thick - 6}px) translate(${shadowDx.toFixed(1)}px, ${shadowDy.toFixed(1)}px)`,
              background: "rgba(var(--c-060c18,6,12,24),0.6)",
              filter: "blur(24px)",
            }}
          />

          {Array.from({ length: SLAB_COUNT }, (_, i) => {
            const last = i === SLAB_COUNT - 1;

            return (
              <div
                key={`slab-${i}`}
                className="absolute inset-0 rounded-xl"
                style={{
                  transform: `translateZ(${-(i + 1) * 2}px)`,
                  background: slabBackground(Boolean(photo), i, last),
                  border: `1px solid rgba(${ICE},${photo ? 0.12 : last ? 0.25 : 0.32})`,
                }}
              />
            );
          })}

          {/* DÜZ ÇİP GÖVDESİ — cam değil: mat, opak KOYU LACİVERT yüzey,
            ince buzlu beyaz kenar; iç üst ışık + alt gölge ile kabarık */}
          <div
            className="absolute inset-0 overflow-hidden rounded-xl"
            style={{
              background: `
              repeating-linear-gradient(0deg, rgba(255,255,255,.018) 0 1px, transparent 1px 7px),
              repeating-linear-gradient(90deg, rgba(255,255,255,.012) 0 1px, transparent 1px 11px),
              linear-gradient(145deg, rgb(var(--substrate-1,28,34,56)) 0%, rgb(var(--substrate-2,18,23,40)) 60%, rgb(var(--substrate-3,12,16,30)) 100%)
            `,
              border: `1px solid rgba(${ICE},${powered ? 0.35 : 0.22})`,
              boxShadow: `inset 0 1px 0 rgba(var(--c-ffffff,255,255,255),0.08), inset 0 -10px 22px rgba(var(--c-000000,0,0,0),0.35), 0 0 ${powered ? 22 : 8}px rgba(${ICE},${powered ? 0.18 : 0.08})`,
              transition: "box-shadow 700ms, border-color 700ms",
            }}
          >
            {!photo && (
              <div
                className="absolute rounded-2xl"
                style={{
                  inset: "3.5%",
                  border: `1px solid rgba(${ICE_LIGHT},0.28)`,
                }}
              />
            )}

            {!photo &&
              CORNER_SCREWS.map((pos, i) => (
                <div
                  key={i}
                  className="absolute size-3 rounded-full"
                  style={{
                    ...pos,
                    background: "rgba(var(--c-020305,2,3,5),0.8)",
                    border: `1px solid rgba(${ICE_LIGHT},0.55)`,
                    boxShadow:
                      "inset 0 2px 3px rgba(var(--c-000000,0,0,0),0.6)",
                  }}
                />
              ))}
          </div>

          {photo ? (
            <PhotoDie
              plate={plate}
              rotation={45 + spin}
              photo={photo}
              position={photoPosition}
              zoom={photoZoom}
              tone={photoTone}
              shift={photoShift}
              powered={powered}
              delay={assembleDelay}
            />
          ) : (
            <>
              {[2, 4].map((z) => (
                <div
                  key={`inner-${z}`}
                  className="absolute rounded-[14px]"
                  style={{
                    inset: "12%",
                    transform: `translateZ(${z}px)`,
                    background: "rgba(var(--c-0a0c10,10,12,16),0.9)",
                    border: `1px solid rgba(${FRAME},0.6)`,
                  }}
                />
              ))}

              <div
                className="absolute overflow-hidden rounded-[14px]"
                style={{
                  inset: "12%",
                  transform: `translateZ(${innerZ}px)`,
                  background: `radial-gradient(ellipse at 50% 30%, rgba(var(--c-0e1016,14,16,22),0.95), rgba(var(--c-040508,4,5,8),0.97))`,
                  border: `2px solid rgba(${RIVER_EDGE},0.55)`,
                  boxShadow: `0 0 12px rgba(${RIVER_EDGE},0.35), inset 0 0 10px rgba(${RIVER_EDGE},0.2), inset 0 1px 0 rgba(var(--c-ffffff,255,255,255),0.4)`,
                }}
              >
                <div
                  className="absolute"
                  style={{
                    inset: "5%",
                    backgroundImage: `radial-gradient(circle, rgba(${GOLD},${
                      powered ? 0.75 : 0.55
                    }) 1.1px, transparent 1.7px)`,
                    backgroundSize: "8px 8px",
                    WebkitMaskImage:
                      "radial-gradient(circle, transparent 47%, black 49%, black 70%, rgba(var(--c-000000,0,0,0),0.5) 100%)",
                    maskImage:
                      "radial-gradient(circle, transparent 47%, black 49%, black 70%, rgba(var(--c-000000,0,0,0),0.5) 100%)",
                    transition: "background-image 700ms",
                  }}
                />
              </div>

              <div
                className="absolute top-1/2 left-1/2 rounded-full"
                style={{
                  width: (ringR + 16) * 2,
                  height: (ringR + 16) * 2,
                  transform: `translate(-50%,-50%) translateZ(${innerZ + 0.5}px)`,
                  border: `1px solid rgba(${ICE},0.45)`,
                }}
              />

              <div
                className="absolute top-1/2 left-1/2 rounded-full"
                style={{
                  width: (ringR + 7) * 2,
                  height: (ringR + 7) * 2,
                  transform: `translate(-50%,-50%) translateZ(${innerZ + 1}px)`,
                  border: `7px solid rgba(${RIVER_EDGE},${powered ? 0.75 : 0.5})`,
                  boxShadow: powered
                    ? `0 0 26px rgba(${ICE},0.9), inset 0 0 14px rgba(${ICE_LIGHT},0.7)`
                    : `0 0 12px rgba(${ICE},0.5), inset 0 0 8px rgba(${ICE},0.4)`,
                  transition: "box-shadow 700ms, border-color 700ms",
                }}
              />

              <div
                className="absolute top-1/2 left-1/2 rounded-full"
                style={{
                  width: ringR * 2,
                  height: ringR * 2,
                  transform: `translate(-50%,-50%) translateZ(${innerZ + 0.5}px)`,
                  background: `
                  radial-gradient(circle at 50% 50%,
                    rgba(${ICE},${powered ? 0.35 : 0.18}) 0%,
                    rgba(var(--c-0a0c10,10,12,16),0.92) 55%,
                    rgba(var(--c-020305,2,3,5),0.95) 100%)
                `,
                  boxShadow: "inset 0 0 22px rgba(var(--c-000000,0,0,0),0.8)",
                  transition: "background 700ms",
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   GERÇEKÇİ İŞLEMCİ (CPU) ÜST YÜZÜ

   SADE TASARIM — fotoğraf ön planda:

   ┌ alt taban (substrate): koyu kart, ince kenar + köşede pin-1 noktası
   ├ ısı dağıtıcı kapak (IHS): ince, fırçalanmış koyu metal çerçeve
   │ (birkaç katmanla 3B kalınlık)
   └ fotoğraf penceresi kapağın neredeyse tamamını kaplar: camın
     altında, silikon gibi yanardöner kıl inceliğinde kenar, çapraz
     cam yansıması.

   Fotoğrafın KENDİSİ temadan etkilenmez; ton/ışık katmanları
   paletten gelir (--photo-*). Animasyonlar yalnız giriş anında.
========================================================= */

const PHOTO_EDGE = "var(--photo-edge,70,190,255)";
const PHOTO_TINT = "var(--photo-tint,11,48,88)";
const PHOTO_DARK = "var(--photo-dark,4,22,46)";

const IHS_IN = 0.05; // kapağın tabandan içeri girişi (ince taban kenarı)
const WIN = { l: 0.09, t: 0.09, r: 0.09, b: 0.09 }; // fotoğraf penceresi: kapağın neredeyse tamamı
const IHS_LAYERS = 4; // kapak kalınlığı (2px'lik katmanlar)

const PHOTO_CSS = `
  @keyframes cpuLidIn {
    0%   { opacity: 0; transform: translateZ(calc(var(--z) + 90px)); }
    70%  { opacity: 1; }
    100% { opacity: 1; transform: translateZ(var(--z)); }
  }
  @keyframes cpuDieOn {
    0%   { opacity: 0; filter: brightness(2.4) saturate(0); }
    40%  { opacity: 1; }
    100% { opacity: 1; filter: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cpu-lid, .cpu-die { animation: none !important; opacity: 1 !important; }
  }
`;

type PhotoDieProps = {
  plate: number;
  rotation: number;
  photo: string;
  position: string;
  zoom: number;
  tone: "natural" | "noir";
  shift: { x: number; y: number };
  powered: boolean;
  delay: number;
};

function PhotoDie({
  plate,
  rotation,
  photo,
  position,
  zoom,
  tone,
  shift,
  powered,
  delay,
}: PhotoDieProps) {
  const ihs = plate * IHS_IN;
  const radius = plate * 0.03; // kapak köşe yarıçapı

  const wl = plate * WIN.l;
  const wt = plate * WIN.t;
  const ww = plate * (1 - WIN.l - WIN.r);
  const wh = plate * (1 - WIN.t - WIN.b);

  const cover = plate * 1.45 * zoom;
  const topZ = innerZ + 2; // kapağın üst yüzü

  const lidAnimation = `cpuLidIn .8s cubic-bezier(.2,.9,.25,1) ${delay}s both`;
  const dieAnimation = `cpuDieOn .9s ease-out ${delay + 0.55}s both`;

  /* Fotoğrafı pencereye göre ters döndürülmüş, plaka boyunda katman */
  const counterRotate: CSSProperties = {
    left: -wl,
    top: -wt,
    width: plate,
    height: plate,
    transform: `rotate(${-rotation}deg)`,
  };

  const lidStyle: CSSVars = {
    inset: ihs,
    borderRadius: radius,
    "--z": `${topZ}px`,
    transform: `translateZ(${topZ}px)`,
    background: `
      repeating-linear-gradient(90deg, rgba(255,255,255,.045) 0 1px, rgba(0,0,0,.035) 1px 2px, transparent 2px 3px),
      radial-gradient(ellipse 80% 60% at 30% 20%, rgba(255,246,228,.35), transparent 60%),
      linear-gradient(135deg, #9ea3ae 0%, #5d6372 32%, #a8adb8 52%, #4b5160 76%, #7e8492 100%)
    `,
    boxShadow: `
      inset 0 1.5px 0 rgba(255,255,255,.55),
      inset 0 -2px 3px rgba(0,0,0,.35),
      inset 0 0 0 1px rgba(0,0,0,.25)
    `,
    animation: lidAnimation,
  };

  return (
    <>
      <style>{PHOTO_CSS}</style>

      {/* pin-1 noktası */}
      <span
        className="absolute rounded-full"
        style={{
          left: plate * 0.016,
          bottom: plate * 0.016,
          width: plate * 0.018,
          height: plate * 0.018,
          background: "radial-gradient(circle at 35% 30%, #fbe7bd, #b8893e)",
          transform: "translateZ(1px)",
          opacity: 0.85,
        }}
      />

      {/* kapak kalınlığı */}
      {Array.from({ length: IHS_LAYERS }, (_, i) => {
        const z = innerZ - IHS_LAYERS * 2 + i * 2 + 2;
        const sideStyle: CSSVars = {
          inset: ihs,
          borderRadius: radius,
          "--z": `${z}px`,
          transform: `translateZ(${z}px)`,
          background: i % 2 ? "#5d6371" : "#6b7280",
          boxShadow:
            i === 0
              ? "0 0 0 1px rgba(0,0,0,.55), 0 6px 14px rgba(0,0,0,.5)"
              : undefined,
          animation: lidAnimation,
        };

        return (
          <div
            key={`ihs-side-${i}`}
            className="cpu-lid absolute"
            style={sideStyle}
          />
        );
      })}

      {/* kapağın üst yüzü */}
      <div className="cpu-lid absolute overflow-hidden" style={lidStyle} />

      {/* yanardöner silikon kenarı */}
      <div
        className="cpu-die absolute"
        style={{
          left: wl - 3,
          top: wt - 3,
          width: ww + 6,
          height: wh + 6,
          borderRadius: 7,
          transform: `translateZ(${topZ + 0.5}px)`,
          background:
            "conic-gradient(from 30deg, #ffd9a0, #c7a6ff, #8fd3ff, #b8ffd9, #ffe7a6, #ffb3c7, #ffd9a0)",
          boxShadow: powered
            ? `0 0 18px rgba(${PHOTO_EDGE},.45), 0 0 0 1px rgba(0,0,0,.6)`
            : "0 0 0 1px rgba(0,0,0,.6)",
          opacity: 0.85,
          transition: "box-shadow 700ms",
          animation: dieAnimation,
        }}
      />

      {/* fotoğraf penceresi */}
      <div
        className="cpu-die absolute overflow-hidden"
        style={{
          left: wl,
          top: wt,
          width: ww,
          height: wh,
          borderRadius: 5,
          transform: `translateZ(${topZ + 1}px)`,
          background: `rgb(${PHOTO_DARK})`,
          boxShadow:
            "inset 0 0 0 1.5px rgba(0,0,0,.75), inset 0 4px 10px rgba(0,0,0,.55)",
          animation: dieAnimation,
        }}
      >
        <div className="absolute" style={counterRotate}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            draggable={false}
            className="absolute max-w-none"
            style={{
              left: (plate - cover) / 2 + shift.x * plate,
              top: (plate - cover) / 2 + shift.y * plate,
              width: cover,
              height: cover,
              objectFit: "cover",
              objectPosition: position,
              filter:
                tone === "noir"
                  ? `grayscale(1) contrast(1.25) brightness(${powered ? 0.9 : 0.75})`
                  : powered
                    ? "saturate(1.05) brightness(1.05)"
                    : "saturate(.95)",
              transition: "filter 700ms",
            }}
          />
        </div>

        {tone === "noir" && (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `rgb(${PHOTO_TINT})`,
                mixBlendMode: "color",
                opacity: 0.6,
              }}
            />

            <div
              className="absolute"
              style={{
                ...counterRotate,
                background: `linear-gradient(90deg, transparent 45%, rgba(${PHOTO_EDGE},${powered ? 0.4 : 0.26}) 80%, transparent 100%)`,
                mixBlendMode: "screen",
              }}
            />
          </>
        )}

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(125deg, rgba(255,255,255,.2) 0%, rgba(255,255,255,.05) 22%, transparent 40%, transparent 70%, rgba(255,255,255,.08) 85%, transparent 100%)",
            mixBlendMode: "screen",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(to bottom, rgba(255,255,255,.03) 0 1px, transparent 1px 4px)",
          }}
        />

        <div
          className="absolute inset-0"
          style={{ boxShadow: "inset 0 0 22px rgba(0,0,0,.45)" }}
        />
      </div>
    </>
  );
}
