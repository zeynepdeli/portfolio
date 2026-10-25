"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DICT, type DictKey } from "./dict";

/* =========================================================
   DİL (TR / EN)
   Seçilen dil tarayıcıda saklanır (localStorage "lang"); ilk ziyarette
   tarayıcının dili Türkçeyse TR, değilse EN. Sayfa adresi değişmez;
   bütün yazılar bu bağlamdan okunur (t("anahtar") ya da pick({tr, en})).
========================================================= */

export type Lang = "tr" | "en";
const KEY = "lang";
const EVT = "lang-change";

function readLang(): Lang {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "tr" || v === "en") return v;
  } catch {
    /* gizli sekme vb.: tarayıcı dili */
  }
  return (navigator.language || "tr").toLowerCase().startsWith("tr")
    ? "tr"
    : "en";
}
const subscribe = (cb: () => void) => {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** sözlükten çeviri */
  t: (key: DictKey) => string;
  /** satır içi çift dilli metin */
  pick: <T>(v: { tr: T; en: T }) => T;
};

const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  /* sunucuda ve ilk çizimde TR (sitenin ana dili); istemcide kayıtlı dil */
  const lang = useSyncExternalStore<Lang>(subscribe, readLang, () => "tr");
  const setLang = useCallback((l: Lang) => {
    try {
      window.localStorage.setItem(KEY, l);
    } catch {
      /* saklanamadı: yalnızca bu oturum */
    }
    window.dispatchEvent(new Event(EVT));
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key) => DICT[lang][key],
      pick: (v) => v[lang],
    }),
    [lang, setLang],
  );
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang(): Ctx {
  const c = useContext(LangCtx);
  if (!c) throw new Error("useLang: LangProvider yok");
  return c;
}
