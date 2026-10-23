"use client";

import { useId, type CSSProperties } from "react";

/* ================================================================
   ROADMAP — NEHRİN SAĞINDA OTURAN KİŞİ
   Projects'teki oturma animasyonunun aynısı (zeynep-oturma.png,
   dizden sallanan baldırlar). Burada fan göbeğinin yerine dev bir
   cam YAKA KARTININ (ID tag) üst kenarına oturur: kart ipinden
   hafifçe sallanır, ayakları kartın önünden sarkar.
   Yetenekler panelinin tam karşısında.
================================================================ */

/* GÖRSEL — ProjectsSection ile aynı ölçüler (public/images/zeynep-oturma.webp) */
const SIT_SRC = "/images/zeynep-oturma.webp";
const SIT_W = 1584;
const SIT_H = 672;
const SIT_CX = 795;
const SIT_TOP = 28;
const SIT_PERSON_H = 632;
/** oturma çizgisi (uyluk) kişinin boyuna oranla */
const SIT_SEAT = (410 - SIT_TOP) / SIT_PERSON_H;

/* KART GEOMETRİSİ (viewBox birimi; kart 400 birim genişliğinde) */
const CARD_W = 400;
const CARD_H = 250;
const CARD_R = 22;
/** ipin karta bağlandığı klips (sol üst) */
const CLIP_X = 74;
/** kişinin boyu ve kartın üstündeki yatay yeri (sağda: yazılar solda kalır) */
const PERSON_H = 236;
const PERSON_X = 312;

/* KART YAZILARI — istediğin gibi değiştir */
const CARD = {
  header: "ACCESS CARD",
  level: "LVL · FULL STACK",
  name: "ZEYNEP DELİ",
  role: "FULL STACK DEVELOPER",
  stack: "React · Next.js · React Native · Node.js",
  id: "ID · ZD-2026",
  status: "ACCESS GRANTED",
};

/** Görünür alan: kişinin başı üstte, kartın gölgesi altta */
const VB = { x: -30, y: -PERSON_H * SIT_SEAT - 18, w: CARD_W + 60, h: 0 };
VB.h = CARD_H + 40 - VB.y;
/** yükseklik / genişlik oranı (yerleşim için) */
export const PERCH_ASPECT = VB.h / VB.w;

/* barkod çizgileri: [x, genişlik] (deterministik) */
const BARCODE: [number, number][] = (() => {
  const out: [number, number][] = [];
  let x = 0;
  let s = 7;
  while (x < 150) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const w = 1 + (s % 4);
    out.push([x, w]);
    x += w + 1 + ((s >> 3) % 3);
  }
  return out;
})();

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const ICE = "rgb(var(--c-a8eef6,168,238,246))";
const ICE_DIM = "rgba(var(--c-a8eef6,168,238,246),.6)";
const EDGE = "rgb(var(--c-46beff,70,190,255))";
const GOLD = "#ffe4aa";

const PERCH_CSS = `
  /* kart ipinden aşağı iner, yaylanarak durur */
  @keyframes rpCardIn {
    0%   { opacity: 0; transform: translateY(-140px); filter: blur(8px) brightness(2); }
    45%  { opacity: 1; filter: blur(0) brightness(1.3); }
    62%  { transform: translateY(14px); }
    80%  { transform: translateY(-5px); }
    100% { opacity: 1; transform: none; filter: none; }
  }
  /* ipte hafif sallanma (kişi de kartla birlikte) */
  @keyframes rpSway {
    0%, 100% { transform: rotate(-1.6deg); }
    50%      { transform: rotate(1.6deg); }
  }
  /* kişi: nehrin sağ alt çıkışından sıçrayıp kartın üstüne oturur */
  @keyframes rpHopX {
    0%   { transform: translateX(140px); }
    100% { transform: translateX(0); }
  }
  @keyframes rpHopY {
    0%   { transform: translateY(220px) scale(.7); opacity: 0; }
    15%  { opacity: 1; }
    60%  { transform: translateY(-70px) scale(1.02); }
    82%  { transform: translateY(6px) scale(1, .97); }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes rpRing {
    0%   { transform: scale(.3); opacity: 0; }
    1%   { opacity: .9; }
    100% { transform: scale(1.8); opacity: 0; }
  }
  /* holografik parlama kartın üstünden geçer */
  @keyframes rpShine {
    0%, 55% { transform: translateX(-220px) skewX(-20deg); }
    100%    { transform: translateX(${CARD_W + 120}px) skewX(-20deg); }
  }
  /* ACCESS GRANTED: kart oturunca yanar, sonra nabız gibi atar */
  @keyframes rpGrant {
    0%, 60% { opacity: 0; }
    70%     { opacity: 1; }
    76%     { opacity: .3; }
    84%, 100% { opacity: 1; }
  }
  @keyframes rpPulse { 50% { opacity: .45; } }

  .rp-sway  { transform-box: view-box; transform-origin: ${CLIP_X}px -600px;
              animation: rpSway 5s ease-in-out 1.6s infinite; }
  .rp-card  { animation: rpCardIn 1s cubic-bezier(.2,.7,.3,1) both; }
  .rp-hopx  { animation: rpHopX .75s cubic-bezier(.3,.1,.3,1) .7s both; }
  .rp-hopy  { animation: rpHopY .75s cubic-bezier(.3,0,.4,1) .7s both; }
  .rp-ring  { transform-box: fill-box; transform-origin: center;
              animation: rpRing .8s ease-out 1.4s both; }
  .rp-shine { animation: rpShine 6s ease-in-out 1.8s infinite both; }
  .rp-grant { animation: rpGrant 2.4s linear both; }
  .rp-pulse { animation: rpPulse 1.6s ease-in-out 2.4s infinite; }

  /* hazır hal: giriş animasyonları yok */
  .rp-instant .rp-card, .rp-instant .rp-hopx, .rp-instant .rp-hopy,
  .rp-instant .rp-grant { animation: none !important; }
  .rp-instant .rp-ring { animation: none !important; opacity: 0; }

  @media (prefers-reduced-motion: reduce) {
    .rp-sway, .rp-card, .rp-hopx, .rp-hopy, .rp-ring, .rp-shine, .rp-grant, .rp-pulse {
      animation: none !important;
    }
    .rp-ring, .rp-shine { opacity: 0; }
  }
`;

type Props = {
  /** true: giriş animasyonları oynamaz, kart ve kişi hazır durur
      (sallanma, ayak sallama ve parlama sürer) */
  instant?: boolean;
  /** sahnedeki genişlik (px) — kartın genişliği buna göre */
  width: number;
  left: number;
  top: number;
};

export default function RoadmapPerch({
  width,
  left,
  top,
  instant = false,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `${uid}-${n}`;
  const url = (n: string) => `url(#${id(n)})`;
  const height = width * PERCH_ASPECT;

  /* kişinin oturma çizgisi kartın üst kenarına (y = 0) gelir */
  const personCy = PERSON_H * (0.5 - SIT_SEAT);

  return (
    <div
      className={`pointer-events-none absolute ${instant ? "rp-instant" : ""}`}
      style={{ left, top, width, height }}
      aria-hidden
    >
      <style>{PERCH_CSS}</style>

      <svg
        viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
        className="absolute inset-0 size-full overflow-visible"
      >
        <defs>
          <linearGradient id={id("glass")} x1="0" y1="0" x2="1" y2="1">
            {/* yarı saydam cam — yol haritasındaki yetenek etiketleriyle
                aynı ton (rgba(6,22,46,.72)): arkadaki nehir/zemin görünür */}
            <stop offset="0" stopColor="rgb(6,22,46)" stopOpacity=".55" />
            <stop offset=".55" stopColor="rgb(6,22,46)" stopOpacity=".64" />
            <stop offset="1" stopColor="rgb(6,22,46)" stopOpacity=".72" />
          </linearGradient>
          <linearGradient id={id("rim")} x1="0" y1="0" x2="1" y2="1">
            <stop
              offset="0"
              stopColor="rgb(var(--c-cfe6ff,207,230,255))"
              stopOpacity=".8"
            />
            <stop offset=".4" stopColor={EDGE} stopOpacity=".3" />
            <stop offset="1" stopColor={EDGE} stopOpacity=".65" />
          </linearGradient>
          <linearGradient id={id("spec")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".14" />
            <stop offset=".32" stopColor="#fff" stopOpacity=".03" />
            <stop offset=".33" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          {/* ip: yukarı doğru sönerek kaybolur */}
          <linearGradient id={id("strap")} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={EDGE} stopOpacity=".75" />
            <stop offset=".6" stopColor={EDGE} stopOpacity=".25" />
            <stop offset="1" stopColor={EDGE} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id("chip")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff3d6" />
            <stop offset=".45" stopColor="#d9b777" />
            <stop offset="1" stopColor="#8a6a34" />
          </linearGradient>
          <linearGradient id={id("shineG")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#cfe6ff" stopOpacity=".22" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
          <filter id={id("glow")} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id={id("card")}>
            <rect width={CARD_W} height={CARD_H} rx={CARD_R} />
          </clipPath>
        </defs>

        <g className="rp-sway">
          <g className="rp-card">
            {/* ---------------- İP + KLİPS ---------------- */}
            <rect
              x={CLIP_X - 7}
              y={-700}
              width={14}
              height={690}
              rx={3}
              fill={url("strap")}
            />
            <rect
              x={CLIP_X - 13}
              y={-16}
              width={26}
              height={24}
              rx={5}
              fill="#0a1d3a"
              stroke="rgb(var(--c-cfe6ff,207,230,255))"
              strokeOpacity=".55"
            />
            <rect
              x={CLIP_X - 5}
              y={-8}
              width={10}
              height={8}
              rx={2}
              fill="#020a18"
            />

            {/* ---------------- KART ---------------- */}
            {/* arkadaki yumuşak ışık */}
            <rect
              x={-8}
              y={-8}
              width={CARD_W + 16}
              height={CARD_H + 16}
              rx={CARD_R + 8}
              fill={EDGE}
              opacity=".08"
              filter={url("soft")}
            />
            <rect
              width={CARD_W}
              height={CARD_H}
              rx={CARD_R}
              fill={url("glass")}
              stroke={url("rim")}
              strokeWidth="1.6"
            />

            <g clipPath={url("card")}>
              {/* ip deliği (klipsin altında) */}
              <rect
                x={CLIP_X - 20}
                y={14}
                width={40}
                height={8}
                rx={4}
                fill="#010712"
                stroke={EDGE}
                strokeOpacity=".35"
              />

              {/* altın kontak çipi */}
              <g transform="translate(26 40)">
                <rect width={46} height={36} rx={7} fill={url("chip")} />
                <path
                  d="M 0 12 H 14 V 0 M 0 24 H 14 V 36 M 46 12 H 32 V 0 M 46 24 H 32 V 36 M 14 12 H 32 M 14 24 H 32"
                  fill="none"
                  stroke="#6b5226"
                  strokeOpacity=".6"
                  strokeWidth="1.2"
                />
              </g>

              {/* başlık */}
              <text
                x={86}
                y={55}
                fontFamily={MONO}
                fontSize="11"
                letterSpacing="2.5"
                fill={ICE_DIM}
              >
                {CARD.header}
              </text>
              <text
                x={86}
                y={72}
                fontFamily={MONO}
                fontSize="11"
                letterSpacing="1.5"
                fill={GOLD}
              >
                {CARD.level}
              </text>

              {/* isim + rol + stack */}
              <text
                x={26}
                y={130}
                fontFamily="var(--font-display), ui-sans-serif, system-ui"
                fontWeight="700"
                fontSize="33"
                letterSpacing="1.5"
                fill={ICE}
                filter={url("glow")}
              >
                {CARD.name}
              </text>
              <text
                x={26}
                y={154}
                fontFamily={MONO}
                fontSize="12.5"
                letterSpacing="2.2"
                fill={EDGE}
              >
                {CARD.role}
              </text>
              <text
                x={26}
                y={178}
                fontFamily={MONO}
                fontSize="10.5"
                fill={ICE_DIM}
              >
                {CARD.stack}
              </text>

              <line
                x1={26}
                x2={CARD_W - 26}
                y1={194}
                y2={194}
                stroke={EDGE}
                strokeOpacity=".22"
              />

              {/* barkod + kimlik no */}
              <g transform="translate(26 204)" fill={ICE} opacity=".7">
                {BARCODE.map(([x, w]) => (
                  <rect key={x} x={x} y={0} width={w} height={22} />
                ))}
              </g>
              <text
                x={26}
                y={240}
                fontFamily={MONO}
                fontSize="8.5"
                letterSpacing="2"
                fill={ICE_DIM}
              >
                {CARD.id}
              </text>

              {/* durum */}
              <g className="rp-grant">
                <circle
                  className="rp-pulse"
                  cx={232}
                  cy={218}
                  r={4.5}
                  fill="#7dffb0"
                  filter={url("glow")}
                />
                <text
                  x={244}
                  y={222}
                  fontFamily={MONO}
                  fontSize="11.5"
                  letterSpacing="1.8"
                  fill="#7dffb0"
                  filter={url("glow")}
                >
                  {CARD.status}
                </text>
              </g>

              {/* ayakların karta düşen gölgesi */}
              <ellipse
                cx={PERSON_X}
                cy={30}
                rx={44}
                ry={56}
                fill="#000"
                opacity=".35"
                filter={url("soft")}
              />

              {/* holografik parlama */}
              <rect
                className="rp-shine"
                x={0}
                y={-20}
                width={120}
                height={CARD_H + 40}
                fill={url("shineG")}
              />
            </g>

            {/* cam parlaması + üst kenar ışığı (oturduğu yer) */}
            <rect
              width={CARD_W}
              height={CARD_H}
              rx={CARD_R}
              fill={url("spec")}
            />
            <line
              x1={CARD_R}
              x2={CARD_W - CARD_R}
              y1={0.8}
              y2={0.8}
              stroke="rgb(var(--c-cfe6ff,207,230,255))"
              strokeOpacity=".7"
              strokeWidth="1.4"
            />
          </g>

          {/* ---------------- KİŞİ ---------------- */}
          <g transform={`translate(${PERSON_X} 0)`}>
            {/* oturma anı: üst kenarda yayılan halka */}
            <ellipse
              className="rp-ring"
              cx={0}
              cy={2}
              rx={70}
              ry={12}
              fill="none"
              stroke={GOLD}
              strokeWidth="2"
              filter={url("glow")}
            />
            <g className="rp-hopx">
              <g className="rp-hopy" style={{ transformOrigin: "0px 0px" }}>
                <SwingingLegs
                  personH={PERSON_H}
                  cy={personCy}
                  uid={id("legs")}
                />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ================================================================
   OTURAN KİŞİ — AYAK SALLAMA (ProjectsSection ile aynı)
================================================================ */
const SIT_LEGS: {
  poly: [number, number][];
  cut: [number, number][];
  pivot: [number, number];
  amp: number;
  delay: string;
}[] = [
  {
    poly: [
      [726, 415],
      [794, 415],
      [794, 580],
      [792, 664],
      [742, 664],
      [732, 580],
    ],
    cut: [
      [728, 440],
      [794, 440],
      [794, 580],
      [792, 664],
      [742, 664],
      [732, 580],
    ],
    pivot: [760, 428],
    amp: 13,
    delay: "0s",
  },
  {
    poly: [
      [794, 415],
      [862, 415],
      [858, 580],
      [842, 664],
      [794, 664],
      [794, 580],
    ],
    cut: [
      [794, 440],
      [860, 440],
      [858, 580],
      [842, 664],
      [794, 664],
      [794, 580],
    ],
    pivot: [828, 428],
    amp: 13,
    delay: "-0.55s",
  },
];
const LEG_SWING_S = 1.1;

function SwingingLegs({
  personH,
  cy = 0,
  uid,
}: {
  personH: number;
  cy?: number;
  uid: string;
}) {
  const k = personH / SIT_PERSON_H;
  const ox = -SIT_CX * k;
  const oy = cy - personH / 2 - SIT_TOP * k;
  const P = ([x, y]: [number, number]) => `${ox + x * k},${oy + y * k}`;
  const img = (
    <image
      href={SIT_SRC}
      x={ox}
      y={oy}
      width={SIT_W * k}
      height={SIT_H * k}
      preserveAspectRatio="none"
    />
  );
  const big = {
    x: ox - 50,
    y: oy - 50,
    w: SIT_W * k + 100,
    h: SIT_H * k + 100,
  };
  return (
    <>
      <defs>
        <mask
          id={`${uid}-body`}
          maskUnits="userSpaceOnUse"
          x={big.x}
          y={big.y}
          width={big.w}
          height={big.h}
        >
          <rect x={big.x} y={big.y} width={big.w} height={big.h} fill="#fff" />
          {SIT_LEGS.map((l, i) => (
            <polygon key={i} points={l.cut.map(P).join(" ")} fill="#000" />
          ))}
        </mask>
        {SIT_LEGS.map((l, i) => (
          <clipPath key={i} id={`${uid}-leg${i}`}>
            <polygon points={l.poly.map(P).join(" ")} />
          </clipPath>
        ))}
      </defs>

      <g mask={`url(#${uid}-body)`}>{img}</g>

      {SIT_LEGS.map((l, i) => {
        const [px, py] = P(l.pivot).split(",");
        /* SVG <animateTransform> yerine CSS animasyonu: gizli bölümde
           durabilir (SMIL hiç durmuyordu) */
        const swing = {
          transformBox: "view-box",
          transformOrigin: `${px}px ${py}px`,
          "--a0": `${-l.amp}deg`,
          "--a1": `${l.amp}deg`,
          animation: `svgLegSwing ${LEG_SWING_S / 2}s cubic-bezier(.45,0,.55,1) ${l.delay} infinite alternate`,
        } as CSSProperties;
        return (
          <g key={i} style={swing}>
            <g clipPath={`url(#${uid}-leg${i})`}>{img}</g>
          </g>
        );
      })}
    </>
  );
}
