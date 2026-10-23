import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Avatar görselleri, videolar ve belgeler: tarayıcı bir gün önbellekte
     tutar (her ziyarette yeniden doğrulamak yerine), arka planda tazeler.
     Dosya değişirse en geç bir gün içinde yenisi gelir. */
  async headers() {
    const cache = [
      {
        key: "Cache-Control",
        value: "public, max-age=86400, stale-while-revalidate=604800",
      },
    ];
    return [
      { source: "/images/:path*", headers: cache },
      { source: "/videos/:path*", headers: cache },
      { source: "/documents/:path*", headers: cache },
    ];
  },
};

export default nextConfig;
