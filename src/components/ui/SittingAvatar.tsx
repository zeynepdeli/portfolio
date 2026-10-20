"use client";

import type { CSSProperties } from "react";

/* =========================================================
   OTURAN AVATAR (HTML) — public/images/zeynep-oturma.webp
   Görsel üç katmana bölünür: gövde + uyluklar (sabit) ve dizden
   aşağı iki baldır. Baldırlar dizden, birbirine ters zamanda
   ileri-geri sallanır. ProjectsSection'daki SVG sürümüyle aynı ölçüler.
========================================================= */

const SRC = "/images/zeynep-oturma.webp";
const IMG_W = 1584;
const IMG_H = 672;
/* kişinin görseldeki yeri (px) */
const P_LEFT = 661;
const P_RIGHT = 925;
const P_TOP = 28;
const P_BOTTOM = 662;
/** dizler (baldırların döndüğü yer) */
const KNEE_Y = 428;
const LEFT_KNEE_X = 760;
const RIGHT_KNEE_X = 828;
const MID_X = 794;
/** oturma çizgisi (uyluk / eller) — oturduğu yüzey buraya hizalanır */
export const SIT_SEAT_Y = 410;

type Props = {
  /** kişinin ekrandaki boyu (px) */
  height: number;
  /** ayak sallama açık mı */
  swinging?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** Kişinin genişliği / boyu oranı */
export const SIT_ASPECT = (P_RIGHT - P_LEFT) / (P_BOTTOM - P_TOP);
/** Oturma çizgisinin kişinin boyuna oranı (üstten) */
export const SIT_SEAT = (SIT_SEAT_Y - P_TOP) / (P_BOTTOM - P_TOP);

export default function SittingAvatar({
  height,
  swinging = true,
  className,
  style,
}: Props) {
  const k = height / (P_BOTTOM - P_TOP);
  const w = (P_RIGHT - P_LEFT) * k;
  /* görsel katmanı: kişi kutunun sol üstüne otursun */
  const img: CSSProperties = {
    position: "absolute",
    left: -P_LEFT * k,
    top: -P_TOP * k,
    width: IMG_W * k,
    height: IMG_H * k,
    backgroundImage: `url(${SRC})`,
    backgroundSize: "100% 100%",
  };
  const px = (x: number) => (x - P_LEFT) * k;
  const py = (y: number) => (y - P_TOP) * k;

  const layer = (clip: string, extra?: CSSProperties) => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        clipPath: clip,
        ...extra,
      }}
    >
      <div style={img} />
    </div>
  );

  /* clip-path koordinatları kişi kutusuna göre (px); kutunun dışına
     taşan saç vb. için geniş tutulur */
  const BIG = 2000;
  const bodyClip = `polygon(${-BIG}px ${-BIG}px, ${BIG}px ${-BIG}px, ${BIG}px ${py(440)}px, ${-BIG}px ${py(440)}px)`;
  const leftClip = `polygon(${-BIG}px ${py(415)}px, ${px(MID_X)}px ${py(415)}px, ${px(MID_X)}px ${BIG}px, ${-BIG}px ${BIG}px)`;
  const rightClip = `polygon(${px(MID_X)}px ${py(415)}px, ${BIG}px ${py(415)}px, ${BIG}px ${BIG}px, ${px(MID_X)}px ${BIG}px)`;

  const leg = (kneeX: number, delay: string) => ({
    transformOrigin: `${px(kneeX)}px ${py(KNEE_Y)}px`,
    animation: swinging
      ? `sitLegSwing 0.55s ease-in-out ${delay} infinite alternate`
      : "none",
  });

  return (
    <div
      className={className}
      style={{ position: "relative", width: w, height, ...style }}
      aria-hidden
    >
      <style>{`
        @keyframes sitLegSwing {
          from { transform: rotate(-13deg); }
          to   { transform: rotate(13deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-sit-leg] { animation: none !important; }
        }
      `}</style>
      {layer(leftClip, leg(LEFT_KNEE_X, "0s"))}
      {layer(rightClip, leg(RIGHT_KNEE_X, "-0.55s"))}
      {layer(bodyClip)}
    </div>
  );
}
