export default function WalkingCharacter() {
  return (
    <svg
      viewBox="0 0 60 80"
      width="40"
      height="53"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible" }}
    >
      {/* Kafa */}
      <circle cx="30" cy="14" r="10" fill="var(--menu2-led)" />

      {/* Gövde */}
      <rect
        x="22"
        y="24"
        width="16"
        height="26"
        rx="6"
        fill="var(--menu2-led)"
      />

      {/* Sol kol */}
      <line
        x1="24"
        y1="30"
        x2="14"
        y2="42"
        stroke="var(--menu2-led)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Sağ kol */}
      <line
        x1="36"
        y1="30"
        x2="46"
        y2="42"
        stroke="var(--menu2-led)"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Sol bacak — animasyonlu */}
      <line
        x1="26"
        y1="50"
        x2="18"
        y2="72"
        stroke="var(--menu2-led)"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="20 26 50; -20 26 50; 20 26 50"
          dur="0.6s"
          repeatCount="indefinite"
        />
      </line>

      {/* Sağ bacak — animasyonlu (ters fazda) */}
      <line
        x1="34"
        y1="50"
        x2="42"
        y2="72"
        stroke="var(--menu2-led)"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-20 34 50; 20 34 50; -20 34 50"
          dur="0.6s"
          repeatCount="indefinite"
        />
      </line>
    </svg>
  );
}
