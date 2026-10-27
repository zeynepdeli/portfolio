/* =========================================================
   SEO — arama motorları ve sosyal paylaşım için TEK yer
   Alan adı değişirse (ör. zeynepdeli.com) yalnızca SITE_URL'i
   değiştir ya da Vercel'de NEXT_PUBLIC_SITE_URL ortam değişkenini ver.
========================================================= */
import { EMAIL, GITHUB, LINKEDIN } from "@/components/ui/SocialLinks";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://portfolio-seven-vert.vercel.app"
).replace(/\/$/, "");

export const NAME = "Zeynep Deli";
/** aramada Türkçe karakterli ve karaktersiz yazılış ikisi de bulunsun */
export const NAME_TR = "Zeynep DELİ";

export const SITE_TITLE = `${NAME_TR} | Full Stack Developer — React, Next.js, React Native`;

export const SITE_DESCRIPTION =
  "Zeynep Deli — İstanbul'da Full Stack Developer / Yazılım Geliştirici. React, Next.js, React Native, Node.js ve TypeScript ile modern, hızlı ve SEO uyumlu web ve mobil uygulamalar geliştiriyorum. Projelerim, yeteneklerim ve özgeçmişim.";

export const KEYWORDS = [
  "Zeynep Deli",
  "Zeynep DELİ",
  "Zeynep Deli portfolyo",
  "Zeynep Deli yazılım",
  "Full Stack Developer",
  "Full Stack Geliştirici",
  "Yazılım Geliştirici",
  "Software Developer",
  "Frontend Developer",
  "Frontend Geliştirici",
  "Web Developer",
  "Web Geliştirici",
  "Mobil Uygulama Geliştirici",
  "React Developer",
  "Next.js Developer",
  "React Native Developer",
  "Node.js Developer",
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "React Native",
  "Node.js",
  "Express.js",
  "Tailwind CSS",
  "REST API",
  "Prisma",
  "PostgreSQL",
  "MongoDB",
  "UI tasarım",
  "Responsive web tasarım",
  "SEO uyumlu web sitesi",
  "Freelance yazılımcı",
  "İstanbul yazılım geliştirici",
  "Türkiye Full Stack Developer",
  "Portfolyo",
  "Portfolio",
];

/** Google'ın kişiyi tanıması için yapılandırılmış veri (JSON-LD) */
export const PERSON_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: NAME,
  alternateName: NAME_TR,
  url: SITE_URL,
  image: `${SITE_URL}/icon.png`,
  email: `mailto:${EMAIL}`,
  jobTitle: "Full Stack Developer",
  description: SITE_DESCRIPTION,
  address: {
    "@type": "PostalAddress",
    addressLocality: "İstanbul",
    addressCountry: "TR",
  },
  knowsAbout: [
    "React",
    "Next.js",
    "React Native",
    "Node.js",
    "TypeScript",
    "JavaScript",
    "Tailwind CSS",
    "REST API",
    "Web Development",
    "Mobile App Development",
  ],
  sameAs: [LINKEDIN, GITHUB].filter(Boolean),
};

export const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: `${NAME_TR} — Portfolyo`,
  url: SITE_URL,
  inLanguage: ["tr-TR", "en"],
  author: { "@type": "Person", name: NAME },
};
