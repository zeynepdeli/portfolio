type SocialStripProps = {
  children: React.ReactNode;
};

export default function SocialStrip({ children }: SocialStripProps) {
  return (
    <div className="relative inline-flex items-center gap-3  overflow-hidden">
      {/* Chip ile aynı yönde iki renkli glow katmanı */}

      <div className="relative z-10 flex items-center gap-3">{children}</div>
    </div>
  );
}
