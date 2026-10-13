"use client";

import { useId, type CSSProperties } from "react";
import type { Trace } from "./ChipLayout";
// Giriş animasyonu yardımcısı (components/ui/intro.tsx).
// Bileşenin kendi `intro` prop’u ile çakışmasın diye `introStyle` adıyla alınır.
import { intro as introStyle } from "./Intro";

/**
 * Aynı çizgiler 3 katmanda çizilir, böylece çipten çıkıp camın
 * arkasından geçiyormuş gibi görünür:
 *  - "back"  : zemin üstü, cam panelin ALTINDA → sadece panel dışındaki
 *              kenarlarda net görünür
 *  - "glass" : cam panelin İÇİNDE, hafif bulanık ve soluk → "camın
 *              arkasından" görünen kısım
 *  - "front" : içeriğin üstünde, sadece çipin çevresinde net (radial mask)
 *              → çizgiler çipten net çıkar, uzaklaştıkça cama gömülür
 */
type Variant = "back" | "glass" | "front";

type CircuitTracesProps = {
  traces: Trace[];
  width: number;
  height: number;
  variant: Variant;
  powered?: boolean;
  /** "front" için: netliğin korunacağı merkez ve yarıçap */
  focus?: { x: number; y: number; r: number };
  style?: CSSProperties;
  /** Giriş animasyonu: çizgiler çipten dışarı doğru çizilir.
   *  delay = başlangıç (sn), stagger = çizgiler arası gecikme (sn) */
  intro?: { delay: number; stagger: number };
};

/* Çizgiler yazılarla aynı açık turkuaz tonda; ince ve belli belirsiz */
const GOLD = "168,238,246"; // yazı rengi (#a8eef6)
const GOLD_LIGHT = "214,250,255";

const LOOK: Record<
  Variant,
  { line: number; width: number; blur: number; pulse: number }
> = {
  back: { line: 0.12, width: 0.15, blur: 0, pulse: 0.3 },
  glass: { line: 0.12, width: 0.15, blur: 0, pulse: 0.3 },
  front: { line: 0.22, width: 0.18, blur: 0, pulse: 0.45 },
};

export default function CircuitTraces({
  traces,
  width,
  height,
  variant,
  powered = false,
  focus,
  style,
  intro,
}: CircuitTracesProps) {
  /* i. çizginin çizilme animasyonu */
  const draw = (i: number): CSSProperties | undefined =>
    intro
      ? introStyle("introDraw", intro.delay + i * intro.stagger, 1.1)
      : undefined;
  /* çizgi bitince beliren uç pedi / darbe */
  const after = (i: number): CSSProperties | undefined =>
    intro
      ? introStyle("introFade", intro.delay + i * intro.stagger + 0.9, 0.4)
      : undefined;

  const id = useId().replace(/:/g, "");
  const look = LOOK[variant];
  const lineAlpha = Math.min(1, look.line * (powered ? 1.3 : 1));

  return (
    <>
      <svg
        aria-hidden
        className="pointer-events-none absolute"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          overflow: "visible",
          filter: look.blur ? `blur(${look.blur}px)` : undefined,
          ...style,
        }}
      >
        <defs>
          <style>{`
          @keyframes traceFlow {
            from { stroke-dashoffset: 0; }
            to   { stroke-dashoffset: -1000; }
          }
          .trace-pulse { animation: traceFlow 4s linear infinite; }
          @media (prefers-reduced-motion: reduce) {
            .trace-pulse { animation: none; opacity: 0; }
          }
        `}</style>

          {focus && (
            <>
              <radialGradient
                id={`fade-${id}`}
                gradientUnits="userSpaceOnUse"
                cx={focus.x}
                cy={focus.y}
                r={focus.r}
              >
                <stop offset="0" stopColor="white" />
                <stop offset="0.5" stopColor="white" />
                <stop offset="1" stopColor="black" />
              </radialGradient>
              <mask
                id={`mask-${id}`}
                maskUnits="userSpaceOnUse"
                x={-50}
                y={-50}
                width={width + 100}
                height={height + 100}
              >
                <rect
                  x={-50}
                  y={-50}
                  width={width + 100}
                  height={height + 100}
                  fill={`url(#fade-${id})`}
                />
              </mask>
            </>
          )}
        </defs>

        <g
          mask={focus ? `url(#mask-${id})` : undefined}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {traces.map((t, i) => (
            <g key={i}>
              {/* İnce ana çizgi */}
              <path
                d={t.d}
                pathLength={1}
                strokeDasharray={intro ? 1 : undefined}
                stroke={`rgba(${GOLD},${lineAlpha})`}
                strokeWidth={look.width}
                style={{ transition: "stroke 700ms", ...draw(i) }}
              />

              {/* Pin çıkışındaki küçük altın lehim noktası */}
              <circle
                cx={t.start[0]}
                cy={t.start[1]}
                r={0.8}
                fill={`rgba(${GOLD_LIGHT},${variant === "front" ? 0.45 : 0.25})`}
                style={
                  draw(i) &&
                  introStyle(
                    "introFade",
                    (intro?.delay ?? 0) + i * (intro?.stagger ?? 0),
                    0.3,
                  )
                }
              />

              {/* Uçtaki bağlantı pedi */}
              {t.pad && (
                <circle
                  cx={t.end[0]}
                  cy={t.end[1]}
                  r={2}
                  stroke={`rgba(${GOLD},${Math.min(1, lineAlpha + 0.15)})`}
                  strokeWidth={look.width}
                  style={after(i)}
                />
              )}
            </g>
          ))}
        </g>
      </svg>

      {/* AKIM DARBELERİ — ayrı, maskesiz ve kendi katmanında bir SVG.
        PERFORMANS: darbeler ana (maskeli/bulanık) çizimin içindeyken her
        karede bütün katman yeniden çiziliyordu; burada yalnızca bu ince
        katman güncellenir. Bulanık katmanlarda (arka/cam) darbe yok ve
        her iki izden birinde darbe var. */}
      {powered && !look.blur && (
        <svg
          aria-hidden
          className="pointer-events-none absolute"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ overflow: "visible", willChange: "transform", ...style }}
        >
          <g fill="none" strokeLinecap="round">
            {traces.map((t, i) =>
              t.pulse && i % 2 === 0 ? (
                <g key={i} style={after(i)}>
                  <path
                    d={t.d}
                    pathLength={1000}
                    className="trace-pulse"
                    stroke={`rgba(${GOLD_LIGHT},${look.pulse})`}
                    strokeWidth={look.width + 0.5}
                    strokeDasharray="40 960"
                    style={{
                      animationDuration: `${3.2 + (i % 3) * 0.9}s`,
                      animationDelay: `${-i * 0.7}s`,
                    }}
                  />
                </g>
              ) : null,
            )}
          </g>
        </svg>
      )}
    </>
  );
}
