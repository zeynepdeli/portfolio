"use client";

import { useLang } from "@/i18n/lang";

/* =========================================================
   DİL ANAHTARI — TR / EN  (anakart JUMPER'ı)
   Anakarttaki 3 pinli jumper gibi: küçük kart parçasının üstünde altın
   pinler, iki pini köprüleyen mavi jumper kapağı. Kapak 1-2 pinlerinde
   ise TR, 2-3 pinlerinde ise EN. Tıklanınca kapak kalkar, yan pine
   kayar ve oturur; bütün site o dile geçer.

   Her sayfada, her cihazda AYNI yerde: ekranın sağ üst köşesi, panelin
   üst kenarından sarkar. Layout'ta bir kez çizilir (position: fixed).
   Dar telefonlarda (≤ 420px) küçülür ki üst ortadaki güç soketine
   değmesin (320px'e kadar). Süzgeç / bulanıklık yok: Safari, Firefox ve
   Chrome'da aynı çizilir.
========================================================= */

const ICE = "var(--c-a8eef6,168,238,246)";
const EDGE = "var(--c-78dcff,120,220,255)";
const GOLD = "linear-gradient(180deg, #f2e4c8 0%, #c9a86a 45%, #8a6a3a 100%)";

/* kart parçasının ölçüleri (px, masaüstü). Telefonda bütünüyle küçülür. */
const W = 112;
const H = 30;
/** pinlerin merkezleri (x) ve aralığı */
const PITCH = 14;
const PIN_X = [W / 2 - PITCH, W / 2, W / 2 + PITCH];
const PIN_Y = 13;
const CAP_W = 26;
const CAP_H = 18;

const CSS = `
.ls-root {
  --ls-s: 1; --ls-right: calc(1% + 20px);
  position: fixed; top: 0; right: var(--ls-right); z-index: 95;
  width: calc(${W}px * var(--ls-s)); height: calc(${H}px * var(--ls-s));
  padding: 0; border: 0; background: none; cursor: pointer; outline: none;
  user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent;
  transition: transform .8s cubic-bezier(.22,1,.36,1) .35s;
}
@media (max-width: 420px) { .ls-root { --ls-s: .8; --ls-right: calc(1% + 12px); } }
@media (max-width: 345px) { .ls-root { --ls-right: 6px; } }
/* açılış hikâyesinde: site yanana kadar kasanın içinde bekler */
html.ls-wait .ls-root { transform: translateY(-115%); pointer-events: none; transition-delay: 0s; }

.ls-body {
  position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px;
  transform: scale(var(--ls-s)); transform-origin: 0 0;
}
.ls-hit { position: absolute; left: -4px; right: -4px; top: 0; bottom: -14px; }
.ls-pcb {
  position: absolute; inset: 0; border-radius: 0 0 9px 9px;
  background:
    repeating-linear-gradient(90deg, rgba(var(--c-ffffff,255,255,255),.03) 0 1px, transparent 1px 3px),
    linear-gradient(180deg, rgb(var(--c-154476,21,68,118)) 0%, rgb(var(--c-0b2b55,11,43,85)) 55%, rgb(var(--c-071c3b,7,28,59)) 100%);
  border: 1px solid rgba(${EDGE},.35); border-top: 0;
  box-shadow: inset 0 -1px 0 rgba(var(--c-cfe6ff,207,230,255),.25), inset 0 2px 4px rgba(0,0,0,.45), 0 6px 14px rgba(0,0,0,.5);
}
.ls-root:focus-visible .ls-pcb { box-shadow: 0 0 0 2px rgb(${ICE}), 0 6px 14px rgba(0,0,0,.5); }
.ls-screw {
  position: absolute; top: ${PIN_Y - 3}px; width: 6px; height: 6px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(var(--c-cfe6ff,207,230,255),.95), rgba(var(--c-46beff,70,190,255),.5) 45%, rgba(var(--c-061f3a,6,31,58),1) 100%);
  box-shadow: 0 1px 1px rgba(0,0,0,.6);
}
/* baskı devre izleri: etiketlerden pin yuvasına ince altın çizgi */
.ls-trace { position: absolute; top: ${PIN_Y}px; height: 1px; background: rgba(201,168,106,.35); }
.ls-lbl {
  position: absolute; top: ${PIN_Y - 5}px; width: 18px; text-align: center;
  font-family: var(--font-geist-mono), ui-monospace, monospace; font-weight: 700;
  font-size: 9px; line-height: 10px; letter-spacing: .04em;
  color: rgba(${ICE},.3); transition: color .3s ease, text-shadow .3s ease;
}
.ls-lbl.on { color: rgb(${ICE}); text-shadow: 0 0 6px rgba(${ICE},.85); }
/* siyah pin yuvası (header) */
.ls-hdr {
  position: absolute; left: ${PIN_X[0] - 9}px; width: ${PITCH * 2 + 18}px;
  top: ${PIN_Y - 6}px; height: 12px; border-radius: 2px;
  background: linear-gradient(180deg, #0a1426, #02060e);
  border: 1px solid rgba(var(--c-cfe6ff,207,230,255),.28);
  box-shadow: inset 0 1px 2px rgba(0,0,0,.8);
}
.ls-pin {
  position: absolute; top: ${PIN_Y - 3}px; width: 6px; height: 6px; border-radius: 1px;
  background: ${GOLD}; box-shadow: 0 0 2px rgba(0,0,0,.6);
}
/* jumper kapağı: konumu yatay kayar, her değişimde kalkıp oturur */
.ls-cap {
  position: absolute; top: ${PIN_Y - CAP_H / 2 - 1}px; left: 0; width: ${CAP_W}px; height: ${CAP_H}px;
  transform: translateX(${PIN_X[0] + PITCH / 2 - CAP_W / 2}px);
  transition: transform .42s cubic-bezier(.5,0,.25,1);
}
.ls-cap.en { transform: translateX(${PIN_X[1] + PITCH / 2 - CAP_W / 2}px); }
.ls-capin {
  position: absolute; inset: 0; border-radius: 3px;
  background:
    linear-gradient(90deg, transparent 0 45%, rgba(4,20,42,.35) 45% 55%, transparent 55%),
    linear-gradient(180deg, #8ee6ff 0%, #3fb6e6 35%, #1f7fb3 100%);
  border: 1px solid rgba(225,248,255,.55);
  box-shadow: 0 0 10px rgba(${ICE},.55), 0 3px 4px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.75), inset 0 -2px 0 rgba(4,20,42,.35);
  animation: lsHop .42s cubic-bezier(.5,0,.25,1);
}
@keyframes lsHop {
  0%   { transform: none; }
  35%  { transform: translateY(-6px) scale(1.06); box-shadow: 0 0 14px rgba(${ICE},.7), 0 9px 8px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.75); }
  80%  { transform: translateY(-1px); }
  100% { transform: none; }
}
@media (hover: hover) { .ls-root:hover .ls-cap { filter: brightness(1.1); } }
@media (prefers-reduced-motion: reduce) {
  .ls-root, .ls-cap { transition: none; }
  .ls-capin { animation: none; }
}
`;

export default function LangSwitch() {
  const { lang, setLang, t } = useLang();
  const en = lang === "en";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={en}
      aria-label={t("lang.label")}
      title={en ? "Türkçe" : "English"}
      onClick={() => setLang(en ? "tr" : "en")}
      className="ls-root"
    >
      <style>{CSS}</style>
      {/* parmak için daha geniş dokunma alanı (görünmez) */}
      <span aria-hidden className="ls-hit" />
      <span aria-hidden className="ls-body">
        <span className="ls-pcb" />
        <span className="ls-screw" style={{ left: 4 }} />
        <span className="ls-screw" style={{ right: 4 }} />
        {/* etiket → pin izi */}
        <span className="ls-trace" style={{ left: 28, width: PIN_X[0] - 9 - 28 }} />
        <span
          className="ls-trace"
          style={{ left: PIN_X[2] + 9, width: W - 28 - PIN_X[2] - 9 }}
        />
        <span className={`ls-lbl${en ? "" : " on"}`} style={{ left: 10 }}>
          TR
        </span>
        <span className={`ls-lbl${en ? " on" : ""}`} style={{ right: 10 }}>
          EN
        </span>
        <span className="ls-hdr" />
        {PIN_X.map((x) => (
          <span key={x} className="ls-pin" style={{ left: x - 3 }} />
        ))}
        <span className={`ls-cap${en ? " en" : ""}`}>
          {/* key: dil her değişince "kalk-otur" animasyonu yeniden oynar */}
          <span key={lang} className="ls-capin" />
        </span>
      </span>
    </button>
  );
}
