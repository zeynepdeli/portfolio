"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/* ================================================================
   ŞEFFAF ARKA PLANLI VİDEO (el sallama)
   Video dosyası "üst-alt" (stacked alpha) biçimde: üst yarıda renkler,
   alt yarıda şeffaflık maskesi (beyaz = görünür). WebGL ile birleştirilip
   arka planı şeffaf bir tuval olarak çizilir. Böylece Chrome, Firefox,
   Safari ve iPhone'da aynı tek MP4 dosyası çalışır.

   play=true olunca baştan BİR KEZ oynar, bitince onEnded çağrılır ve
   son karede durur. WebGL yoksa hemen onEnded çağrılır (yerine
   duran fotoğraf gösterilir).
================================================================ */

type Props = {
  src: string;
  play: boolean;
  onEnded?: () => void;
  /** video GERÇEKTEN oynamaya başlayıp ilk kareyi çizdiğinde (fotoğraf
   *  ancak o zaman gizlenmeli: yoksa boş kare → yanıp sönme) */
  onStart?: () => void;
  className?: string;
  style?: CSSProperties;
};

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() {
  uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D tex;
varying vec2 uv;
void main() {
  vec3 rgb = texture2D(tex, vec2(uv.x, uv.y * 0.5)).rgb;
  float a = texture2D(tex, vec2(uv.x, 0.5 + uv.y * 0.5)).r;
  a = smoothstep(0.04, 0.96, a);
  gl_FragColor = vec4(rgb * a, a);
}`;

/** çizimi doğrulamak için okunan noktalar (tuvalin oranı; alttan) */
const SAMPLE_POINTS: [number, number][] = [
  [0.5, 0.5],
  [0.5, 0.65],
  [0.45, 0.35],
  [0.55, 0.75],
  [0.5, 0.25],
];

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

export default function WaveVideo({
  src,
  play,
  onEnded,
  onStart,
  className = "",
  style,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<(() => void) | null>(null);
  const failRef = useRef<(() => void) | null>(null);
  /** tuvalde gerçekten görüntü var mı (bazı iPhone'larda video WebGL'e
   *  boş/siyah gelir: o zaman fotoğraf hiç gizlenmez) */
  const visibleRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  const onStartRef = useRef(onStart);

  useEffect(() => {
    onEndedRef.current = onEnded;
    onStartRef.current = onStart;
  });

  /* WebGL kurulumu + kare çizimi */
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      alpha: true,
      antialias: false,
    });
    const vs = gl && compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl && vs && fs ? gl.createProgram() : null;
    if (!gl || !vs || !fs || !prog) {
      drawRef.current = null;
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
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

    const draw = () => {
      if (video.readyState < 2 || !video.videoWidth) return;
      const w = video.videoWidth;
      const h = video.videoHeight / 2;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      try {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          video,
        );
      } catch {
        /* video okunamıyorsa (ör. başka alan adından CORS'suz): fotoğrafa geç */
        drawRef.current = null;
        failRef.current?.();
        return;
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      /* ilk karelerde çizimi doğrula: ortadaki birkaç noktada görünür
         piksel var mı? (yalnızca doğrulanana kadar; sonra okunmaz) */
      /* readPixels ekran kartını bekletir: 3 karede bir bakılır */
      if (!visibleRef.current && video.currentTime > 0 && checks++ % 3 === 0) {
        const px = new Uint8Array(4);
        for (const [fx, fy] of SAMPLE_POINTS) {
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
            visibleRef.current = true;
            break;
          }
        }
        blankFrames += visibleRef.current ? 0 : 1;
        /* uzun süre boş kare geliyorsa: video bu cihazda çizilemiyor */
        if (!visibleRef.current && blankFrames > 8) failRef.current?.();
      }
    };
    let blankFrames = 0;
    let checks = 0;
    drawRef.current = draw;

    /* ilk kare: oynamadan önce de çizilsin (fotoğrafla aynı kare) */
    video.addEventListener("loadeddata", draw);
    video.addEventListener("seeked", draw);
    draw();

    return () => {
      video.removeEventListener("loadeddata", draw);
      video.removeEventListener("seeked", draw);
      drawRef.current = null;
    };
  }, [src]);

  /* oynatma: play=true olunca baştan bir kez */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !play) return;

    if (!drawRef.current) {
      onEndedRef.current?.();
      return;
    }

    let raf = 0;
    let stopped = false;
    type RVFC = (cb: () => void) => number;
    const rvfc = (
      video as HTMLVideoElement & { requestVideoFrameCallback?: RVFC }
    ).requestVideoFrameCallback?.bind(video);

    let started = false;
    visibleRef.current = false;
    const loop = () => {
      if (stopped) return;
      drawRef.current?.();
      /* fotoğraf ancak videonun karesi tuvalde GERÇEKTEN göründüğünde
         gizlenir */
      if (!started && visibleRef.current) {
        started = true;
        onStartRef.current?.();
      }
      if (rvfc) rvfc(loop);
      else raf = requestAnimationFrame(loop);
    };

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      stopped = true;
      drawRef.current?.();
      onEndedRef.current?.();
    };
    failRef.current = () => {
      video.pause();
      finish();
    };

    video.addEventListener("ended", finish);
    video.currentTime = 0;
    video
      .play()
      .then(loop)
      .catch(() => finish()); // otomatik oynatma engellenirse fotoğrafa geç
    /* bazı cihazlar (iPhone düşük güç modu vb.) play()'i ne reddeder ne
       oynatır: video 2 sn içinde ilerlemezse fotoğrafa geç (portre
       görünmez kalmasın) */
    const stall = window.setTimeout(() => {
      if (video.currentTime === 0) {
        video.pause();
        finish();
      }
    }, 2000);

    return () => {
      stopped = true;
      window.clearTimeout(stall);
      cancelAnimationFrame(raf);
      failRef.current = null;
      video.removeEventListener("ended", finish);
    };
  }, [play]);

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        crossOrigin="anonymous"
        preload="auto"
        aria-hidden
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          /* 0 olursa iPhone Safari videoyu çözmeyip WebGL'e boş kare
             verebiliyor */
          opacity: 0.001,
          pointerEvents: "none",
        }}
      />
      <canvas ref={canvasRef} className={className} style={style} aria-hidden />
    </>
  );
}
