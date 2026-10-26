/* =========================================================
   CİHAZ GÜCÜ — "hafif mod" (html.perf-lite)
   Büyük ekranlı güçlü bilgisayarda her süs animasyonu akıcı; telefon,
   tablet ve tümleşik ekran kartlı dizüstülerde aynı sahne takılıyordu.
   Hafif modda yalnızca her karede KOCA bir alanı yeniden boyatan süsler
   durur (nehirdeki / devre izlerindeki akan çizgiler); hikâye, avatar ve
   geçişler aynen oynar.

   Karar:
   1) Açılışta tahmin: dokunmatik ekran, zayıf ekran kartı (Intel UHD /
      Iris, Mali, Adreno…) ya da ≤4 çekirdek → hafif.
   2) Çalışırken ölçüm: 2 sn'lik pencerede karelerin üçte biri 28 ms'yi
      aşıyorsa (≈ 35 fps'nin altı) → hafif (bir kez; geri dönmez).
========================================================= */

const CLASS = "perf-lite";

/** Chromium dışı tarayıcı motoru (Safari / WebKit, Firefox / Gecko):
 *  canlı bulanıklık (backdrop-filter), eğik + maskeli büyük katmanlar ve
 *  SVG çizgi animasyonları bu motorlarda Chrome'dan çok daha ağır. Bu
 *  tarayıcılarda telefondaki hafif görünüm kullanılır (html.engine-lite +
 *  perf-lite). Sayfa çizilmeden ÖNCE uygulanması için aynı kod layout'ta
 *  satır içi betik olarak da çalışır (ENGINE_SCRIPT).
 *  Ayrıca "/" (açılış hikâyesi) için html.ls-wait: dil anahtarı açılış
 *  animasyonunda görünmez, avatar fişi takıp site yanınca iner
 *  (SiteFlow kaldırır). */
export const ENGINE_SCRIPT = `(function(){try{var u=navigator.userAgent,c=document.documentElement.classList;var ch=(u.indexOf("Chrome/")>-1||u.indexOf("Chromium/")>-1)&&u.indexOf("CriOS")<0&&u.indexOf("FxiOS")<0&&u.indexOf("EdgiOS")<0;if(!ch){c.add("engine-lite");c.add("perf-lite");}if(location.pathname==="/")c.add("ls-wait");}catch(e){}})();`;
let started = false;

const WEAK_GPU =
  /intel|uhd|iris|mali|adreno|powervr|swiftshader|llvmpipe|basic render|software/i;

function guessLite(): boolean {
  try {
    if (window.matchMedia?.("(pointer: coarse)").matches) return true;
    const cores = navigator.hardwareConcurrency || 8;
    if (cores <= 4) return true;
    const mem = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    if (mem && mem <= 4) return true;
    const gl = document.createElement("canvas").getContext("webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const r = ext
        ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
        : String(gl.getParameter(gl.RENDERER));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      if (WEAK_GPU.test(r)) return true;
    }
  } catch {
    /* tahmin edilemedi: ölçüm karar verir */
  }
  return false;
}

export function isPerfLite(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains(CLASS)
  );
}

function goLite() {
  document.documentElement.classList.add(CLASS);
}

/** bir kez çağrılır (SiteFlow açılışında) */
export function startPerfTier() {
  if (started || typeof window === "undefined") return;
  started = true;
  /* elle seçim (deneme için): ?perf=full ya da ?perf=lite */
  const force = new URLSearchParams(window.location.search).get("perf");
  if (force === "lite") return goLite();
  if (force === "full") return;
  if (guessLite()) {
    goLite();
    return;
  }
  /* çalışırken ölç */
  let last = -1;
  let winStart = 0;
  let frames = 0;
  let slow = 0;
  const tick = (now: number) => {
    if (isPerfLite()) return;
    if (document.visibilityState === "visible" && last >= 0) {
      const dt = now - last;
      /* sekme arkaya atılıp dönünce gelen dev boşluğu sayma */
      if (dt < 500) {
        frames++;
        if (dt > 28) slow++;
      }
    }
    last = now;
    if (now - winStart > 2000) {
      if (frames > 20 && slow / frames > 0.33) {
        goLite();
        return;
      }
      winStart = now;
      frames = 0;
      slow = 0;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame((t) => {
    winStart = t;
    requestAnimationFrame(tick);
  });
}

/** hafif modun CSS'i (SiteFlow'un stiline eklenir) */
export const PERF_LITE_CSS = `
  html.perf-lite .trace-pulse,
  html.perf-lite .pf-flow,
  html.perf-lite .rm-flow,
  html.perf-lite .ft-lane,
  html.perf-lite .cable-flow {
    animation: none !important;
  }
  /* footer nehrindeki akan bitler ve süzülen rakamlar hafif modda da
     akar: yalnızca transform / opacity (kompozitörde, yeniden boyama
     yok) — nehir durmuş gibi görünmesin */
`;
