"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

import FinalState from "@/components/ui/FinalState";
import Header from "@/components/layout/Header";
import MobileMenu from "@/components/layout/MobileMenu";
import SocialStrip from "@/components/ui/SocialStrip";
import SocialChip from "@/components/ui/SocialChip";
import SidePort from "@/components/ui/SidePort";
import { POWER_LIGHT_MS, POWER_FADE_MS } from "@/components/ui/GlowConnector";
import ChipPlatform from "@/components/ui/ChipPlatform";
import CircuitTraces from "@/components/ui/CircuitTraces";
import PortraitMorph from "@/components/ui/PortraitMorph";
import { POWER_BUILD_CSS } from "@/components/ui/Poweronbuild";
import CinematicIntro from "@/components/ui/Cinematicintro";
import SiteAvatar, { type AvatarEvent } from "@/components/ui/SiteAvatar";
import {
  useViewport,
  CHIP,
  computeChipLayout,
  buildTraces,
  isStacked,
  designScale,
  type Pt,
} from "@/components/ui/ChipLayout";
import { FaLinkedin, FaGithub, FaInstagram } from "react-icons/fa";
import TypewriterText from "../ui/TypeWriter";
import { IntroStyles, intro, T } from "@/components/ui/Intro";
import SciFiBackground from "../ui/ScifiBackground";

type HeroSectionProps = {
  contentOpacity?: number;
  powered?: boolean;
  /** true: giriş animasyonu oynamaz, bitmiş hal sabit görünür.
   *  Adres "?final=1" ile açılınca (Header'daki HOME) da otomatik açılır. */
  finished?: boolean;
};

type ChipLayoutResult = ReturnType<typeof computeChipLayout>;

/* =========================================================
   SABİTLER
========================================================= */
const MENU_RIGHT = 322;
const PANEL_TOP_STACK = 26;
const PORT_MAX_ROT = 20;
const TEXT_SHIFT_X = 60;

const SUBTITLE_LINES = [
  ">>> CREATIVE AI ARCHITECT",
  "DIGITAL DEVELOPER",
  "SYSTEMS DESIGNER",
];

const CHIP_TILT = 0;
const CHIP_SPIN = -8;
const CHIP_TURN = 0;

/** Kişi fotoğrafı artık çipin içinde (4 parçalı mozaik).
 *  Kadraj: yüz karoların birleştiği merkeze gelecek şekilde ayarla. */
const PROFILE_PHOTO = "/images/PROFİLE.png";
const PHOTO_POSITION = "50% 18%";
const PORTRAIT_ASPECT = 3 / 4;
const PORTRAIT_NUDGE = { x: 0, y: 0 };
const PORTRAIT_IN_RING = 2.1;
const PORTRAIT_EDGE = 0.36;

const STACK_CHIP_DROP = 0.07;
const CHIP_BACK_OPACITY = 0.55;

/** Avatar bir sebeple gelmezse (video yüklenmedi vb.) giriş yine de
 *  tamamlansın diye en geç bu süre sonra her şey açılır (ms) */
const AVATAR_FALLBACK_MS = 16000;
const SOCIAL_COUNT = 3;
const SOCIAL_W = 580;
const CAMERA_OUT_MS = 2200;

const ALL_SHOWN: boolean[] = Array<boolean>(SOCIAL_COUNT).fill(true);

/* =========================================================
   YARDIMCILAR
========================================================= */
function leftXAtY(poly: Pt[], y: number): number | null {
  let best: number | null = null;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    if ((y - y1) * (y - y2) > 0 || y1 === y2) continue;
    const x = x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
    best = best === null ? x : Math.min(best, x);
  }
  return best;
}

const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;

type PortBox = { x: number; y: number; h: number } | null;
type SpotTarget = { x: number; y: number; spread: number };

/** SidePort'un dönüşü + ışık hüzmesinin açısı/uzunluğu */
function computeSpot(p: PortBox, t: SpotTarget) {
  if (!p) return null;
  const pivot = { x: p.x, y: p.y + 17 };
  const aim0 = deg(Math.atan2(-(t.x - pivot.x), t.y - pivot.y));
  const swing = Math.min(PORT_MAX_ROT, Math.max(-PORT_MAX_ROT, aim0 * 0.4));
  const hole = {
    x: pivot.x - 42 * Math.sin(rad(swing)),
    y: pivot.y + 42 * Math.cos(rad(swing)),
  };
  const aim = deg(Math.atan2(-(t.x - hole.x), t.y - hole.y));
  const len = Math.hypot(t.x - hole.x, t.y - hole.y) * 1.12;
  return { swing, beamAngle: aim - swing, len, width: t.spread, t };
}

/** Portrenin boyutu ve çipin ışık halkasına oturduğu yer */
function computePortrait(
  layout: ChipLayoutResult,
  vw: number,
  stacked: boolean,
  textCenter: number,
  textWidth: number,
) {
  const { panel } = layout;
  const ringR = layout.size * CHIP.plateRatio * CHIP.ringRatio;
  const footY = layout.cy + ringR * 1.0 + PORTRAIT_NUDGE.y * layout.size;
  const textEdge = textCenter + textWidth * 0.36;
  const maxW = stacked ? Infinity : vw - panel.right - 12 - textEdge;

  const ph = Math.max(
    40,
    Math.min(
      ringR * 2 * PORTRAIT_IN_RING,
      footY - panel.top - 30,
      maxW / PORTRAIT_ASPECT,
    ),
  );
  const pw = ph * PORTRAIT_ASPECT;
  const visRight = vw - panel.right - 12;
  const cx =
    (stacked ? layout.cx : Math.min(layout.cx, visRight - pw * PORTRAIT_EDGE)) +
    PORTRAIT_NUDGE.x * layout.size;

  return { ringR, footY, ph, pw, cx, cy: footY - ph * 0.64 };
}

/** "?final=1" okuması: sunucuda false, tarayıcıda gerçek değer (hydration güvenli) */
const subscribeNoop = () => () => {};
const readUrlFinal = () =>
  new URLSearchParams(window.location.search).has("final");
const readServerFinal = () => false;

/* =========================================================
   BİLEŞEN
========================================================= */
export default function HeroSection({
  contentOpacity = 1,
  powered: poweredProp = false,
  finished: finishedProp = false,
}: HeroSectionProps) {
  const { w: vw, h: vh } = useViewport();

  const urlFinal = useSyncExternalStore(
    subscribeNoop,
    readUrlFinal,
    readServerFinal,
  );
  const final = finishedProp || urlFinal;

  /* ---------- Giriş durumu (final ise hepsi türetilir, effect'te set edilmez) ---------- */
  const [avatarPoweredRaw, setAvatarPowered] = useState(false);
  const [chipShownRaw, setChipShown] = useState<boolean[]>(() =>
    Array<boolean>(SOCIAL_COUNT).fill(false),
  );
  const [introDone, setIntroDone] = useState(false);
  const [cineGo, setCineGo] = useState(false);
  const [nameLanded, setNameLanded] = useState(false);
  const [portraitLanded, setPortraitLanded] = useState(false);
  const [dim, setDim] = useState(false);
  const [camera, setCamera] = useState<"close" | "out" | "none">("none");

  const avatarPowered = avatarPoweredRaw || final;
  const chipShown = final ? ALL_SHOWN : chipShownRaw;
  const waiting = !final && !introDone;
  const nameReady = final || nameLanded;
  const portraitGo = final || portraitLanded;
  const powered = poweredProp || avatarPowered;

  /* avatar olayları + yedek zamanlayıcı (setState hep callback içinde) */
  useEffect(() => {
    const showAll = () => {
      setAvatarPowered(true);
      setChipShown(ALL_SHOWN);
    };

    const onEvent = (e: Event) => {
      const d = (e as CustomEvent<AvatarEvent>).detail;
      if (d.type === "plugged") setAvatarPowered(true);
      if (d.type === "hop")
        setChipShown((c) => c.map((v, i) => v || i === d.chip));
      if (d.type === "done") showAll();
    };

    window.addEventListener("avatar:event", onEvent);
    const fallback = window.setTimeout(showAll, AVATAR_FALLBACK_MS);

    return () => {
      window.removeEventListener("avatar:event", onEvent);
      window.clearTimeout(fallback);
    };
  }, []);

  /* final: sahne hazır sinyali. Değilse: çipler görünür, sinematik giriş başlar. */
  useEffect(() => {
    if (final) {
      window.dispatchEvent(new Event("hero:built"));
      return;
    }
    const raf = window.requestAnimationFrame(() => setChipShown(ALL_SHOWN));
    const id = window.setTimeout(() => setCineGo(true), 150);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(id);
    };
  }, [final]);

  /* ---------- Yerleşim ---------- */
  const stacked = isStacked(vw, vh);
  const phone = vw < 520;
  const ds = designScale(vw, vh);
  const textScale = Math.min(1.6, Math.max(0.7, ds));
  const socialScale = stacked
    ? Math.min(1, (vw - 24) / SOCIAL_W)
    : Math.min(1.6, Math.max(0.55, ds));

  const STACK_PAD_X = phone ? 46 : 66;
  const stackTextTop = PANEL_TOP_STACK + (phone ? 96 : 124);
  const STACK_TEXT_PAD = phone ? 26 : 56;
  const stackTextW = vw - STACK_TEXT_PAD * 2;
  const stackNameSize = Math.min(
    phone ? 44 : 64,
    Math.floor(stackTextW / (12 * 0.62)),
  );
  const stackTextH = stackNameSize + (phone ? 92 : 104);
  const stackTextBottom = stackTextTop + stackTextH;
  const stackChipBase = stackTextBottom + (phone ? 6 : 10);
  const stackChipTop = stackChipBase + vh * STACK_CHIP_DROP;
  const stackChipMaxH = Math.max(220, vh - stackChipBase + (phone ? -70 : 40));
  const stackChipMaxW = phone ? vw * 1.18 : vw * 1.05;

  const layout = useMemo(() => {
    if (!stacked)
      return computeChipLayout(vw, vh, CHIP_TILT, CHIP_SPIN, CHIP_TURN);
    return computeChipLayout(vw, vh, CHIP_TILT, CHIP_SPIN, CHIP_TURN, {
      top: stackChipTop,
      maxH: stackChipMaxH,
      maxW: stackChipMaxW,
      centerX: vw * 0.5,
    });
  }, [vw, vh, stacked, stackChipTop, stackChipMaxH, stackChipMaxW]);

  const traces = useMemo(() => buildTraces(layout), [layout]);

  const { panel, box, corners } = layout;
  const poly: Pt[] = [corners.T, corners.R, corners.B, corners.L];
  const chipMinX = Math.min(...poly.map((q) => q[0]));

  const menuScale = stacked ? 1 : Math.min(1.6, Math.max(0.55, ds));
  const menuRight = 48 + MENU_RIGHT * menuScale;

  const textY = stacked ? stackTextTop + stackTextH / 2 : vh * 0.42;
  const textRight = (leftXAtY(poly, textY) ?? chipMinX) - 24;
  const textCenter = stacked
    ? vw / 2
    : (menuRight + textRight) / 2 + TEXT_SHIFT_X * menuScale;
  const textWidth = stacked
    ? vw - 32
    : Math.max(
        240,
        2 * Math.min(textCenter - menuRight - 10, textRight - textCenter),
      );

  /* ---------- Portlar + ışık hüzmeleri ---------- */
  const sectionRef = useRef<HTMLElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const cineBackRef = useRef<HTMLDivElement>(null);
  const portRef0 = useRef<HTMLDivElement>(null);
  const portRef1 = useRef<HTMLDivElement>(null);

  const [portBoxes, setPortBoxes] = useState<PortBox[]>([null, null]);

  useEffect(() => {
    const measure = () => {
      const sec = sectionRef.current?.getBoundingClientRect();
      if (!sec) return;
      setPortBoxes(
        [portRef0, portRef1].map((r) => {
          const b = r.current?.getBoundingClientRect();
          return b
            ? {
                x: b.left - sec.left + b.width / 2,
                y: b.top - sec.top,
                h: b.height,
              }
            : null;
        }),
      );
    };

    const t = window.setTimeout(measure, powered ? 0 : 1600);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [vw, vh, powered]);

  const PORTS_LEFT = stacked
    ? vw - 118
    : Math.round((textCenter + layout.cx) / 2) + 130;

  const spotTargets: SpotTarget[] = [
    {
      x: textCenter,
      y: textY + 10,
      spread: Math.min(560, textWidth) * (stacked ? 0.7 : 0.55),
    },
    { x: layout.cx, y: layout.cy, spread: layout.size * 0.6 },
  ];
  const spots = portBoxes.map((p, i) => computeSpot(p, spotTargets[i]));

  /* ---------- Portre + kamera ---------- */
  const PG = computePortrait(layout, vw, stacked, textCenter, textWidth);
  const { ringR, footY, ph, pw, cx } = PG;

  const camScale = Math.max(1.4, Math.min(2.4, (vh * 1.15) / ph));
  const camT = (o: number, size: number) => size / 2 - o;

  const cameraStyle: CSSProperties =
    camera === "none"
      ? {}
      : {
          transformOrigin: `${PG.cx}px ${PG.cy}px`,
          transform:
            camera === "close"
              ? `translate(${camT(PG.cx, vw)}px, ${camT(PG.cy, vh)}px) scale(${camScale})`
              : "translate(0px, 0px) scale(1)",
          transition:
            camera === "out"
              ? `transform ${CAMERA_OUT_MS}ms cubic-bezier(.65,0,.25,1)`
              : "none",
          willChange: "transform",
        };

  const section = (
    <section
      ref={sectionRef}
      className={`relative flex h-dvh w-full flex-col overflow-hidden ${waiting ? "pb-wait" : ""}`}
    >
      <IntroStyles />

      <style>
        {POWER_BUILD_CSS +
          `
        .pb-wait [data-build] { filter: none !important; transition: opacity .35s ease !important; }
      `}
      </style>

      {/* =====================================================
          CSS BACKGROUND — orijinal genişlikte cam panel
          backdrop → zemin üstü, cam panelin altı
          children → cam panelin içi (camın arkasından görünen çizgiler)
      ===================================================== */}

      {/* Zemin + cam panel: bulanıktan nete belirir */}
      <div
        className="absolute inset-0"
        style={intro("introPanel", T.panel, 1.1)}
      >
        <SciFiBackground
          panelInset={{
            left: `${panel.left}px`,
            top: `${panel.top}px`,
            right: `${panel.right}px`,
            bottom: `${panel.bottom}px`,
          }}
          backdrop={
            <div data-build="soft" className="absolute inset-0">
              <CircuitTraces
                traces={traces}
                width={vw}
                height={vh}
                variant="back"
                powered={powered}
                style={{ left: 0, top: 0 }}
                intro={{ delay: T.traces, stagger: T.traceStagger }}
              />
            </div>
          }
        />
      </div>

      {/* =====================================================
          İÇERİK
      ===================================================== */}

      {/* KAMERA: öndeki tüm içerik bu katmanda (arka plan sabit kalır);
          açılışta portreye yakın çekimden yavaşça geri çekilir */}
      <div
        ref={cameraRef}
        className="absolute inset-0 z-10 flex flex-col"
        style={cameraStyle}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && camera === "out")
            setCamera("none");
        }}
      >
        <div
          className="relative z-10 flex flex-1 flex-col"
          style={{ opacity: contentOpacity }}
        >
          {/* Çipin çevresinde net görünen çizgiler */}
          <div
            data-build="soft"
            data-build-delay="0.15"
            className="pointer-events-none absolute inset-0"
          >
            <CircuitTraces
              traces={traces}
              width={vw}
              height={vh}
              variant="front"
              powered={powered}
              focus={{ x: layout.cx, y: layout.cy, r: layout.size * 0.62 }}
              style={{ left: 0, top: 0 }}
              intro={{ delay: T.traces, stagger: T.traceStagger }}
            />
          </div>

          {/* SOL — menü (mobilde çipin altında 2×2 ızgara) */}
          {stacked ? (
            <div
              data-build
              data-build-order="0"
              data-build-shape="frame"
              className="absolute z-5"
              style={{
                left: STACK_PAD_X - 4,
                top: PANEL_TOP_STACK + (phone ? 24 : 38),
                width: 58,
                height: 50,
              }}
            >
              <MobileMenu powered={powered} style={{ left: 0, top: 0 }} />
            </div>
          ) : (
            <div
              data-build
              data-build-order="0"
              data-build-shape="buttons"
              className="absolute top-1/2 left-12"
              style={{
                transform: `translateY(-50%) scale(${menuScale})`,
                transformOrigin: "left center",
              }}
            >
              <Header powered={powered} />
            </div>
          )}

          {/* ORTA — isim + unvan (mobilde sol üstte, iki satır ve büyük) */}
          {stacked ? (
            <div
              data-build
              data-build-order="1"
              data-build-shape="text"
              data-build-text="AYŞE YILMAZ"
              data-build-font={stackNameSize}
              className="absolute z-2 flex flex-col items-center text-center"
              style={{
                left: STACK_TEXT_PAD,
                top: stackTextTop,
                width: stackTextW,
              }}
            >
              <div
                className="flex flex-col items-center"
                style={intro("introUp", 0.2, 0.5)}
              >
                <span
                  className={`mb-2 font-mono tracking-[.24em] transition-colors duration-700 ${phone ? "text-[10px]" : "text-xs"}`}
                  style={{
                    color: avatarPowered
                      ? "rgb(var(--c-6ef5e8,110,245,232))"
                      : "rgba(var(--c-5fb8d0,95,184,208),.55)",
                  }}
                >
                  {">>>"} {avatarPowered ? "SYSTEM ONLINE" : "BOOTING…"}
                </span>

                {/* data-avatar-name: avatar fişi taktıktan sonra bu yazının üstüne zıplar */}
                <h1
                  data-avatar-name
                  className="font-mono leading-[1.05] font-bold whitespace-nowrap text-accent"
                  style={{
                    fontSize: stackNameSize,
                    minHeight: "1.05em",
                    textShadow: "0 0 24px rgba(var(--c-4fd8ff,79,216,255),.35)",
                  }}
                >
                  <TypewriterText
                    text={"AYŞE YILMAZ"}
                    color="rgb(var(--c-c4f7fb,196,247,251))"
                    speed={final ? 0 : 26}
                    scramble={final ? 0 : 180}
                    active={nameReady}
                    startDelay={final ? 0 : 120}
                  />
                </h1>

                <div
                  className="my-3 h-0.5 w-20 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgb(var(--c-6ef5e8,110,245,232)), transparent)",
                    boxShadow: "0 0 8px rgba(var(--c-4fd8ff,79,216,255),.7)",
                  }}
                />

                {/* unvanlar YAN YANA; dar ekranda düzgünce alt satıra sarar */}
                <p
                  className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-accent/80 ${phone ? "text-[11px]" : "text-[15px]"}`}
                >
                  {SUBTITLE_LINES.map((line, i) => (
                    <span
                      key={line}
                      className="flex items-center gap-2 whitespace-nowrap"
                    >
                      {i > 0 && <span className="text-accent/60">·</span>}

                      <TypewriterText
                        color="rgb(var(--c-7fe3ef,127,227,239))"
                        text={i === 0 ? line.replace(">>> ", "") : line}
                        speed={final ? 0 : 9}
                        scramble={final ? 0 : 150}
                        active={nameReady}
                        startDelay={final ? 0 : 300 + i * 90}
                      />
                    </span>
                  ))}
                </p>
              </div>
            </div>
          ) : (
            <div
              data-build
              data-build-order="1"
              data-build-shape="text"
              data-build-text=">>> AYŞE YILMAZ"
              data-build-font={Math.round(36 * textScale)}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 text-center"
              style={{
                left: textCenter,
                top: textY,
                width: Math.min(580 * textScale, textWidth),
              }}
            >
              <div
                className="flex flex-col items-center gap-3"
                style={intro("introUp", 0.2, 0.5)}
              >
                {/* data-avatar-name: avatar fişi taktıktan sonra bu yazının üstüne zıplar */}
                <h1
                  data-avatar-name
                  className="font-mono text-accent"
                  style={{ fontSize: 36 * textScale, minHeight: "1.2em" }}
                >
                  <TypewriterText
                    text=">>> AYŞE YILMAZ"
                    color="rgb(var(--c-c4f7fb,196,247,251))" /* başlık: posterdeki açık turkuaz */
                    speed={final ? 0 : 26}
                    scramble={final ? 0 : 180}
                    active={nameReady}
                    startDelay={final ? 0 : 120} /* ışıklarla aynı anda */
                  />
                </h1>

                {/* Çip büyüdüğü için yazı alanı daraldı: sığmazsa unvanlar
                    alt alta (her satır kendi decode efektiyle) yazılır */}
                {textWidth >= 600 * textScale ? (
                  <p
                    className="font-mono text-accent/80"
                    style={{ fontSize: 14 * textScale }}
                  >
                    <TypewriterText
                      color="rgb(var(--c-7fe3ef,127,227,239))"
                      text=">>> CREATIVE AI ARCHITECT | DIGITAL DEVELOPER | SYSTEMS DESIGNER"
                      speed={final ? 0 : 7}
                      scramble={final ? 0 : 150}
                      active={nameReady}
                      startDelay={final ? 0 : 300}
                    />
                  </p>
                ) : (
                  <p
                    className="flex flex-col items-center gap-1 font-mono text-accent/80"
                    style={{ fontSize: 14 * textScale }}
                  >
                    {SUBTITLE_LINES.map((line, i) => (
                      <TypewriterText
                        key={line}
                        color="rgb(var(--c-7fe3ef,127,227,239))"
                        text={line}
                        speed={final ? 0 : 9}
                        scramble={final ? 0 : 150}
                        active={nameReady}
                        startDelay={final ? 0 : 300 + i * 90}
                      />
                    ))}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* =================================================
              ÇİP — sağ altta, cam panelin kenarlarından taşar.
              Panelin üstünde çizildiği için taşan kısım kesilmez.
          ================================================= */}
          <div
            data-build
            data-piece="chip"
            className="pointer-events-none absolute"
            style={{
              left: box.left,
              top: box.top,
              ...intro("introChip", T.chip, 1.3),
            }}
          >
            {/* çip arkada: biraz soluk ve hafif karanlık → öndeki fotoğraf öne çıkar */}
            <div
              style={{
                opacity: CHIP_BACK_OPACITY,
                filter: "saturate(.8) brightness(.85)",
              }}
            >
              <ChipPlatform
                powered={powered}
                size={layout.size}
                tilt={layout.tilt}
                spin={layout.spin}
                turn={layout.turn}
                /* fotoğraf artık çipin İÇİNDE değil, önünde duruyor (aşağıda) */
                assembleDelay={T.chip + 0.35}
                /* ortası boş: açılışta portre bu boşluktan geçer */
                hollow
              />
            </div>
          </div>

          {/* açılışta yörüngede portrenin ARKASINDAN geçen parçaların katmanı */}
          <div
            ref={cineBackRef}
            className="pointer-events-none absolute inset-0"
            aria-hidden
          />

          {/* =================================================
              PORTRE — çipin ÖNÜNDE duran kişi. Arkasında çipin ışık
              halkası "portal" gibi parlar; ayakları yere doğru söner,
              kenarlarından sıcak ışık vurur, zeminde ışık yansıması.
              En güzel sonuç: arka planı şeffaf (PNG) bir fotoğraf.

              Çipin ortasındaki parlak IŞIK HALKASINA oturur: yatayda halkanın
              merkezinde, alt kısmı halkanın alt kenarında söner, başı halkanın
              üstünden hafifçe taşar.
          ================================================= */}
          <div
            data-portrait
            className="pointer-events-none absolute"
            style={{
              left: cx - pw / 2,
              top: footY - ph,
              width: pw,
              height: ph,
              ...intro("introFade", T.chip + 0.6, 0.8),
            }}
          >
            {/* arkadaki sıcak hale */}
            <div
              className="absolute"
              style={{
                left: "-35%",
                right: "-35%",
                top: "5%",
                bottom: "10%",
                background: `radial-gradient(ellipse 50% 45% at 50% 45%, rgba(var(--photo-edge,70,190,255),${powered ? 0.32 : 0.18}), transparent 72%)`,
                transition: "background 700ms",
              }}
            />

            {/* zemindeki ışık yansıması */}
            <div
              className="absolute"
              style={{
                left: "-20%",
                right: "-20%",
                bottom: "-4%",
                height: "14%",
                background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(var(--photo-edge,70,190,255),${powered ? 0.45 : 0.25}), transparent 75%)`,
              }}
            />

            {/* FOTOĞRAF: açılışta parçacıksız, doğrudan görünür; üzerine
                gelince parçacıklara ayrılma etkileşimi sürer */}
            {portraitGo && (
              <PortraitMorph
                instant={final}
                introless
                src={PROFILE_PHOTO}
                alt="Profil fotoğrafı"
                width={pw}
                height={ph}
                ring={{
                  x: layout.cx - (cx - pw / 2),
                  y: layout.cy - (footY - ph),
                  r: ringR,
                }}
                delay={0}
                tempo={1.1}
                objectPosition={PHOTO_POSITION}
                imgStyle={{
                  /* ayaklara doğru yumuşakça söner (dikdörtgen fotoğrafta da) */
                  WebkitMaskImage:
                    "linear-gradient(to bottom, #000 0%, #000 80%, transparent 99%), linear-gradient(to right, transparent 0%, #000 4%, #000 96%, transparent 100%)",
                  WebkitMaskComposite: "source-in",
                  maskImage:
                    "linear-gradient(to bottom, #000 0%, #000 80%, transparent 99%), linear-gradient(to right, transparent 0%, #000 4%, #000 96%, transparent 100%)",
                  maskComposite: "intersect",
                  /* net ve parlak: hafif kontrast + ince ışık kenarı + sıcak hale;
                     kenarlardan vuran sıcak ışık şeffaf PNG'de silüeti izler */
                  filter: `contrast(1.05) brightness(1.06) drop-shadow(0 0 1.5px rgba(var(--photo-seam,207,230,255),.85)) drop-shadow(0 0 18px rgba(var(--photo-edge,70,190,255),${powered ? 0.55 : 0.35})) drop-shadow(0 18px 24px rgba(0,0,0,.45))`,
                  transition: "filter 700ms",
                }}
              />
            )}
          </div>

          {/* =================================================
              SAĞ ÜST PORTLAR
          ================================================= */}
          <div
            className="absolute flex gap-3"
            style={{
              /* panelin üst kenarından, üstteki fiş soketiyle aynı hizadan sarkar */
              top: panel.top,
              /* yazı ile çipin arasına, ikisine de düzgün ışık tutacak yere */
              left: PORTS_LEFT,
              ...intro("introDown", T.ports, 0.7, "back"),
            }}
          >
            {/* data-avatar-port: avatar fişi bu porta takar.
                Dış kutu sabit (ölçüm/kablo için), içi fiş takılınca sola döner */}
            <div ref={portRef0} data-avatar-port>
              <SidePort
                type="audio"
                lit={powered}
                swing={spots[0]?.swing ?? 0}
                beamAngle={spots[0]?.beamAngle ?? 0}
                beamLength={spots[0]?.len ?? 650}
                beamWidth={spots[0]?.width ?? 420}
              />
            </div>
            <div ref={portRef1}>
              <SidePort
                type="audio"
                lit={powered}
                swing={spots[1]?.swing ?? 0}
                beamAngle={spots[1]?.beamAngle ?? 0}
                beamLength={spots[1]?.len ?? 650}
                beamWidth={spots[1]?.width ?? 420}
              />
            </div>
          </div>

          {/* =================================================
              PORT IŞIĞININ HEDEFTEKİ AYDINLIĞI — ışık hüzmesi SidePort'un
              deliğinden çıkar; burada sadece vurduğu yerde hafif parlama
          ================================================= */}
          {spots.map(
            (sp, i) =>
              sp && (
                <div
                  key={`spot-${i}`}
                  className="pointer-events-none"
                  aria-hidden
                >
                  {/* Işık yanmadan önce bölge daha koyu: ışık gelince açılır */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      left: sp.t.x,
                      top: sp.t.y,
                      width: sp.t.spread * 1.7,
                      height: sp.t.spread * (i === 0 ? 0.95 : 1.5),
                      transform: "translate(-50%, -50%)",
                      background:
                        "radial-gradient(closest-side, rgba(var(--c-040c1a,4,12,26),.62), rgba(var(--c-040c1a,4,12,26),.38) 55%, transparent)",
                      opacity: powered ? 0 : 1,
                      transition: `opacity ${POWER_FADE_MS}ms ease ${powered ? POWER_LIGHT_MS : 0}ms`,
                    }}
                  />

                  <div
                    className="absolute rounded-full"
                    style={{
                      left: sp.t.x,
                      top: sp.t.y,
                      width: sp.t.spread * 1.15,
                      height: sp.t.spread * (i === 0 ? 0.55 : 1),
                      transform: "translate(-50%, -50%)",
                      background:
                        "radial-gradient(closest-side, rgba(var(--c-d7eeff,215,238,255),.18), rgba(var(--c-c8e6ff,200,230,255),.07) 55%, transparent)",
                      mixBlendMode: "screen",
                      opacity: powered ? 1 : 0,
                      transition: `opacity ${POWER_FADE_MS}ms ease ${powered ? POWER_LIGHT_MS : 0}ms`,
                    }}
                  />
                </div>
              ),
          )}

          {/* =================================================
              SOCIAL — cam panelin içinde, alt kenarın hemen üstünde
          ================================================= */}
          <div
            data-build
            data-build-order="2"
            data-build-shape="icons"
            className="absolute"
            style={{
              left: stacked ? vw / 2 : textCenter,
              bottom: panel.bottom + (stacked ? 14 : 20),
              transform: `translateX(-50%) scale(${socialScale})`,
              transformOrigin: "bottom center",
            }}
          >
            <div style={intro("introFade", T.social - 0.15, 0.5)}>
              <SocialStrip>
                <SocialChip
                  icon={FaLinkedin}
                  href="#"
                  shown={chipShown[0]}
                  label="LinkedIn"
                />
                <SocialChip
                  icon={FaGithub}
                  href="#"
                  shown={chipShown[1]}
                  label="GitHub"
                />
                <SocialChip
                  icon={FaInstagram}
                  href="#"
                  shown={chipShown[2]}
                  label="Instagram"
                />
              </SocialStrip>
            </div>
          </div>
        </div>

        {/* ELEKTRİKSİZ HAL: açılış yerleşirken sahne kararır (fotoğraf,
            çip, menü…); fiş takılınca ışıklar yanar ve karanlık kalkar */}
        {!final && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-60"
            style={{
              background:
                "radial-gradient(ellipse 75% 70% at 55% 50%, rgba(3,5,12,.5), rgba(3,5,12,.7))",
              opacity: dim && !powered ? 1 : 0,
              transition: powered
                ? `opacity ${POWER_FADE_MS}ms ease`
                : "opacity 1.3s ease",
            }}
          />
        )}

        {/* =================================================
            AVATAR — panelin arkasından tırmanır, porta fiş takar.
            Section'ın doğrudan çocuğu: transform'lu bir kutunun içine
            konursa "fixed" konumu bozulur ve görünmez.
        ================================================= */}
        <SiteAvatar key={final ? "done" : "intro"} startDone={final} />
      </div>

      {/* SİNEMATİK AÇILIŞ: çekirdek ışık + yörüngedeki parçalar + isim */}
      {!final && (
        <CinematicIntro
          start={cineGo}
          rootRef={cameraRef}
          title={stacked ? "AYŞE YILMAZ" : ">>> AYŞE YILMAZ"}
          titleTarget="[data-avatar-name]"
          backRef={cineBackRef}
          focus={{
            x: cx,
            y: footY - ph / 2,
            size: Math.max(pw, ph),
          }}
          ring={{ x: layout.cx, y: layout.cy, r: ringR }}
          chipAngle={CHIP_SPIN + 45}
          onTitleLanded={() => setNameLanded(true)}
          onCoreLanded={() => setPortraitLanded(true)}
          onSettle={() => setDim(true)}
          /* avatar açılış bitmeden tırmanıp portta bekler */
          onAvatarGo={() => window.dispatchEvent(new Event("hero:built"))}
          onDone={() => {
            setIntroDone(true);
            /* sahne tamam → fiş HEMEN takılır */
            window.dispatchEvent(new Event("hero:plug"));
          }}
        />
      )}
    </section>
  );

  return final ? <FinalState>{section}</FinalState> : section;
}
