/* =====================================================
   KALIN CAM GÖRÜNÜMÜ — ortak yardımcılar
   Referans: şeffaf üst yüzey, parlak üst kenar, altta ve sağda
   renkli "cam kalınlığı" bandı, ışık sızan iç kenar ve küçük
   bir speküler parlama.
===================================================== */

import type { CSSProperties } from "react";

/** Cam kalınlığının rengi (canlı camgöbeği / teal) */
export const GLASS_EDGE = "215,226,240"; // buzlu beyaz (tozlu mavi paleti; aktif vurgu GLASS_EDGE_GOLD)
/** Aktif durum için daha parlak altın cam kenarı */
export const GLASS_EDGE_GOLD = "var(--glass-gold,90,143,208)";

/** true: İNCE CAM — kalınlık bandı, alttan/yanlardan yayılan renkli
 *  parlama ve iç renkli ışık sızması yok. Sadece üst kenar yansıması,
 *  ince kontur ve hafif nötr gölge. Kalın cama dönmek için false. */
export const THIN_GLASS = true;

type GlassOptions = {
  /** Cam kalınlığı (px): altta görünen renkli bandın yüksekliği */
  depth?: number;
  /** Kenar rengi "r,g,b" */
  edge?: string;
  /** Dış parlama gücü 0–1 */
  glow?: number;
  /** Altına düşen koyu gölge */
  drop?: boolean;
  /** Eleman ekranda döndürülmüşse (derece) kalınlık bandı ve ışıklar yine
   *  ekranın altına/üstüne düşsün diye gölge yönleri ters çevrilir */
  angle?: number;
};

/** Kalın cam için box-shadow dizisi.
 *  Üst üste binen 1px'lik gölgeler cam kalınlığını (altta ve hafif sağda
 *  görünen bandı) oluşturur; alpha azalarak gittiği için band üstten aşağı
 *  koyulaşır, referanstaki gibi. */
export function glassShadow({
  depth = 6,
  edge = GLASS_EDGE,
  glow = 0.35,
  drop = true,
  angle = 0,
}: GlassOptions = {}): string {
  // Ekran yönündeki (x, y) ofsetini elemanın yerel yönüne çevir
  const t = (-angle * Math.PI) / 180;
  const o = (x: number, y: number) => {
    const rx = x * Math.cos(t) - y * Math.sin(t);
    const ry = x * Math.sin(t) + y * Math.cos(t);
    return `${rx.toFixed(2)}px ${ry.toFixed(2)}px`;
  };

  if (THIN_GLASS) {
    return [
      `inset ${o(0, 1)} 0 rgba(255,255,255,0.45)`,
      "inset 0 0 0 1px rgba(255,255,255,0.14)",
      ...(drop ? [`${o(0, 6)} 16px rgba(0,0,0,0.35)`] : []),
    ].join(",\n");
  }

  const band: string[] = [];
  for (let i = 1; i <= depth; i++) {
    const a = Math.max(0.25, 0.85 - (i / depth) * 0.45);
    band.push(`${o(i * 0.35, i)} 0 0 rgba(${edge},${a.toFixed(2)})`);
  }

  return [
    // üst kenar ve sol kenarda parlak cam yansıması
    `inset ${o(0, 1.5)} 0 rgba(255,255,255,0.85)`,
    `inset ${o(1, 0)} 0 rgba(255,255,255,0.35)`,
    // yüzeyin çevresinde ince beyaz kontur
    "inset 0 0 0 1px rgba(255,255,255,0.22)",
    // alt iç kenardan sızan renkli ışık
    `inset ${o(0, -10)} 22px rgba(${edge},0.22)`,
    // cam kalınlığı bandı
    ...band,
    // bandın altından yayılan parlama
    `${o(0, depth + 4)} 22px rgba(${edge},${glow})`,
    ...(drop ? [`${o(0, depth + 16)} 36px rgba(0,0,0,0.45)`] : []),
  ].join(",\n");
}

/** Cam üst yüzeyi: çok hafif beyaz buğu, üstten aşağı azalan parlaklık */
export function glassSurface(tint = "8,30,60", tintAlpha = 0.5): string {
  return `
    linear-gradient(180deg,
      rgba(255,255,255,0.16) 0%,
      rgba(255,255,255,0.05) 35%,
      rgba(255,255,255,0.02) 70%,
      rgba(${GLASS_EDGE},0.06) 100%),
    linear-gradient(135deg,
      rgba(${tint},${tintAlpha * 0.8}) 0%,
      rgba(${tint},${tintAlpha}) 60%,
      rgba(${tint},${Math.min(1, tintAlpha * 1.15)}) 100%)
  `;
}

/** Sağ üstteki küçük, eğik speküler parlama */
export function glassSpecular(
  size: { w: number; h: number },
  pos: CSSProperties,
): CSSProperties {
  return {
    position: "absolute",
    width: size.w,
    height: size.h,
    borderRadius: 999,
    background:
      "radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0))",
    transform: "rotate(-8deg)",
    filter: "blur(0.6px)",
    pointerEvents: "none",
    ...pos,
  };
}

/* =====================================================
   CAM OLMAYAN (METAL) GÖRÜNÜM — menü ve sosyal butonlar için
   "metal": opak, fırçalanmış lacivert metal; bulanıklık ve
            speküler parlama yok (footer'daki kasa parçaları gibi)
   "glass": önceki cam görünüm
===================================================== */
export const UI_STYLE: "metal" | "glass" = "glass";

/** Fırçalanmış metal yüzey.
 *  Renkler panel çerçevesiyle AYNI palet değişkenlerinden gelir; böylece
 *  menü ve sosyal butonlar seçili paletin tonunu alır (palet yoksa eski
 *  lacivert metal birebir). `light` > 0 açar, < 0 koyulaştırır. */
export function metalSurface(light = 0): string {
  const c = (v: string, fb: string) => {
    const base = `rgb(var(${v},${fb}))`;
    if (!light) return base;
    const pct = Math.min(100, Math.abs(light) / 2.55).toFixed(1);
    return `color-mix(in srgb, ${base}, ${light > 0 ? "white" : "black"} ${pct}%)`;
  };
  return `
    repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px),
    linear-gradient(180deg, ${c("--c-123d6e", "18,61,110")} 0%, ${c("--c-0a2850", "10,40,80")} 50%, ${c("--c-061a38", "6,26,56")} 100%)
  `;
}

/** Metal gövde gölgesi: üstte ince ışık, altta koyu kenar, altına düşen gölge */
export function metalShadow({
  lit = false,
  /* palet değişkeninden gelir; paletsiz klasik görünümde eski camgöbeği */
  glow = "var(--c-4fd8ff,79,216,255)",
} = {}): string {
  return [
    "inset 0 1px 0 rgba(var(--c-cfe6ff,207,230,255),0.35)",
    "inset 0 -2px 0 rgba(0,0,0,0.4)",
    "0 10px 22px rgba(0,0,0,0.45)",
    ...(lit ? [`0 0 16px rgba(${glow},0.35)`] : []),
  ].join(", ");
}
