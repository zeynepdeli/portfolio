import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo";

/* /robots.txt — tüm arama motorları siteyi tarayabilir */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
