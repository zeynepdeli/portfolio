/* =====================================================
   GİRİŞ ANİMASYONU — sahnenin açılış sırası
   Tüm keyframe'ler ve zamanlama burada; bileşenler sadece
   `intro(...)` ile stil alır. Ek paket gerekmez (saf CSS).

   Zaman çizelgesi (saniye, INTRO_SPEED = 1 iken; gerçek süre
   bu değerlerin INTRO_SPEED'e bölünmüş hâli):
   0.00  zemin + cam panel belirir (bulanıktan nete)
   0.25  konnektörler soldan kayar
   0.45  menü butonları sırayla soldan gelir
   0.55  çip sağ alttan yükselir, halka parlar
   0.80  devre çizgileri çipten dışarı doğru çizilir
   1.05  profil sağdan kayarak gelir
   1.35  isim/unvan yazılmaya başlar
   1.70  sosyal butonlar sırayla aşağıdan zıplar
   1.90  sağ üst portlar yukarıdan iner
===================================================== */

import type { CSSProperties } from "react";

/** Tüm sahneyi hızlandırmak/yavaşlatmak için çarpan.
 *  1 = ilk hâl (~2,5 sn), 1.8 = ~1,4 sn. Büyüdükçe hızlanır. */
export const INTRO_SPEED = 1.35;

/** T'deki bir zamanı (sn) hıza göre milisaniyeye çevirir
 *  (JS zamanlayıcıları için, örn. daktilo gecikmesi) */
export const introMs = (sec: number) => (sec * 1000) / INTRO_SPEED;

export const T = {
  panel: 0,
  connectors: 0.25,
  menu: 0.45,
  menuStagger: 0.1,
  chip: 0.55,
  traces: 0.8,
  traceStagger: 0.018,
  photo: 1.05,
  text: 1.35,
  social: 1.7,
  socialStagger: 0.07,
  ports: 1.9,
};

const EASE_OUT = "cubic-bezier(.22,1,.36,1)"; // yumuşak yavaşlama (easeOutQuint)
const EASE_BACK = "cubic-bezier(.3,1.18,.55,1)"; // çok hafif esneme

export type IntroName =
  | "introFade"
  | "introPanel"
  | "introLeft"
  | "introRight"
  | "introUp"
  | "introDown"
  | "introPop"
  | "introChip"
  | "introDraw";

/** Bir elemana giriş animasyonu verir.
 *  `backwards` dolgu: animasyon başlamadan önce başlangıç karesinde bekler,
 *  bittikten sonra hiçbir transform bırakmaz → hover vb. bozulmaz. */
export function intro(
  name: IntroName,
  delay: number,
  duration = 0.9,
  ease: "out" | "back" = "out",
): CSSProperties {
  const s = INTRO_SPEED;
  return {
    animation: `${name} ${duration / s}s ${
      ease === "back" ? EASE_BACK : EASE_OUT
    } ${delay / s}s backwards`,
  };
}

/** Sahneye bir kez eklenir; keyframe'leri tanımlar */
export function IntroStyles() {
  return (
    <style>{`
      @keyframes introFade {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes introPanel {
        from { opacity: 0; transform: scale(.99); }
        to   { opacity: 1; transform: none; }
      }
      @keyframes introLeft {
        from { opacity: 0; transform: translateX(-36px); }
        to   { opacity: 1; transform: none; }
      }
      @keyframes introRight {
        0%   { opacity: 0; transform: translateX(90px) scale(.98); }
        60%  { opacity: 1; }
        100% { opacity: 1; transform: none; }
      }
      @keyframes introUp {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: none; }
      }
      @keyframes introDown {
        from { opacity: 0; transform: translateY(-18px); }
        to   { opacity: 1; transform: none; }
      }
      @keyframes introPop {
        0%   { opacity: 0; transform: translateY(14px) scale(.94); }
        100% { opacity: 1; transform: none; }
      }
      @keyframes introChip {
        0%   { opacity: 0; transform: translate(40px, 60px) scale(.92) rotate(2deg); }
        60%  { opacity: 1; }
        100% { opacity: 1; transform: none; }
      }
      @keyframes introDraw {
        from { stroke-dashoffset: 1; }
        to   { stroke-dashoffset: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        [style*="intro"] { animation: none !important; }
      }
    `}</style>
  );
}
