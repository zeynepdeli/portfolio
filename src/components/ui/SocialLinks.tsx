/* =========================================================
   SOSYAL BAĞLANTILAR — sitenin TEK yeri
   Hero çipleri, mobil menü ve footer portları buradan okur.
   Bir adresi değiştirmek için yalnızca bu dosyayı düzenle.
========================================================= */

export const LINKEDIN = "https://www.linkedin.com/in/zeynep-deli";
export const GITHUB = "https://github.com/zeynepdeli";
/** Instagram şimdilik boş: "" iken simge görünür ama tıklanınca bir şey olmaz */
export const INSTAGRAM = "";
export const EMAIL = "zzeynepdelii@gmail.com";

/* WHATSAPP — wa.me bağlantısı: ülke kodu + numara, başında "+" ve "0"
   OLMADAN (0537 022 16 16 → 90 537 022 16 16 → 905370221616).
   Tıklayınca WhatsApp (telefonda uygulama, bilgisayarda WhatsApp Web)
   bu numaraya, aşağıdaki mesaj yazılı olarak açılır. */
export const WHATSAPP_NUMBER = "905370221616";
/** hazır mesaj, sitenin diline göre */
export const WHATSAPP_MESSAGES = {
  tr: "Merhaba Zeynep, portfolyonu inceledim ve seninle iletişime geçmek istiyorum.",
  en: "Hi Zeynep, I've looked through your portfolio and would like to get in touch.",
} as const;
const waLink = (msg: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
export const WHATSAPP = waLink(WHATSAPP_MESSAGES.tr);

/** <a> için ortak özellikler: dış bağlantı yeni sekmede açılır,
 *  mailto aynı sekmede, boş adres ("") tıklanınca hiçbir şey yapmaz. */
export function linkProps(href: string, lang: "tr" | "en" = "tr") {
  /* WhatsApp: hazır mesaj sitenin dilinde */
  if (href === WHATSAPP) href = waLink(WHATSAPP_MESSAGES[lang]);
  if (!href)
    return {
      href: "#",
      "aria-disabled": true,
      onClick: (e: { preventDefault: () => void }) => e.preventDefault(),
    } as const;
  if (href.startsWith("http"))
    return { href, target: "_blank", rel: "noopener noreferrer" } as const;
  return { href } as const;
}