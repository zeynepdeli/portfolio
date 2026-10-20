/* =========================================================
   VİDEO ÖN YÜKLEME
   iPhone Safari, <video preload="auto"> olsa bile videoyu ancak play()
   çağrılınca indirmeye başlar. Bu yüzden avatar tırmanmaya başladığında
   video henüz yoktu: kimi açılışta tırmanma hiç görünmüyor, avatar bir
   anda porttaymış gibi beliriyordu (her açılış farklı). Burada videolar
   sayfa açılır açılmaz TAMAMEN indirilir ve bellekteki kopyası (blob)
   oynatılır → play() anında ilk kare hazırdır, her cihazda aynı akış.
========================================================= */

type Entry = { url: string; type: string };

const ready = new Map<string, Entry>();
const pending = new Map<string, Promise<Entry | null>>();

/** tarayıcının <source> seçimiyle aynı kural: webm çalabiliyorsa webm */
function pickFile(src: string, hasWebm: boolean): Entry {
  if (hasWebm && typeof document !== "undefined") {
    const can = document.createElement("video").canPlayType("video/webm");
    if (can) return { url: src.replace(/\.mp4$/i, ".webm"), type: "video/webm" };
  }
  return { url: src, type: "video/mp4" };
}

/** videoyu indirip belleğe al (aynı video ikinci kez indirilmez) */
export function preloadVideo(src: string, hasWebm = true) {
  if (typeof window === "undefined") return Promise.resolve(null);
  const done = ready.get(src);
  if (done) return Promise.resolve(done);
  const p0 = pending.get(src);
  if (p0) return p0;
  const file = pickFile(src, hasWebm);
  const p = fetch(file.url)
    .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
    .then((b) => {
      const e = { url: URL.createObjectURL(b), type: file.type };
      ready.set(src, e);
      return e;
    })
    .catch(() => null);
  pending.set(src, p);
  return p;
}

/** önceden indirilmişse bellekteki kopya (yoksa null) */
export function cachedVideo(src: string): Entry | null {
  return ready.get(src) ?? null;
}

/** tüm videolar hazır olunca (ya da en geç maxMs sonra) çözülür */
export function whenVideosReady(srcs: string[], maxMs: number) {
  return Promise.race([
    Promise.all(srcs.map((s) => preloadVideo(s))).then(() => undefined),
    new Promise<void>((res) => window.setTimeout(res, maxMs)),
  ]);
}
