import type { LucideIcon } from "lucide-react";
import {
  GLASS_EDGE,
  GLASS_EDGE_GOLD,
  glassShadow,
  glassSurface,
  glassSpecular,
} from "@/components/ui/Glass";

/* Palet — sitenin geri kalanıyla aynı */
const ICE = "168,238,246"; // poster turkuazı (metin)
const ICE_DIM = "95,184,208"; // pasif metin
const GOLD_LIGHT = "255,228,170";

type RoadmapNodeProps = {
  nodeNumber: number;
  icon: LucideIcon;
  title: string;
  tags: string;
  collected: boolean;
  /** Telefon: küçük, metni sarabilen kart */
  compact?: boolean;
};

/**
 * Nehir üzerindeki yetenek durağı.
 * - Toplanmamış: soluk, küçük, camgöbeği kenarlı cam
 * - Toplanmış: tam boy, altın kalınlıklı cam + altın parlama
 *   (menüdeki aktif buton ve çip çizgileriyle aynı dil)
 */
export default function RoadmapNode({
  nodeNumber,
  icon: Icon,
  title,
  tags,
  collected,
  compact = false,
}: RoadmapNodeProps) {
  const edge = collected ? GLASS_EDGE_GOLD : GLASS_EDGE;

  return (
    <div
      className={`relative flex items-center rounded-[14px] transition-all duration-500 ${
        compact
          ? "w-max max-w-full gap-2.5 py-2 pl-2 pr-3"
          : "w-max gap-4 whitespace-nowrap py-3 pl-3 pr-5"
      }`}
      style={{
        opacity: collected ? 1 : 0.55,
        transform: collected ? "scale(1)" : "scale(0.92)",
        background: glassSurface("6,22,46", collected ? 0.6 : 0.45),
        border: `1px solid rgba(255,255,255,${collected ? 0.4 : 0.2})`,
        boxShadow: glassShadow({
          depth: 5,
          edge,
          glow: collected ? 0.45 : 0.15,
        }),
        /* backdrop-filter yok: arkadaki nehir sürekli hareket ettiği için
           her karede yeniden bulanıklaştırılıyordu (ağır) */
      }}
    >
      {/* Speküler parlama */}
      <span style={glassSpecular({ w: 40, h: 4 }, { right: 18, top: 4 })} />

      {/* İkon kutusu — içe gömülü koyu cam */}
      <div
        className={`flex shrink-0 items-center justify-center rounded-[10px] transition-all duration-500 ${compact ? "h-10 w-10" : "h-14 w-14"}`}
        style={{
          background: `
            linear-gradient(180deg,
              rgba(255,255,255,0.08) 0%,
              rgba(255,255,255,0.02) 45%,
              rgba(${edge},0.12) 100%),
            rgba(4,16,36,0.6)
          `,
          border: `1px solid rgba(${edge},${collected ? 0.6 : 0.25})`,
          boxShadow: `
            inset 0 2px 5px rgba(0,0,0,0.5),
            inset 0 -8px 14px rgba(${edge},${collected ? 0.28 : 0.1}),
            0 0 ${collected ? 18 : 0}px rgba(${edge},0.4)
          `,
        }}
      >
        <Icon
          size={compact ? 18 : 24}
          strokeWidth={1.6}
          style={{
            color: collected ? `rgb(${GOLD_LIGHT})` : `rgba(${ICE_DIM},0.75)`,
            filter: collected
              ? `drop-shadow(0 0 6px rgba(${GLASS_EDGE_GOLD},0.9))`
              : "none",
            transition: "color 500ms, filter 500ms",
          }}
        />
      </div>

      {/* Metin */}
      <div className="flex min-w-0 flex-col">
        <span
          className={`font-mono tracking-[.12em] ${compact ? "text-[9px]" : "text-[11px]"}`}
          style={{
            color: collected
              ? `rgba(${GLASS_EDGE_GOLD},0.9)`
              : `rgba(${ICE_DIM},0.7)`,
          }}
        >
          [NODE {String(nodeNumber).padStart(2, "0")}]
        </span>
        <span
          className={`font-mono font-bold ${compact ? "text-[13px] leading-tight" : "text-lg"}`}
          style={{
            color: `rgb(${ICE})`,
            textShadow: collected ? `0 0 8px rgba(${GLASS_EDGE},0.55)` : "none",
            transition: "text-shadow 500ms",
          }}
        >
          {title}
        </span>
        <span
          className={`font-mono ${compact ? "text-[10px] leading-tight" : "text-sm"}`}
          style={{ color: `rgba(${ICE_DIM},0.85)` }}
        >
          {tags}
        </span>
      </div>
    </div>
  );
}
