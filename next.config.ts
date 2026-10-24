import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Avatar görselleri, videolar ve belgeler: tarayıcı bir saat önbellekte
     tutar, sonra arka planda tazeler. İçeriği değişen görselin adresine
     sürüm eklenir (components/ui/assets.ts → V): yenisi hemen gelir. */
  async headers() {
    const cache = [
      {
        key: "Cache-Control",
        value: "public, max-age=3600, stale-while-revalidate=86400",
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
