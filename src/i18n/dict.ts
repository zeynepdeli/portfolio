/* =========================================================
   SİTE METİNLERİ — Türkçe / İngilizce
   Yeni bir metin eklerken iki dile de yaz; anahtar adı aynı olmalı.
========================================================= */

const tr = {
  "nav.home": "ANA SAYFA",
  "nav.skills": "YETENEKLER",
  "nav.projects": "PROJELER",
  "nav.documents": "BELGELER",
  "nav.menu": "Menü",
  "nav.open": "Menüyü aç",
  "nav.close": "Menüyü kapat",
  "nav.connect": "BAĞLANTI",
  "nav.next": "Sonraki bölüm",
  "nav.scroll": "AŞAĞI KAYDIR",
  "lang.label": "Dil",

  "hero.role": "FULL STACK GELİŞTİRİCİ",
  "hero.online": "SİSTEM HAZIR",
  "hero.booting": "BAŞLATILIYOR…",
  "hero.photo": "Profil fotoğrafı",

  "skills.header": "[YETENEKLER]",
  "skills.aria": "Yetenekler",
  "skills.prev": "Önceki kategori",

  "proj.counter": "PROJE",
  "proj.title": "Proje",
  "proj.desc":
    "Proje açıklaması burada yer alacak — ne yaptığı, rolüm ve öne çıkan özellikleri.",

  "card.role": "FULL STACK GELİŞTİRİCİ",

  "footer.line1": "Hayalindeki proje",
  "footer.line2": "bir commit uzağında.",
  "footer.commit": 'git commit -m "birlikte başlayalım"',
  "footer.copy": "KOPYALA",
  "footer.copied": "KOPYALANDI",
  "footer.top": "BAŞA DÖN",
  "footer.topAria": "Başa dön",
  "footer.soon": "Yakında",
  "footer.city": "İSTANBUL · GMT+3",
  "footer.rights": "TÜM SİNYALLER SAKLIDIR",
  "footer.role": "FULL-STACK YAZILIM GELİŞTİRİCİ",
  "footer.replayCmd": "./hikaye",
  "footer.replayArg": "--bastan-izle",
  "footer.replayAria": "Açılış animasyonunu baştan izle",

  "docs.tag": "[ BELGELER · İNDİRMELER ]",
  "docs.title": "Özgeçmiş",
  "docs.title2": "/ Curriculum Vitae",
  "docs.desc":
    "Türkçe ve İngilizce özgeçmişimi görüntüleyebilir ya da PDF olarak indirebilirsiniz.",

  "wa.message":
    "Merhaba Zeynep, portfolyonu inceledim ve seninle iletişime geçmek istiyorum.",
} as const;

export type DictKey = keyof typeof tr;

const en: Record<DictKey, string> = {
  "nav.home": "HOME",
  "nav.skills": "SKILLS",
  "nav.projects": "PROJECTS",
  "nav.documents": "DOCUMENTS",
  "nav.menu": "Menu",
  "nav.open": "Open menu",
  "nav.close": "Close menu",
  "nav.connect": "CONNECT",
  "nav.next": "Next section",
  "nav.scroll": "SCROLL DOWN",
  "lang.label": "Language",

  "hero.role": "FULL STACK DEVELOPER",
  "hero.online": "SYSTEM ONLINE",
  "hero.booting": "BOOTING…",
  "hero.photo": "Profile photo",

  "skills.header": "[SKILLS]",
  "skills.aria": "Skills",
  "skills.prev": "Previous category",

  "proj.counter": "PROJECT",
  "proj.title": "Project",
  "proj.desc":
    "The project description will go here — what it does, my role and its key features.",

  "card.role": "FULL STACK DEVELOPER",

  "footer.line1": "Your dream project",
  "footer.line2": "is one commit away.",
  "footer.commit": 'git commit -m "let\'s build it together"',
  "footer.copy": "COPY",
  "footer.copied": "COPIED",
  "footer.top": "BACK TO TOP",
  "footer.topAria": "Back to top",
  "footer.soon": "Coming soon",
  "footer.city": "ISTANBUL · GMT+3",
  "footer.rights": "ALL SIGNALS RESERVED",
  "footer.role": "FULL-STACK SOFTWARE DEVELOPER",
  "footer.replayCmd": "./story",
  "footer.replayArg": "--replay",
  "footer.replayAria": "Replay the intro animation",

  "docs.tag": "[ DOCUMENTS · DOWNLOADS ]",
  "docs.title": "Resume",
  "docs.title2": "/ Curriculum Vitae",
  "docs.desc":
    "You can view my Turkish and English resumes or download them as PDF.",

  "wa.message":
    "Hi Zeynep, I've looked through your portfolio and would like to get in touch.",
};

export const DICT: Record<"tr" | "en", Record<DictKey, string>> = { tr, en };
