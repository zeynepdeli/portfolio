"use client";

import type { CSSProperties } from "react";
import { useLang, type Lang } from "@/i18n/lang";

/* =========================================================
   DİL ANAHTARI — TR / EN
   Anakarttaki sürgülü anahtar gibi: metal yuva, içinde kayan ışıklı
   sürgü; seçili dil turkuaz yanar. Tıklanınca bütün site o dile geçer.
========================================================= */

const LANGS: Lang[] = ["tr", "en"];

export default function LangSwitch({
  style,
  className = "",
}: {
  style?: CSSProperties;
  className?: string;
}) {
  const { lang, setLang, t } = useLang();
  const idx = LANGS.indexOf(lang);
  return (
    <div
      role="radiogroup"
      aria-label={t("lang.label")}
      className={`relative inline-flex select-none items-center rounded-full p-0.75 font-mono text-[10px] tracking-[.18em] ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgb(var(--c-0b2a4a,11,42,74)), rgb(var(--c-04142a,4,20,42)))",
        border: "1px solid rgba(var(--c-78dcff,120,220,255),.35)",
        boxShadow:
          "inset 0 2px 4px rgba(0,0,0,.55), inset 0 -1px 0 rgba(var(--c-cfe6ff,207,230,255),.15), 0 4px 12px rgba(0,0,0,.35)",
        ...style,
      }}
    >
      {/* kayan sürgü */}
      <span
        aria-hidden
        className="absolute top-0.75 bottom-0.75 rounded-full"
        style={{
          left: 3,
          width: "calc(50% - 3px)",
          transform: `translateX(${idx * 100}%)`,
          transition: "transform 380ms cubic-bezier(.3,1.35,.5,1)",
          background:
            "radial-gradient(circle at 40% 35%, rgb(var(--c-e1f8ff,225,248,255)), rgb(var(--c-a8eef6,168,238,246)) 70%)",
          boxShadow: "0 0 10px rgba(var(--c-a8eef6,168,238,246),.65)",
        }}
      />
      {LANGS.map((l) => {
        const on = l === lang;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setLang(l)}
            className="relative z-1 cursor-pointer rounded-full px-2.5 py-1 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-[rgb(var(--c-a8eef6,168,238,246))]"
            style={{
              color: on
                ? "rgb(var(--c-04142a,4,20,42))"
                : "rgba(var(--c-a8eef6,168,238,246),.75)",
              fontWeight: on ? 700 : 500,
            }}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
