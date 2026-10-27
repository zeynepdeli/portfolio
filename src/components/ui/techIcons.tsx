import type { ElementType } from "react";
import {
  SiReact,
  SiNextdotjs,
  SiAstro,
  SiJavascript,
  SiTypescript,
  SiHtml5,
  SiCss,
  SiSass,
  SiRedux,
  SiExpo,
  SiTailwindcss,
  SiNodedotjs,
  SiExpress,
  SiNestjs,
  SiPostgresql,
  SiPrisma,
  SiFirebase,
  SiMongodb,
  SiGit,
  SiOwasp,
  SiBootstrap,
} from "react-icons/si";
import { TbApi, TbDevices, TbGauge, TbPalette } from "react-icons/tb";

/* =========================================================
   TEKNOLOJİ LOGOLARI — yetenek adından logo(lar)
   Logolar TEK RENK çizilir (sitenin turkuazı; yazının rengini alır),
   anakart temasıyla bütün dursun diye. Birden çok teknoloji içeren
   satırlarda ("JavaScript · TypeScript") her birinin logosu yan yana.
   Logosu olmayan genel kavramlara anlamlı simge.
   Eşleşme küçük harfli ada göre (Türkçe ve İngilizce adlar).
========================================================= */
const RULES: [RegExp, ElementType][] = [
  [/react native/, SiReact],
  [/react(?! native)/, SiReact],
  [/next\.?js/, SiNextdotjs],
  [/astro/, SiAstro],
  [/javascript/, SiJavascript],
  [/typescript/, SiTypescript],
  [/html/, SiHtml5],
  [/css3|\bcss\b/, SiCss],
  [/scss|sass/, SiSass],
  [/redux/, SiRedux],
  [/expo/, SiExpo],
  [/nativewind|tailwind/, SiTailwindcss],
  [/bootstrap/, SiBootstrap],
  [/node\.?js/, SiNodedotjs],
  [/express/, SiExpress],
  [/nestjs/, SiNestjs],
  [/rest api/, TbApi],
  [/postgres/, SiPostgresql],
  [/prisma/, SiPrisma],
  [/firebase/, SiFirebase],
  [/nosql|mongo/, SiMongodb],
  [/\bgit\b/, SiGit],
  [/ui (tasarım|design)/, TbPalette],
  [/responsive/, TbDevices],
  [/performan/, TbGauge],
  [/owasp/, SiOwasp],
];

/** Adın içindeki teknolojilerin logoları (sırasıyla, en fazla 2: dar ekranda yazıya yer kalsın) */
export function techIcons(name: string): ElementType[] {
  const n = name.toLocaleLowerCase("en");
  const out: ElementType[] = [];
  /* adın içindeki sıraya göre: her kuralın ilk geçtiği yer */
  const hits: [number, ElementType][] = [];
  for (const [re, Icon] of RULES) {
    const m = n.match(re);
    if (m && m.index !== undefined && !hits.some(([, I]) => I === Icon))
      hits.push([m.index, Icon]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  for (const [, Icon] of hits) if (out.length < 2) out.push(Icon);
  return out;
}

/** Logoları yazının solunda, yazının renginde gösterir */
export function TechLogos({
  name,
  size,
  gap = 3,
  className = "",
}: {
  name: string;
  size: number;
  gap?: number;
  className?: string;
}) {
  const icons = techIcons(name);
  if (!icons.length) return null;
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center ${className}`}
      style={{ gap }}
    >
      {icons.map((Icon, i) => (
        <Icon key={i} style={{ width: size, height: size }} />
      ))}
    </span>
  );
}
