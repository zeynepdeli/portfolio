import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo";

/* /sitemap.xml — arama motorlarına sitedeki sayfaları bildirir */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: [string, number][] = [
    ["", 1],
    ["/projects", 0.9],
    ["/roadmap", 0.8],
    ["/documents", 0.7],
  ];
  return pages.map(([path, priority]) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority,
  }));
}
