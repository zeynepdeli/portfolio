"use client";

import { useLang } from "@/i18n/lang";

/* =========================================================
   DİL ANAHTARI — TR / EN  (güç kaynağının voltaj seçici anahtarı)
   Gerçek bir PSU'nun arkasındaki "115V / 230V" sürgülü anahtarı gibi:
   kasanın üst kenarına vidalı küçük metal braket, ortasında oluklu
   sürgü; sürgü hangi taraftaysa o dil yanar. Tıklanınca sürgü öbür
   tarafa kayar, bütün site o dile geçer.

   Her sayfada, her cihazda AYNI yerde: ekranın sağ üst köşesi, panelin
   üst kenarından sarkar (sol üstteki menü braketinin ve üst ortadaki
   güç soketinin eşi). Layout'ta bir kez çizilir (position: fixed);
   sayfa geçişlerinde yerinden oynamaz.

   Ölçüler CSS'te (aşağıdaki <style>): dar telefonlarda (≤ 420px)
   braket küçülür ki üst ortadaki güç soketine değmesin — 320px'e kadar.
   Süzgeç / bulanıklık yok: Safari, Firefox ve Chrome'da aynı çizilir.
========================================================= */

const ICE = "var(--c-a8eef6,168,238,246)";
const EDGE = "var(--c-78dcff,120,220,255)";

const CSS = `
.ls-root {
  --ls-w: 112px; --ls-h: 26px; --ls-slot: 40px; --ls-knob: 18px;
  --ls-screw: 8px; --ls-pad: 17px; --ls-font: 10px; --ls-right: calc(1% + 20px);
  position: fixed; top: 0; right: var(--ls-right); z-index: 95;
  width: var(--ls-w); height: var(--ls-h);
  padding: 0; border: 0; background: none; cursor: pointer; outline: none;
  user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent;
  transition: transform .8s cubic-bezier(.22,1,.36,1) .35s;
}
@media (max-width: 420px) {
  .ls-root {
    --ls-w: 96px; --ls-h: 24px; --ls-slot: 30px; --ls-knob: 14px;
    --ls-screw: 6px; --ls-pad: 12px; --ls-font: 9px; --ls-right: calc(1% + 14px);
  }
}
@media (max-width: 345px) {
  .ls-root { --ls-right: 8px; }
}
/* açılış hikâyesinde: site yanana kadar kasanın içinde bekler */
html.ls-wait .ls-root { transform: translateY(-115%); pointer-events: none; transition-delay: 0s; }

.ls-hit { position: absolute; left: -4px; right: -4px; top: 0; bottom: -14px; }
.ls-plate {
  position: absolute; inset: 0; border-radius: 0 0 8px 8px;
  background:
    repeating-linear-gradient(90deg, rgba(var(--c-ffffff,255,255,255),.035) 0 1px, transparent 1px 3px),
    linear-gradient(180deg, rgb(var(--c-154476,21,68,118)) 0%, rgb(var(--c-0b2b55,11,43,85)) 55%, rgb(var(--c-071c3b,7,28,59)) 100%);
  border: 1px solid rgba(${EDGE},.35); border-top: 0;
  box-shadow: inset 0 -1px 0 rgba(var(--c-cfe6ff,207,230,255),.25), inset 0 2px 4px rgba(0,0,0,.45), 0 6px 14px rgba(0,0,0,.5);
}
.ls-root:focus-visible .ls-plate { box-shadow: 0 0 0 2px rgb(${ICE}), 0 6px 14px rgba(0,0,0,.5); }
.ls-screw {
  position: absolute; top: calc(50% - var(--ls-screw) / 2);
  width: var(--ls-screw); height: var(--ls-screw); border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(var(--c-cfe6ff,207,230,255),.95), rgba(var(--c-46beff,70,190,255),.5) 45%, rgba(var(--c-061f3a,6,31,58),1) 100%);
  box-shadow: 0 1px 1px rgba(0,0,0,.6);
}
.ls-screw::after {
  content: ""; position: absolute; left: 15%; right: 15%; top: calc(50% - .6px); height: 1.2px;
  background: rgba(var(--c-061f3a,6,31,58),.95); transform: rotate(45deg);
}
.ls-screw.l { left: calc(var(--ls-pad) / 2 - var(--ls-screw) / 2); }
.ls-screw.r { right: calc(var(--ls-pad) / 2 - var(--ls-screw) / 2); }
.ls-row {
  position: absolute; top: 0; bottom: 0; left: var(--ls-pad); right: var(--ls-pad);
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.ls-lbl {
  font-family: var(--font-geist-mono), ui-monospace, monospace; font-weight: 700;
  font-size: var(--ls-font); line-height: 1; letter-spacing: .06em;
  color: rgba(${ICE},.32); transition: color .3s ease, text-shadow .3s ease;
}
.ls-lbl.on { color: rgb(${ICE}); text-shadow: 0 0 6px rgba(${ICE},.85); }
.ls-slot {
  position: relative; flex: none; width: var(--ls-slot); height: 12px; border-radius: 3px;
  background: linear-gradient(180deg, rgb(var(--c-000000,0,0,0)), rgb(var(--c-06122a,6,18,42)));
  border: 1px solid rgba(var(--c-cfe6ff,207,230,255),.4);
  box-shadow: inset 0 2px 3px rgba(0,0,0,.8);
}
.ls-trail {
  position: absolute; top: 1px; bottom: 1px; left: 1px; right: 1px; border-radius: 2px;
  background: linear-gradient(90deg, rgba(${ICE},.28), rgba(${ICE},0));
  transition: opacity .35s ease;
}
.ls-trail.en { background: linear-gradient(90deg, rgba(${ICE},0), rgba(${ICE},.28)); }
.ls-knob {
  position: absolute; top: 0; left: 1px; width: var(--ls-knob); height: 10px; border-radius: 2px;
  background:
    repeating-linear-gradient(90deg, rgba(0,0,0,.28) 0 1px, transparent 1px 3px),
    linear-gradient(180deg, rgb(var(--c-e1f8ff,225,248,255)), rgb(${ICE}) 60%, rgb(var(--c-5fb8d0,95,184,208)));
  box-shadow: 0 0 8px rgba(${ICE},.6), inset 0 1px 0 rgba(255,255,255,.7);
  transform: translateX(0);
  transition: transform .36s cubic-bezier(.3,1.35,.5,1), filter .2s ease;
}
.ls-knob.en { transform: translateX(calc(var(--ls-slot) - var(--ls-knob) - 4px)); }
@media (hover: hover) { .ls-root:hover .ls-knob { filter: brightness(1.12); } }
@media (prefers-reduced-motion: reduce) {
  .ls-root, .ls-knob { transition: none; }
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
      {/* braket + vidaları */}
      <span aria-hidden className="ls-plate" />
      <span aria-hidden className="ls-screw l" />
      <span aria-hidden className="ls-screw r" />
      {/* TR  [ sürgü ]  EN */}
      <span aria-hidden className="ls-row">
        <span className={`ls-lbl${en ? "" : " on"}`}>TR</span>
        <span className="ls-slot">
          <span className={`ls-trail${en ? " en" : ""}`} />
          <span className={`ls-knob${en ? " en" : ""}`} />
        </span>
        <span className={`ls-lbl${en ? " on" : ""}`}>EN</span>
      </span>
    </button>
  );
}
