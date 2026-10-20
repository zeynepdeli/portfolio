"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

/**
 * Saydam arka planlı video oynatıcı ("packed alpha").
 *
 * Video dosyası iki yarıdan oluşur:
 *   - üst yarı : renkli görüntü
 *   - alt yarı : saydamlık maskesi (beyaz = görünür, siyah = saydam)
 *
 * PERFORMANS: kareler WebGL ile (ekran kartında) birleştirilir. Eskiden
 * her kare işlemcide piksel piksel işleniyordu (getImageData) — telefonda
 * takılmanın ve kırpışmanın en büyük sebeplerinden biriydi. WebGL yoksa
 * eski yöntem yedek olarak çalışır.
 *
 * SAĞLAMLIK: bazı cihazlar videoyu hiç oynatmaz (iPhone düşük güç modu,
 * otomatik oynatma kapalı tarayıcılar…). O zaman kişi görünmez olmasın
 * diye `fallbackSrc` görseli gösterilir; tek seferlik videoda (loop yok)
 * onEnded yine çağrılır ki animasyon akışı takılmasın.
 *
 *  - Aynı adlı .webm varsa önce onu dener, yoksa .mp4.
 *  - Geliştirme modunda hata olursa kutunun içinde KIRMIZI yazıyla
 *    nedenini gösterir.
 */
type AlphaVideoProps = {
  src: string;
  loop?: boolean;
  onEnded?: () => void;
  className?: string;
  style?: CSSProperties;
  /** Videoyu yatayda aynala */
  flip?: boolean;
  /** false iken durur (son karede bekler) */
  playing?: boolean;
  /** Teşhis için durum bildirimi (yükleniyor / oynuyor / hata) */
  onStatus?: (status: string) => void;
  /** Her yeni kare çizildiğinde videonun zamanıyla çağrılır (sn) */
  onFrame?: (time: number) => void;
  /** Oynatma hızı (1 = normal) */
  playbackRate?: number;
  /** Video oynatılamazsa yerine gösterilen saydam görsel (PNG) */
  fallbackSrc?: string;
};

const IS_DEV = process.env.NODE_ENV !== "production";
/** video YÜKLENDİĞİ halde bu süre içinde ilerlemezse (oynatma engelli)
 *  yedek görsel */
const STUCK_MS = 2500;
/** hiç yüklenemezse (çok yavaş bağlantı / desteklenmeyen biçim) */
const NO_DATA_MS = 7000;
/** yedek görsele geçilince tek seferlik videonun "bitti" sayılma süresi */
const FALLBACK_END_MS = 900;

const HIDDEN_VIDEO_STYLE: CSSProperties = {
  /* Gizli ama ekranda: opacity 0 / display:none olursa bazı
     tarayıcılar videoyu çözmeyi bırakıyor. */
  position: "absolute",
  left: 0,
  top: 0,
  width: 1,
  height: 1,
  opacity: 0.001,
  pointerEvents: "none",
};

const ERROR_STYLE: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  minWidth: 220,
  padding: "4px 6px",
  background: "rgba(160,0,0,.85)",
  color: "#fff",
  font: "11px/1.3 monospace",
  borderRadius: 4,
  zIndex: 10,
  whiteSpace: "normal",
};

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() {
  uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

/* maske: 40'ın altı tam saydam, 235'in üstü tam görünür (eski CPU
   yöntemiyle aynı eşikler) */
const FRAG = `
precision mediump float;
uniform sampler2D tex;
varying vec2 uv;
void main() {
  vec3 rgb = texture2D(tex, vec2(uv.x, uv.y * 0.5)).rgb;
  float m = texture2D(tex, vec2(uv.x, 0.5 + uv.y * 0.5)).r;
  float a = clamp((m - 0.157) / 0.765, 0.0, 1.0);
  gl_FragColor = vec4(rgb * a, a);
}`;

/** çizer; tuvalde şimdiye kadar görünür piksel olduysa true */
type Renderer = (video: HTMLVideoElement) => boolean;

/** WebGL çiziminin gerçekten görüntü verdiğini doğrulamak için okunan
 *  noktalar (5×5 ızgara). Bazı iPhone'larda video WebGL'e boş gelir. */
const GRID: [number, number][] = [];
for (let i = 1; i <= 5; i++)
  for (let j = 1; j <= 5; j++) GRID.push([i / 6, j / 6]);

/** WebGL çizici; kurulamazsa null */
function makeGL(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext("webgl", {
    premultipliedAlpha: true,
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  const prog = vs && fs ? gl.createProgram() : null;
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  let seen = false;
  const px = new Uint8Array(4);
  return (video) => {
    const w = video.videoWidth;
    const h = Math.floor(video.videoHeight / 2);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    /* görüntü doğrulanana kadar birkaç pikseli oku (sonra okunmaz) */
    if (!seen) {
      for (const [fx, fy] of GRID) {
        gl.readPixels(
          Math.floor(w * fx),
          Math.floor(h * fy),
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          px,
        );
        if (px[3] > 8) {
          seen = true;
          break;
        }
      }
    }
    return seen;
  };
}

/** WebGL yoksa: eski işlemci yöntemi */
function make2D(canvas: HTMLCanvasElement): Renderer | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const buf = document.createElement("canvas");
  const bctx = buf.getContext("2d", { willReadFrequently: true });
  if (!ctx || !bctx) return null;
  return (video) => {
    const w = video.videoWidth;
    const h = Math.floor(video.videoHeight / 2);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      buf.width = w;
      buf.height = h * 2;
    }
    bctx.drawImage(video, 0, 0, w, h * 2);
    const color = bctx.getImageData(0, 0, w, h);
    const mask = bctx.getImageData(0, h, w, h).data;
    const px = color.data;
    for (let i = 0; i < px.length; i += 4) {
      const m = mask[i];
      const a = m < 40 ? 0 : m > 235 ? 255 : ((m - 40) * 255) / 195;
      px[i + 3] = a;
      if (a === 0) px[i] = px[i + 1] = px[i + 2] = 0;
    }
    ctx.putImageData(color, 0, 0);
    return true;
  };
}

export default function AlphaVideo({
  src,
  loop = false,
  onEnded,
  className,
  style,
  flip = false,
  playing = true,
  onStatus,
  onFrame,
  playbackRate = 1,
  fallbackSrc,
}: AlphaVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* En güncel callback / değerler (render sırasında değil, effect'te yazılır) */
  const onFrameRef = useRef(onFrame);
  const onStatusRef = useRef(onStatus);
  const onEndedRef = useRef(onEnded);
  const playingRef = useRef(playing);
  const loopRef = useRef(loop);

  useEffect(() => {
    onFrameRef.current = onFrame;
    onStatusRef.current = onStatus;
    onEndedRef.current = onEnded;
    playingRef.current = playing;
    loopRef.current = loop;
  });

  const report = useCallback((status: string) => {
    onStatusRef.current?.(status);
  }, []);

  const [error, setError] = useState<string | null>(null);
  /** video oynatılamıyor → yedek görsel */
  const [blocked, setBlocked] = useState(false);
  /** en az bir kare çizildi mi (çizilmeden önce yedek görsel görünür) */
  const [hasFrame, setHasFrame] = useState(false);

  /* Kaynak değişince eski durum temizlenir */
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setError(null);
    setBlocked(false);
    setHasFrame(false);
  }

  const webm = src.replace(/\.mp4$/i, ".webm");

  /* yedek görsele geçiş: tek seferlik video ise akış "bitti" sayılır */
  const blockedRef = useRef(false);
  useEffect(() => {
    blockedRef.current = false;
  }, [src]);
  const goFallback = useCallback(() => {
    if (blockedRef.current) return;
    blockedRef.current = true;
    setBlocked(true);
    if (!loopRef.current)
      window.setTimeout(() => onEndedRef.current?.(), FALLBACK_END_MS);
  }, []);

  /* Oynatma hızı */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.defaultPlaybackRate = playbackRate;
    v.playbackRate = playbackRate;
  }, [playbackRate, src]);

  /* Oynat / durdur + oynatılamıyorsa yedek görsel */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!playing) {
      v.pause();
      return;
    }
    v.muted = true;
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch((e: unknown) => {
        /* otomatik oynatma engellendi (düşük güç modu vb.) */
        if ((e as { name?: string })?.name === "NotAllowedError") goFallback();
      });
    }
    /* yüklendiği halde ilerlemiyorsa (oynatma sessizce engellenmiş) ya da
       hiç yüklenemiyorsa yedeğe geç. Yavaş bağlantıda video henüz
       yükleniyorsa BEKLENİR (yoksa önce duran görsel, sonra video
       oynayıp "iki kez tırmanıyor" gibi görünüyordu). */
    const stuck = window.setTimeout(() => {
      if (v.readyState >= 2 && v.currentTime === 0) {
        v.play().catch(() => goFallback());
        window.setTimeout(() => {
          if (v.currentTime === 0) goFallback();
        }, 800);
      }
    }, STUCK_MS);
    const noData = window.setTimeout(() => {
      if (v.readyState < 2) goFallback();
    }, NO_DATA_MS);
    return () => {
      window.clearTimeout(stuck);
      window.clearTimeout(noData);
    };
  }, [playing, src, goFallback]);

  /* Kareleri canvas'a işle */
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const render = makeGL(canvas) ?? make2D(canvas);
    if (!render) {
      goFallback();
      return;
    }

    let stopped = false;
    let rafId = 0;
    let lastT = -1;
    let failed = false;
    let drewOnce = false;
    /** video ilerlediği halde tuvale hiç görüntü gelmeyen kare sayısı */
    let blank = 0;

    const draw = (force = false) => {
      if (failed) return;
      if (!video.videoWidth || video.readyState < 2) return;

      /* Saydam sürüm dikey (üst renk + alt maske) */
      if (video.videoHeight < video.videoWidth) {
        failed = true;
        const msg = `Bu video saydam sürüm değil: ${src}`;
        setError(msg);
        report("HATA: " + msg);
        goFallback();
        return;
      }

      if (!force && video.currentTime === lastT) return;
      lastT = video.currentTime;

      try {
        const visible = render(video);
        if (visible && !drewOnce) {
          drewOnce = true;
          setHasFrame(true);
        }
        /* video oynuyor ama tuval hep boş: bu cihazda çizilemiyor →
           yedek görsel (kişi görünmez kalmasın) */
        if (!visible && video.currentTime > 0 && ++blank > 60) {
          failed = true;
          goFallback();
          return;
        }
        onFrameRef.current?.(video.currentTime);
      } catch (e) {
        failed = true;
        setError(`Video işlenemedi: ${String(e)}`);
        report(`HATA: video işlenemedi: ${String(e)}`);
        goFallback();
      }
    };

    /* yeni kare gelince çiz (destekleyen tarayıcıda yalnızca yeni karede) */
    type RVFC = (cb: () => void) => number;
    const rvfc = (
      video as HTMLVideoElement & { requestVideoFrameCallback?: RVFC }
    ).requestVideoFrameCallback?.bind(video);
    const tick = () => {
      if (stopped) return;
      draw();
      rafId = requestAnimationFrame(tick);
    };
    const onVideoFrame = () => {
      if (stopped) return;
      draw();
      rvfc?.(onVideoFrame);
    };
    /* rVFC duraklatılmış / gizli videoda bazı tarayıcılarda tetiklenmez:
       rAF döngüsü her durumda çalışır, rVFC yalnızca ek tetikleyici */
    rafId = requestAnimationFrame(tick);
    rvfc?.(onVideoFrame);

    report("yükleniyor: " + src);

    const onData = () => draw(true);
    const onPlaying = () => report(`oynuyor (${video.currentSrc.split("/").pop()})`);
    /* Tarayıcı kendiliğinden durdurursa (güç tasarrufu vb.) yeniden başlat */
    const onPause = () => {
      if (playingRef.current && !video.ended) {
        setTimeout(() => video.play().catch(() => {}), 50);
      }
    };
    const onCanPlay = () => {
      if (playingRef.current) video.play().catch(() => {});
    };
    const onErr = () => {
      const code = video.error?.code;
      const msg = `Video hatası (${code ?? "?"}): ${src}`;
      setError(msg);
      report("HATA: " + msg);
      goFallback();
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("loadeddata", onData);
    video.addEventListener("seeked", onData);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onErr);

    if (video.readyState < 2) video.load();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("loadeddata", onData);
      video.removeEventListener("seeked", onData);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onErr);
    };
  }, [src, report, goFallback]);

  /* yedek görsel: video oynatılamıyorsa. Döngülü videoda (koşma) ilk
     kare gelene kadar da görünür; tek seferlik videoda (tırmanma) HAYIR —
     yoksa önce son poz görünüp sonra video baştan oynuyordu */
  const showFallback = !!fallbackSrc && (blocked || (loop && !hasFrame));

  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "visible", ...style }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        preload="auto"
        loop={loop}
        onEnded={() => onEndedRef.current?.()}
        style={HIDDEN_VIDEO_STYLE}
      >
        <source src={webm} type="video/webm" />
        <source
          src={src}
          type="video/mp4"
          onError={() => {
            const msg = `Video bulunamadı: ${src} (public${src} yolunda olmalı)`;
            setError(msg);
            report("HATA: " + msg);
            goFallback();
          }}
        />
      </video>

      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          transform: flip ? "scaleX(-1)" : undefined,
          visibility: blocked ? "hidden" : "visible",
        }}
      />

      {showFallback && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={fallbackSrc}
          alt=""
          aria-hidden
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: flip ? "scaleX(-1)" : undefined,
          }}
        />
      )}

      {IS_DEV && error && <div style={ERROR_STYLE}>{error}</div>}
    </div>
  );
}
