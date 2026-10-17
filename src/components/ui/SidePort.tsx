"use client";

import type { ReactNode } from "react";

import { POWER_LIGHT_MS, POWER_FADE_MS } from "./GlowConnector";

type SidePortProps = {
  type: "usb-c" | "usb-a" | "hdmi" | "audio" | "serial";
  lit?: boolean;
  /* ---- sadece AUDIO için: fiş takılınca nereye ışık tutacağı ---- */
  /** Alt gövdenin sola oynama açısı (derece, + = alt uç sola). Üst silindir sabit kalır. */
  swing?: number;
  /** Işık hüzmesinin gövdeye göre ek dönüşü (derece) — hedefe nişan */
  beamAngle?: number;
  /** Işık hüzmesinin boyu (px) */
  beamLength?: number;
  /** Işık hüzmesinin hedefteki genişliği (px) */
  beamWidth?: number;
};

const metalGrad =
  "linear-gradient(160deg, #eef1f5 0%, #c5ccd6 20%, #93a0b0 50%, #5c6878 80%, #3d4756 100%)";
const metalShadow =
  "inset 0 2px 2px rgba(255,255,255,0.9), inset 0 -3px 4px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.5)";
const holeShadow =
  "inset 0 3px 4px rgba(0,0,0,0.95), inset 0 -1px 1px rgba(255,255,255,0.08)";

function Socket({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-start overflow-visible">
      {children}
    </div>
  );
}

export default function SidePort({
  type,
  lit = false,
  swing = 0,
  beamAngle = 0,
  beamLength = 650,
  beamWidth = 420,
}: SidePortProps) {
  if (type === "usb-c") {
    return (
      <Socket>
        <div
          className="relative h-6 w-14 rounded-full border border-black/50"
          style={{ background: metalGrad, boxShadow: metalShadow }}
        >
          <div
            className="absolute inset-x-2 inset-y-1.25 rounded-full"
            style={{ background: "#05070a", boxShadow: holeShadow }}
          />
        </div>
      </Socket>
    );
  }

  if (type === "usb-a") {
    return (
      <Socket>
        <div
          className="relative h-7 w-16 rounded-xs border border-black/50"
          style={{ background: metalGrad, boxShadow: metalShadow }}
        >
          <div
            className="absolute inset-1.5"
            style={{ background: "#05070a", boxShadow: holeShadow }}
          />
          <div
            className="absolute -top-0.75 left-1/2 h-1.25 w-8 -translate-x-1/2 rounded-t-xs"
            style={{ background: "#8a94a4" }}
          />
        </div>
      </Socket>
    );
  }

  if (type === "hdmi") {
    return (
      <Socket>
        <div
          className="relative h-6 w-16 border border-black/50"
          style={{
            background: metalGrad,
            boxShadow: metalShadow,
            clipPath: "polygon(8% 0, 92% 0, 100% 100%, 0 100%)",
          }}
        >
          <div
            className="absolute inset-x-[14%] inset-y-1.25"
            style={{
              background: "#05070a",
              boxShadow: holeShadow,
              clipPath: "polygon(4% 0, 96% 0, 100% 100%, 0 100%)",
            }}
          />
        </div>
      </Socket>
    );
  }

  if (type === "serial") {
    return (
      <Socket>
        <div
          className="relative h-8 w-16 rounded-sm border border-black/50"
          style={{ background: metalGrad, boxShadow: metalShadow }}
        >
          <div
            className="absolute inset-x-2 inset-y-1 flex flex-col items-center justify-center gap-0.75 rounded-xs"
            style={{ background: "#05070a", boxShadow: holeShadow }}
          />
        </div>
      </Socket>
    );
  }

  // AUDIO PORT — renkler GlowConnector ile AYNI DEĞİŞKENLERDEN gelir
  // (data-part="connector": palet konnektörle aynı ışık rengini verir,
  // ör. abyss'te kırık beyaz). Üst silindir sabit; fiş takılınca SADECE alt gövde
  // sola oynar (yukarı kalkmaz) ve delikten TEK bir ışık hüzmesi hedefe uzanır
  return (
    <div
      data-part="connector"
      className="relative flex justify-start overflow-visible"
    >
      <Socket>
        <div className="relative z-10 flex flex-col items-center">
          {/* 1. Üst Mavi Silindir Parça — SABİT (panele bağlı kısım) */}
          <div
            className="z-30 -mb-px h-3 w-6 rounded-t-xs transition-all duration-700"
            style={{
              background: lit
                ? "linear-gradient(90deg, rgb(var(--c-1e3454,30,52,84)) 0%, rgb(var(--c-f4f8fd,244,248,253)) 50%, rgb(var(--c-1e3454,30,52,84)) 100%)"
                : "linear-gradient(90deg, rgb(var(--c-1b2e4a,27,46,74)) 0%, rgb(var(--c-3d6290,61,98,144)) 50%, rgb(var(--c-192b46,25,43,70)) 100%)",
              boxShadow: lit
                ? "0 0 8px rgba(var(--c-c8ebff,200,235,255),0.45), inset 0 1px 1px rgba(var(--c-f5fbff,255,255,255),0.6)"
                : "inset 0 1px 1px rgba(255,255,255,0.4)",
            }}
          />

          {/* 2. Alt gövde — üst kenarının ortasından döner (sadece alt uç oynar) */}
          <div
            className="relative z-20"
            style={{
              /* dönme noktası üst silindirin içinde: gövdenin köşesi
                 dönerken panel kenarının üstüne kalkmaz */
              transformOrigin: "50% 6px",
              transform: `rotate(${lit ? swing : 0}deg)`,
              /* dönüş, konnektör pin dalgasıyla aynı sürede biter */
              transition: `transform ${POWER_LIGHT_MS}ms cubic-bezier(.25,.8,.3,1)`,
            }}
          >
            <div
              className="relative flex h-12 w-11 items-center justify-center rounded-xs transition-all duration-700"
              style={{
                background: lit
                  ? "linear-gradient(105deg, rgb(var(--c-3d6290,61,98,144)) 0%, rgb(var(--c-253f64,37,63,100)) 50%, rgb(var(--c-1b2f4c,27,47,76)) 100%)"
                  : "linear-gradient(105deg, rgb(var(--c-2d4c74,45,76,116)) 0%, rgb(var(--c-213958,33,57,88)) 45%, rgb(var(--c-192b46,25,43,70)) 100%)",
                border: lit
                  ? "1px solid rgba(var(--c-c8ebff,200,235,255),0.6)"
                  : "1px solid rgba(var(--c-c8ebff,200,235,255),0.45)",
                boxShadow: lit
                  ? `
                    inset 1px 1px 3px rgba(var(--c-f5fbff,255,255,255),0.45),
                    inset -2px -2px 4px rgba(0,0,0,0.5),
                    0 0 10px 2px rgba(var(--c-c8ebff,200,235,255),0.3)
                  `
                  : `
                    inset 1px 1px 2px rgba(255,255,255,0.4),
                    inset -2px -2px 4px rgba(0,0,0,0.5),
                    0 4px 8px rgba(0,0,0,0.5)
                  `,
              }}
            >
              {/* Ortadaki Dairesel Port Halkası */}
              <div
                className="relative flex size-6 items-center justify-center rounded-full"
                style={{
                  background: lit
                    ? "linear-gradient(135deg, rgb(var(--c-f4f8fd,244,248,253)) 0%, rgb(var(--c-33557e,51,85,126)) 100%)"
                    : "linear-gradient(135deg, rgb(var(--c-3d6290,61,98,144)) 0%, rgb(var(--c-1b2e4a,27,46,74)) 100%)",
                  border: "1px solid rgba(255,255,255,0.5)",
                  boxShadow: lit
                    ? "0 0 7px rgba(var(--c-c8ebff,200,235,255),0.45), 0 1px 3px rgba(0,0,0,0.5)"
                    : "0 1px 3px rgba(0,0,0,0.5)",
                }}
              >
                {/* Audio Port Deliği (Işığın Tam Çıkış Noktası) */}
                <div
                  className="relative flex size-3.5 items-center justify-center rounded-full"
                  style={{
                    background: "rgb(var(--c-122034,18,32,52))",
                    boxShadow: "inset 0 0 4px #000",
                  }}
                >
                  {lit && (
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          "radial-gradient(circle, rgb(var(--pin-light,255,255,255)) 0%, rgba(var(--c-c8ebff,200,235,255),0.8) 60%, transparent 100%)",
                        boxShadow:
                          "0 0 8px rgba(var(--pin-light,255,255,255),0.7), 0 0 14px rgba(var(--c-c8ebff,200,235,255),0.45)",
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Alt Çentikler */}
              <div className="absolute bottom-1 left-1.5 size-1 rounded-xs bg-[rgb(var(--c-122034,18,32,52))]" />
              <div className="absolute right-1.5 bottom-1 size-1 rounded-xs bg-[rgb(var(--c-122034,18,32,52))]" />
            </div>

            {/* 3. TEK ışık hüzmesi — gövdenin ALT UCUNDAN (üstten 47px) çıkar,
                hedefe doğru döner.
                GlowConnector ışığıyla AYNI değişkenler ve yoğunluk. */}
            <div
              className="pointer-events-none absolute top-12 left-1/2"
              style={{
                width: beamWidth,
                height: beamLength,
                marginLeft: -beamWidth / 2,
                transformOrigin: "50% 0%",
                transform: `rotate(${beamAngle}deg)`,
                background:
                  "linear-gradient(180deg, rgba(var(--c-d7eeff,215,238,255),0.3) 0%, rgba(var(--c-bee1fa,190,225,250),0.13) 22%, rgba(var(--c-b4dcfa,180,220,250),0.04) 62%, transparent 100%)",
                /* ışık gövdenin alt kenarının ORTA NOKTASINDAN çıkar (tek nokta);
                   hangi açıya dönerse dönsün başlangıç aynı noktada kalır */
                clipPath: `polygon(${50 - (6 / beamWidth) * 100}% 0, ${50 + (6 / beamWidth) * 100}% 0, 100% 100%, 0 100%)`,
                filter: "blur(1px)",
                mixBlendMode: "screen",
                opacity: lit ? 1 : 0,
                /* gövde döndükten sonra yanar */
                transition: `opacity ${POWER_FADE_MS}ms ease ${lit ? POWER_LIGHT_MS : 0}ms` /* ortak an */,
              }}
            />
          </div>
        </div>
      </Socket>
    </div>
  );
}
