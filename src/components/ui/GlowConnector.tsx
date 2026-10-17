"use client";

/** true: konnektörlerden sağa, menü butonlarına doğru nehir mavisi
 *  ışık hüzmesi yayılır ve butonları soldan aydınlatır. */
const SHOW_BEAMS = true;

/** Pinler yukarıdan aşağı sırayla yanar (satır başına gecikme, ms) */
const PIN_STEP_MS = 18;
/** Işık hüzmesi, pin dalgası bitince gelir (12 satır × adım + yanma süresi) */
const PIN_WAVE_MS = 12 * PIN_STEP_MS + 120;

/** ORTAK ZAMANLAMA — fiş takıldıktan (powered) sonra tüm ışıkların AYNI
 *  ANDA yandığı an (ms). Konnektör hüzmeleri, menü butonlarının soldan
 *  aydınlanması, port ışıkları, hedef aydınlıkları ve yazının başlaması
 *  hep bu ana bağlıdır → animasyonlar senkron ilerler.
 *  0 → POWER_LIGHT_MS : konnektör pinleri dalga halinde yanar, portlar döner
 *  POWER_LIGHT_MS     : bütün ışıklar birlikte açılır, yazı yazılmaya başlar */
export const POWER_LIGHT_MS = PIN_WAVE_MS;
/** Işıkların açılma süresi (ms) — hepsi aynı sürede */
export const POWER_FADE_MS = 520;

type GlowConnectorProps = {
  lit?: boolean;
};

/* palet bu parçaya özel renk verebilir: data-part="connector" (theme.tsx) */

// Tek bütün panel içindeki 2 sıra x 12 satır = 30 mm/pin alanı
const dots = Array.from({ length: 24 }, (_, i) => i);

/* Konnektör yüksekliği — Header'daki CONNECTOR_H ile aynı olmalı */
export const CONNECTOR_HEIGHT = 260;

/* Pin satırı başına gecikme: yukarıdan aşağı dalga (yanarken) */
const pinDelay = (lit: boolean, index: number) =>
  lit ? Math.floor(index / 2) * PIN_STEP_MS : 0;

/* Orta kesik (key notch) ölçüleri */
const NOTCH_W = 7;
const NOTCH_H = 30;

export default function GlowConnector({ lit = false }: GlowConnectorProps) {
  return (
    <div
      data-part="connector"
      className="relative select-none"
      style={{
        width: "42px",
        height: `${CONNECTOR_HEIGHT}px`,
      }}
    >
      {/* =====================================================
          SAĞA DOĞRU BUZ MAVİSİ IŞIK HÜZMESİ (konnektör boyu, tek parça)
      ===================================================== */}
      <style>{`
        /* Önce pinler yanar, ışık hüzmesi hemen ardından soldan sağa açılır */
        @keyframes gcBeamIn {
          0%   { opacity: 0; transform: scaleX(.15); filter: brightness(2); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: scaleX(1);  filter: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gc-beams { animation: none !important; }
        }
      `}</style>
      {lit && SHOW_BEAMS && (
        <div
          className="gc-beams pointer-events-none absolute inset-0"
          style={{
            transformOrigin: "100% 50%",
            animation: `gcBeamIn 520ms cubic-bezier(.2,.8,.2,1) ${PIN_WAVE_MS}ms both`,
          }}
        >
          {/* Ana geniş ışık */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: "100%",
              top: "0",
              bottom: "0",
              width: "380px",

              background:
                "linear-gradient(90deg, rgba(var(--c-d7eeff,215,238,255),0.24) 0%, rgba(var(--c-bee1fa,190,225,250),0.1) 30%, rgba(var(--c-b4dcfa,180,220,250),0.03) 65%, transparent 100%)",

              clipPath: "polygon(0 0, 100% 15%, 100% 85%, 0 100%)",

              filter: "blur(8px)",
            }}
          />

          {/* Merkez yoğun ışık */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: "100%",
              top: "10px",
              bottom: "10px",

              width: "250px",

              background:
                "linear-gradient(90deg, rgba(var(--c-d7eeff,215,238,255),0.28), rgba(var(--c-bee1fa,190,225,250),0.12), transparent)",

              clipPath: "polygon(0 0, 100% 25%, 100% 75%, 0 100%)",

              filter: "blur(6px)",
            }}
          />

          {/* Bağlantı noktası parlaması */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: "100%",
              top: "0",
              bottom: "0",

              width: "70px",

              background:
                "radial-gradient(ellipse at left, rgba(var(--c-d7eeff,215,238,255),0.2), rgba(var(--c-bee1fa,190,225,250),0.1) 40%, transparent 80%)",

              filter: "blur(10px)",
            }}
          />
        </div>
      )}

      {/* =====================================================
          TEK PARÇA ANA CONNECTOR GÖVDESİ
      ===================================================== */}
      <div
        className="relative size-full overflow-hidden rounded-sm transition-all duration-700"
        style={{
          filter: lit
            ? `
              brightness(1.08)
              saturate(1.05)
              ${SHOW_BEAMS ? "drop-shadow(0 0 10px rgba(var(--c-c8ebff,200,235,255),0.35))" : ""}
            `
            : `
              brightness(0.95)
              saturate(0.9)
            `,
        }}
      >
        {/* TEK PARÇA DIŞ METAL GÖVDE */}
        <div
          className="absolute inset-0 rounded-sm"
          style={{
            background: lit
              ? `
                linear-gradient(
                  105deg,
                  rgb(var(--c-1e3454,30,52,84)) 0%,
                  rgb(var(--c-253f64,37,63,100)) 20%,
                  rgb(var(--c-3d6290,61,98,144)) 35%,
                  rgb(var(--c-253f64,37,63,100)) 50%,
                  rgb(var(--c-33557e,51,85,126)) 70%,
                  rgb(var(--c-1b2f4c,27,47,76)) 100%
                )
              `
              : `
                linear-gradient(
                  105deg,
                  rgb(var(--c-192b46,25,43,70)) 0%,
                  rgb(var(--c-213958,33,57,88)) 25%,
                  rgb(var(--c-2d4c74,45,76,116)) 50%,
                  rgb(var(--c-22395a,34,57,90)) 75%,
                  rgb(var(--c-1b2e4a,27,46,74)) 100%
                )
              `,

            border: lit
              ? "1px solid rgba(var(--c-c8ebff,200,235,255),0.6)"
              : "1px solid rgba(var(--c-c8ebff,200,235,255),0.45)",

            boxShadow: lit
              ? `
                inset 1px 0 3px rgba(var(--c-f5fbff,245,251,255),0.25),
                inset -2px 0 5px rgba(var(--c-000000,0,0,0),0.6),
                0 4px 14px rgba(var(--c-000000,0,0,0),0.6)
              `
              : `
                inset 1px 0 3px rgba(var(--c-ffffff,255,255,255),0.12),
                inset -2px 0 5px rgba(var(--c-000000,0,0,0),0.45),
                0 4px 12px rgba(var(--c-000000,0,0,0),0.5)
              `,
          }}
        />

        {/* Metal Yansıma Katmanı */}
        <div
          className="pointer-events-none absolute rounded-sm"
          style={{
            inset: "1px",

            background: lit
              ? `
                linear-gradient(
                  105deg,
                  transparent 0%,
                  rgba(var(--c-ffffff,255,255,255),0.1) 30%,
                  transparent 45%,
                  rgba(var(--c-c8ebff,200,235,255),0.12) 80%,
                  transparent 100%
                )
              `
              : `
                linear-gradient(
                  105deg,
                  transparent 0%,
                  rgba(var(--c-ffffff,255,255,255),0.08) 25%,
                  transparent 45%,
                  rgba(var(--c-c8ebff,200,235,255),0.1) 75%,
                  transparent 100%
                )
              `,

            mixBlendMode: "screen",
          }}
        />

        {/* =================================================
            TEK PARÇA İÇ KOYU PANEL
        ================================================= */}
        <div
          className="absolute rounded-xs"
          style={{
            left: "6px",
            right: "6px",
            top: "8px",
            bottom: "8px",

            background: lit
              ? `
                linear-gradient(
                  100deg,
                  rgb(var(--c-122034,18,32,52)) 0%,
                  rgb(var(--c-203656,32,54,86)) 50%,
                  rgb(var(--c-0d1828,13,24,40)) 100%
                )
              `
              : `
                linear-gradient(
                  100deg,
                  rgb(var(--c-122034,18,32,52)) 0%,
                  rgb(var(--c-1d3250,29,50,80)) 50%,
                  rgb(var(--c-172a44,23,42,68)) 100%
                )
              `,

            border: lit
              ? "1px solid rgba(var(--c-c8ebff,200,235,255),0.7)"
              : "1px solid rgba(var(--c-c8ebff,200,235,255),0.35)",

            boxShadow: `
              inset 0 0 10px rgba(var(--c-000000,0,0,0),0.7),
              0 0 3px rgba(var(--c-000000,0,0,0),0.3)
            `,
          }}
        />

        {/* =================================================
            LED PINLERI (2 SIRA - Yanınca Sağa Dönüşlü)
        ================================================= */}
        <div
          className="absolute grid grid-cols-2 transition-all duration-700 ease-in-out"
          style={{
            left: "11px",
            right: "11px",
            top: "16px",
            bottom: "16px",

            gridTemplateRows: "repeat(12, 1fr)",

            columnGap: "6px",
            rowGap: "2px",
          }}
        >
          {dots.map((index) => (
            <div
              key={index}
              className="flex items-center justify-center"
              style={{
                /* Yandığında 90 derece sağa döner — yukarıdan aşağı dalga */
                transform: lit ? "rotate(90deg)" : "rotate(0deg)",
                transition: `transform 260ms ease-out ${pinDelay(lit, index)}ms`,
              }}
            >
              <span
                style={{
                  transition: `all 260ms ease-out ${pinDelay(lit, index)}ms`,
                  width: lit ? "7px" : "2.5px",
                  height: lit ? "2px" : "6px",
                  borderRadius: lit ? "1px" : "2px",

                  background: lit
                    ? `
                      linear-gradient(
                        90deg,
                        rgb(var(--pin-light,var(--c-f4f8fd,244,248,253))) 0%,
                        rgb(var(--c-f4f8fd,244,248,253)) 35%,
                        rgb(var(--c-d7e2f0,215,226,240)) 70%,
                        rgb(var(--c-253f64,37,63,100)) 100%
                      )
                    `
                    : `
                      linear-gradient(
                        180deg,
                        rgb(var(--c-5f86b5,95,134,181)) 0%,
                        rgb(var(--c-34547f,52,84,127)) 50%,
                        rgb(var(--c-1a2c45,26,44,69)) 100%
                      )
                    `,

                  boxShadow: lit
                    ? `
                      0 0 4px rgba(var(--c-f4f8fd,244,248,253),0.7),
                      0 0 8px rgba(var(--c-c8ebff,200,235,255),0.45),
                      0 0 12px rgba(var(--c-c8ebff,200,235,255),0.25)
                    `
                    : `
                      0 0 2px rgba(var(--c-c8ebff,200,235,255),0.3)
                    `,

                  opacity: lit ? 1 : 0.75,
                }}
              />
            </div>
          ))}
        </div>

        {/* =================================================
            ORTA KESİK (KEY NOTCH) — gerçek IDC/şerit kablo
            konnektörlerindeki gibi, dış kenarın ortasında yuva.
            Kesik boşluğu zemin renginde; kenarlarında metal kalınlığı
            hissi veren ince ışık/gölge çizgileri var.
        ================================================= */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: 0,
            top: "50%",
            width: `${NOTCH_W}px`,
            height: `${NOTCH_H}px`,
            transform: "translateY(-50%)",
            background: "rgba(var(--c-0e1828,14,24,40),0.96)",
            borderTop: "1px solid rgba(var(--c-000000,0,0,0),0.7)",
            borderBottom: `1px solid rgba(${lit ? "var(--c-f5fbff,245,251,255),0.45" : "var(--c-c8ebff,200,235,255),0.3"})`,
            borderRight: `1px solid rgba(${lit ? "var(--c-c8ebff,200,235,255),0.6" : "var(--c-c8ebff,200,235,255),0.45"})`,
            borderRadius: "0 2px 2px 0",
            boxShadow: "inset 2px 0 4px rgba(var(--c-000000,0,0,0),0.8)",
            transition: "border-color 700ms",
          }}
        />
        {/* Kesiğin karşısında, iç panelde ince ayraç çizgisi */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: "8px",
            right: "8px",
            top: "50%",
            height: "1px",
            background: lit
              ? "rgba(var(--c-c8ebff,200,235,255),0.45)"
              : "rgba(var(--c-c8ebff,200,235,255),0.2)",
          }}
        />

        {/* İç Çerçeve Çizgileri */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: "8px",
            right: "8px",
            top: "10px",
            height: "1px",
            background: lit
              ? "rgba(var(--c-c8ebff,200,235,255),0.5)"
              : "rgba(var(--c-c8ebff,200,235,255),0.25)",
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            left: "8px",
            right: "8px",
            bottom: "10px",
            height: "1px",
            background: lit
              ? "rgba(var(--c-c8ebff,200,235,255),0.5)"
              : "rgba(var(--c-c8ebff,200,235,255),0.25)",
          }}
        />
      </div>
    </div>
  );
}
