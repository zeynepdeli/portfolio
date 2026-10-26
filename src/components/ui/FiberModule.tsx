"use client";

import { POWER_LIGHT_MS, POWER_FADE_MS } from "./GlowConnector";

/* =========================================================
   FİBER OPTİK MODÜL (SFP) — açılışta soketi gösteren lazer
   Sunucu kartlarındaki fiber optik modül gibi: panelin alt kenarındaki
   metal kafese takılı, dik duran gümüş gövde; üst ucunda iki delikli
   LC yuvası (TX / RX) ve mavi çekme kolu. TX deliğinden gerçek bir
   fiber lazeri gibi ince, parlak bir ışık çıkar ve hedefe (üst ortadaki
   güç soketi) uzanır. lit=false olunca lazer ve LED söner.

   Kutu ölçüsü W×H; ışığın çıktığı nokta kutunun üst kenarından
   BEAM_Y aşağıda, yatay ortadan BEAM_X sağda (TX deliği).
========================================================= */

export const FIBER_W = 34;
export const FIBER_H = 66;
/** TX deliğinin kutudaki yeri (ışığın çıkış noktası) */
export const FIBER_TX_X = FIBER_W / 2 - 6;
export const FIBER_TX_Y = 12;

const metal =
  "linear-gradient(90deg, #5c6878 0%, #c5ccd6 18%, #eef1f5 40%, #a9b4c2 62%, #6f7b8c 85%, #4a5566 100%)";

type Props = {
  lit: boolean;
  /** lazerin açısı (derece; 0 = dümdüz yukarı, + = sağa) */
  angle: number;
  /** lazerin boyu (px) */
  length: number;
  /** lazerin hedefteki genişliği (px) */
  spread?: number;
};

export default function FiberModule({
  lit,
  angle,
  length,
  spread = 60,
}: Props) {
  const fade = `opacity ${POWER_FADE_MS}ms ease ${lit ? POWER_LIGHT_MS : 0}ms`;
  return (
    <div
      aria-hidden
      className="pointer-events-none relative"
      style={{ width: FIBER_W, height: FIBER_H }}
    >
      {/* LAZER — TX deliğinden hedefe; dış hüzme + parlak ince çekirdek */}
      <div
        className="absolute"
        style={{
          left: FIBER_TX_X,
          top: FIBER_TX_Y,
          width: 0,
          height: 0,
          transform: `rotate(${angle}deg)`,
          opacity: lit ? 1 : 0,
          transition: fade,
        }}
      >
        <div
          className="absolute"
          style={{
            left: -spread / 2,
            bottom: 0,
            width: spread,
            height: length,
            clipPath: `polygon(0 0, 100% 0, ${50 + (2 / spread) * 100}% 100%, ${50 - (2 / spread) * 100}% 100%)`,
            WebkitClipPath: `polygon(0 0, 100% 0, ${50 + (2 / spread) * 100}% 100%, ${50 - (2 / spread) * 100}% 100%)`,
            background:
              "linear-gradient(0deg, rgba(var(--c-d7eeff,215,238,255),.4) 0%, rgba(var(--c-8ee6ff,142,230,255),.2) 45%, rgba(var(--c-8ee6ff,142,230,255),.13) 90%, rgba(var(--c-8ee6ff,142,230,255),.05) 100%)",
          }}
        />
        <div
          className="absolute"
          style={{
            left: -1,
            bottom: 0,
            width: 2,
            height: length - 6,
            borderRadius: 1,
            background:
              "linear-gradient(0deg, rgba(var(--c-f5fbff,255,255,255),.95), rgba(var(--c-8ee6ff,142,230,255),.55) 70%, rgba(var(--c-8ee6ff,142,230,255),0))",
            boxShadow: "0 0 6px rgba(var(--c-8ee6ff,142,230,255),.8)",
          }}
        />
      </div>

      {/* alt kenardaki metal kafes (modülün takıldığı yuva) */}
      <div
        className="absolute"
        style={{
          left: -4,
          right: -4,
          bottom: 0,
          height: 14,
          borderRadius: "3px 3px 0 0",
          background:
            "linear-gradient(180deg, rgb(var(--c-3d6290,61,98,144)), rgb(var(--c-1b2e4a,27,46,74)))",
          border: "1px solid rgba(var(--c-c8ebff,200,235,255),.45)",
          borderBottom: "none",
          boxShadow: "0 -2px 6px rgba(0,0,0,.45)",
        }}
      >
        {/* bağlantı LED'i: lazer açıkken yeşil-turkuaz yanar */}
        <span
          className="absolute rounded-full"
          style={{
            right: 4,
            top: 4,
            width: 4,
            height: 4,
            background: lit
              ? "rgb(var(--c-6ef5e8,110,245,232))"
              : "rgba(var(--c-6ef5e8,110,245,232),.25)",
            boxShadow: lit ? "0 0 6px rgb(var(--c-6ef5e8,110,245,232))" : "none",
            transition: "background .4s ease, box-shadow .4s ease",
          }}
        />
      </div>

      {/* gümüş gövde (havalandırma oluklu) */}
      <div
        className="absolute"
        style={{
          left: 0,
          right: 0,
          top: 4,
          bottom: 12,
          borderRadius: 2,
          background: `repeating-linear-gradient(180deg, transparent 0 6px, rgba(0,0,0,.18) 6px 7px), ${metal}`,
          border: "1px solid rgba(0,0,0,.45)",
          boxShadow:
            "inset 0 1px 1px rgba(255,255,255,.7), 0 2px 6px rgba(0,0,0,.5)",
        }}
      />

      {/* mavi çekme kolu (bail): gövdenin üst ucunu saran tel */}
      <div
        className="absolute"
        style={{
          left: -3,
          right: -3,
          top: 0,
          height: 22,
          borderRadius: "5px 5px 2px 2px",
          border: "2.5px solid rgb(var(--c-46beff,70,190,255))",
          borderBottom: "none",
          boxShadow: "0 0 4px rgba(var(--c-46beff,70,190,255),.5)",
        }}
      />

      {/* LC yuvası: koyu yüz, iki delik (TX ışık verir, RX karanlık) */}
      <div
        className="absolute"
        style={{
          left: 3,
          right: 3,
          top: 6,
          height: 13,
          borderRadius: 2,
          background: "#0a1426",
          boxShadow: "inset 0 1px 3px #000",
        }}
      >
        {[FIBER_TX_X - 3, FIBER_W / 2 + 6 - 3].map((x, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: x - 3,
              top: 3,
              width: 6,
              height: 6,
              background:
                i === 0 && lit
                  ? "radial-gradient(circle, #fff 0%, rgb(var(--c-8ee6ff,142,230,255)) 55%, rgba(var(--c-8ee6ff,142,230,255),0) 100%)"
                  : "#02060e",
              boxShadow:
                i === 0 && lit
                  ? "0 0 8px rgb(var(--c-8ee6ff,142,230,255)), 0 0 14px rgba(var(--c-8ee6ff,142,230,255),.6)"
                  : "inset 0 1px 2px #000",
              transition: "background .4s ease, box-shadow .4s ease",
            }}
          />
        ))}
      </div>

      {/* TX / RX yazısı */}
      <div
        className="absolute flex justify-around font-mono"
        style={{
          left: 2,
          right: 2,
          top: 22,
          fontSize: 6,
          lineHeight: "7px",
          fontWeight: 700,
          color: "rgba(4,20,42,.75)",
        }}
      >
        <span>TX</span>
        <span>RX</span>
      </div>
    </div>
  );
}
