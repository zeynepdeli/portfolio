function randomBinary(length: number) {
  return Array.from({ length }, () => (Math.random() > 0.5 ? "1" : "0")).join(
    "",
  );
}

const basePath =
  "M 40 120 C 200 80, 250 250, 420 220 C 600 190, 620 380, 800 400 C 900 410, 950 430, 980 460";

const LANES = [
  { offset: -30, size: 5, opacity: 0.3 },
  { offset: -22, size: 5.5, opacity: 0.4 },
  { offset: -14, size: 6.5, opacity: 0.6 },
  { offset: -7, size: 7.5, opacity: 0.8 },
  { offset: 0, size: 8.5, opacity: 1 },
  { offset: 7, size: 7.5, opacity: 0.8 },
  { offset: 14, size: 6.5, opacity: 0.6 },
  { offset: 22, size: 5.5, opacity: 0.4 },
  { offset: 30, size: 5, opacity: 0.3 },
];

export default function RoadmapPath() {
  return (
    <svg
      viewBox="0 0 1000 500"
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="pathGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7fd4ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#d5f2ff" stopOpacity="0.95" />
        </linearGradient>

        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Kahverengi devre deseni — tekrarlayan küçük kare/pcb motifi */}
        <pattern
          id="circuitPattern"
          width="60"
          height="60"
          patternUnits="userSpaceOnUse"
        >
          <rect width="60" height="60" fill="none" />
          <path
            d="M 0 30 H 20 V 10 H 40 V 30 H 60 M 30 0 V 20 M 30 40 V 60"
            fill="none"
            stroke="#8a6a4a"
            strokeWidth="1"
          />
          <circle cx="20" cy="10" r="2" fill="#8a6a4a" />
          <circle cx="40" cy="30" r="2" fill="#8a6a4a" />
        </pattern>
      </defs>

      {/* Arka plan: kahverengi devre dokusu, tüm alanı kaplar */}
      <rect
        x="0"
        y="0"
        width="1000"
        height="500"
        fill="url(#circuitPattern)"
        opacity="0.18"
      />

      {/* Nehir yatağı glow */}
      <path
        d={basePath}
        fill="none"
        stroke="#4fb8f0"
        strokeWidth="90"
        strokeOpacity="0.1"
        strokeLinecap="round"
      />

      {LANES.map((lane, i) => (
        <g key={i} transform={`translate(0, ${lane.offset})`}>
          <path id={`lane-${i}`} d={basePath} fill="none" />
          <text
            fontFamily="var(--font-mono), monospace"
            fontSize={lane.size}
            fill="url(#pathGlow)"
            opacity={lane.opacity}
            filter="url(#softGlow)"
          >
            <textPath href={`#lane-${i}`} startOffset="0%">
              {randomBinary(260)}
            </textPath>
          </text>
        </g>
      ))}
    </svg>
  );
}
