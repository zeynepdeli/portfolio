type SocialStripProps = {
  children: React.ReactNode;
};

/** Sosyal butonlar arası boşluk (px) — butonlar daha ferah dursun */
const SOCIAL_GAP = 48;

export default function SocialStrip({ children }: SocialStripProps) {
  return (
    <div className="relative inline-flex items-center overflow-hidden">
      {/* Chip ile aynı yönde iki renkli glow katmanı */}

      <div
        className="relative z-10 flex items-center"
        style={{ gap: SOCIAL_GAP }}
      >
        {children}
      </div>
    </div>
  );
}
