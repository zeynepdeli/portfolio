"use client";

/* =====================================================
   YAZILIM OBJELERİ — şeffaf panelin ARKASINDA, sade.
   Referanstaki iki yumurta gibi: biri koyu lacivert seramik
   (dalga desenli), diğeri şeffaf cam; üst üste binerek üst
   ortada duruyorlar. Altta solda tek küçük küre.
   (1440×900 tasarım alanı, ekrana "slice" ile oturur)
===================================================== */

const NAVY_DARK = "#14243f";
const NAVY = "#1f3558";
const STEEL = "#36557f";
const STEEL_LIGHT = "#5677a3";

export default function SoftwareObjects() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="so-ceramic" cx="32%" cy="28%" r="80%">
          <stop offset="0%" stopColor={STEEL_LIGHT} />
          <stop offset="45%" stopColor={STEEL} />
          <stop offset="100%" stopColor={NAVY_DARK} />
        </radialGradient>
        <radialGradient id="so-ceramic-dark" cx="30%" cy="25%" r="85%">
          <stop offset="0%" stopColor={STEEL} />
          <stop offset="50%" stopColor={NAVY} />
          <stop offset="100%" stopColor="#0d1a30" />
        </radialGradient>
        <linearGradient id="so-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.40)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.24)" />
        </linearGradient>
        <pattern
          id="so-waves"
          width="60"
          height="22"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 11 Q15 1 30 11 T60 11"
            fill="none"
            stroke="rgba(10,20,40,0.45)"
            strokeWidth="5"
          />
        </pattern>
        <filter id="so-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="18"
            stdDeviation="16"
            floodColor="#0a1426"
            floodOpacity="0.45"
          />
        </filter>
      </defs>

      {/* ---------- 1) Koyu lacivert seramik veritabanı (dalga desenli) ---------- */}
      <g transform="translate(590 190) rotate(-10)" filter="url(#so-shadow)">
        <path
          d="M-95 -55 L-95 55 A95 30 0 0 0 95 55 L95 -55 Z"
          fill="url(#so-ceramic-dark)"
        />
        <path
          d="M-95 -55 L-95 55 A95 30 0 0 0 95 55 L95 -55 Z"
          fill="url(#so-waves)"
        />
        <ellipse cx="0" cy="-55" rx="95" ry="30" fill={STEEL} />
        <ellipse
          cx="0"
          cy="-55"
          rx="95"
          ry="30"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
        />
        <path
          d="M-80 -20 Q-85 20 -78 50"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>

      {/* ---------- 2) Şeffaf cam terminal (öndeki cam yumurta gibi) ---------- */}
      <g transform="translate(735 245) rotate(8)" filter="url(#so-shadow)">
        <rect
          x="-120"
          y="-80"
          width="240"
          height="160"
          rx="24"
          fill="url(#so-glass)"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="2"
        />
        <rect
          x="-120"
          y="-80"
          width="240"
          height="32"
          rx="24"
          fill="rgba(255,255,255,0.14)"
        />
        <circle cx="-94" cy="-64" r="6" fill="rgba(255,255,255,0.65)" />
        <circle cx="-74" cy="-64" r="6" fill="rgba(255,255,255,0.45)" />
        <circle cx="-54" cy="-64" r="6" fill="rgba(255,255,255,0.28)" />
        <path
          d="M-85 -8 L-52 15 L-85 38"
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="-38"
          y="32"
          width="66"
          height="10"
          rx="5"
          fill="rgba(255,255,255,0.7)"
        />
      </g>

      {/* ---------- 3) Sol altta tek küçük koyu küre ---------- */}
      <circle
        cx="215"
        cy="830"
        r="40"
        fill="url(#so-ceramic)"
        filter="url(#so-shadow)"
      />
    </svg>
  );
}
