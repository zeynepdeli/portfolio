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
 * Her kare canvas'a çizilir, maske saydamlığa çevrilir.
 *
 * Sağlamlık:
 *  - Aynı adlı .webm varsa önce onu dener, yoksa .mp4 (iki dosya da
 *    public/video içinde dursun).
 *  - Kareler requestAnimationFrame ile çizilir (gizli videoda
 *    requestVideoFrameCallback bazı Chrome sürümlerinde hiç tetiklenmiyor).
 *  - Tarayıcı oynatmayı engellerse tekrar dener.
 *  - Video karesi hiçbir durumda görünmez; sadece kişi görünür.
 *  - Geliştirme modunda hata olursa kutunun içinde KIRMIZI yazıyla
 *    nedenini gösterir (dosya bulunamadı, çözülemedi vb.).
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
};

const IS_DEV = process.env.NODE_ENV !== "production";

const HIDDEN_VIDEO_STYLE: CSSProperties = {
  /* Gizli ama ekranda: opacity 0 / display:none olursa bazı
     tarayıcılar videoyu çözmeyi bırakıyor. Video karesi asla
     görünmez; yalnızca canvas'taki kişi görünür. */
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
}: AlphaVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* En güncel callback / değerler (render sırasında değil, effect'te yazılır) */
  const onFrameRef = useRef(onFrame);
  const onStatusRef = useRef(onStatus);
  const onEndedRef = useRef(onEnded);
  const playingRef = useRef(playing);

  useEffect(() => {
    onFrameRef.current = onFrame;
    onStatusRef.current = onStatus;
    onEndedRef.current = onEnded;
    playingRef.current = playing;
  });

  const report = useCallback((status: string) => {
    onStatusRef.current?.(status);
  }, []);

  const [error, setError] = useState<string | null>(null);

  /* Kaynak değişince eski hata mesajı temizlenir */
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setError(null);
  }

  const webm = src.replace(/\.mp4$/i, ".webm");

  /* Oynatma hızı */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.defaultPlaybackRate = playbackRate;
    v.playbackRate = playbackRate;
  }, [playbackRate, src]);

  /* Oynat / durdur */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.muted = true;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [playing, src]);

  /* Kareleri canvas'a işle */
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const buf = document.createElement("canvas");
    const bctx = buf.getContext("2d", { willReadFrequently: true });
    if (!ctx || !bctx) return;

    let stopped = false;
    let rafId = 0;
    let lastT = -1;
    let failed = false;

    const draw = (force = false) => {
      if (failed) return;
      const w = video.videoWidth;
      const h = Math.floor(video.videoHeight / 2);
      if (!w || !h || video.readyState < 2) return;

      /* Saydam sürüm dikey (üst renk + alt maske). Yatay video gelirse
         bu senin orijinal videon demektir → çizme, uyar. */
      if (video.videoHeight < video.videoWidth) {
        failed = true;
        const msg = `Bu video saydam sürüm değil: ${src} — zeynep-*.mp4 dosyalarını kullan`;
        setError(msg);
        report("HATA: " + msg);
        console.error("[AlphaVideo]", msg);
        return;
      }

      if (!force && video.currentTime === lastT) return;
      lastT = video.currentTime;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        buf.width = w;
        buf.height = h * 2;
      }

      try {
        bctx.drawImage(video, 0, 0, w, h * 2);
        const color = bctx.getImageData(0, 0, w, h);
        const mask = bctx.getImageData(0, h, w, h).data;
        const px = color.data;

        /* Maskedeki sıkıştırma gürültüsü kare gibi görünmesin:
           koyu değerler tamamen saydam, kenarlar yumuşak kalır */
        for (let i = 0; i < px.length; i += 4) {
          const m = mask[i];
          const a = m < 40 ? 0 : m > 235 ? 255 : ((m - 40) * 255) / 195;
          px[i + 3] = a;
          if (a === 0) px[i] = px[i + 1] = px[i + 2] = 0;
        }

        ctx.putImageData(color, 0, 0);
        onFrameRef.current?.(video.currentTime);
      } catch (e) {
        failed = true;
        setError(`Canvas işlenemedi: ${String(e)}`);
        report(`HATA: canvas işlenemedi: ${String(e)}`);
        console.error("[AlphaVideo] canvas işlenemedi:", e);
      }
    };

    /* İlk kare de bu döngüde çizilir (lastT = -1 olduğundan) */
    const tick = () => {
      if (stopped) return;
      draw();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    report("yükleniyor: " + src);

    const fileName = () => video.currentSrc.split("/").pop();

    let reportedPlay = false;

    const onData = () => {
      draw(true);
      report(
        `yüklendi ${video.videoWidth}x${video.videoHeight} (${fileName()})`,
      );
    };

    const onPlaying = () => {
      if (reportedPlay) return;
      reportedPlay = true;
      report(
        `oynuyor ${video.videoWidth}x${video.videoHeight} (${fileName()})`,
      );
    };

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
      const msg =
        code === 4
          ? `Video açılamadı/bulunamadı: ${src}`
          : code === 3
            ? `Video çözülemedi: ${src}`
            : `Video hatası (${code ?? "?"}): ${src}`;
      setError(msg);
      report("HATA: " + msg);
      console.error("[AlphaVideo]", msg);
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("loadeddata", onData);
    video.addEventListener("seeked", onData);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onErr);

    /* Kaynak zaten yüklendiyse rAF döngüsü ilk karede çizer;
       değilse yüklemeyi başlat */
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
  }, [src, report]);

  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "visible", ...style }}
    >
      {/* Hata <source> etiketlerinde oluşur; sonuncusu da başarısız
          olursa video "error" vermez, bu yüzden sonuncuyu dinliyoruz */}
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
            console.error("[AlphaVideo]", msg);
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
        }}
      />

      {IS_DEV && error && <div style={ERROR_STYLE}>{error}</div>}
    </div>
  );
}
