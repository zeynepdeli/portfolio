"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

import FinalState from "@/components/ui/FinalState";
import Header from "@/components/layout/Header";
import MobileMenu, {
  MENU_BTN_H,
  MENU_BTN_W,
} from "@/components/layout/MobileMenu";
import SocialStrip from "@/components/ui/SocialStrip";
import SocialChip from "@/components/ui/SocialChip";
import SidePort from "@/components/ui/SidePort";
import { POWER_LIGHT_MS, POWER_FADE_MS } from "@/components/ui/GlowConnector";
import ChipPlatform from "@/components/ui/ChipPlatform";
import CircuitTraces from "@/components/ui/CircuitTraces";
import PortraitMorph from "@/components/ui/PortraitMorph";
import WaveVideo from "@/components/ui/WavevVideo";
import { POWER_BUILD_CSS } from "@/components/ui/PowerOnBuild";
import CinematicIntro from "@/components/ui/CinematicIntro";
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
import { FaLinkedin, FaGithub, FaInstagram, FaWhatsapp } from "react-icons/fa";
import {
  GITHUB,
  INSTAGRAM,
  LINKEDIN,
  WHATSAPP,
} from "@/components/ui/SocialLinks";
import { IntroStyles, intro, T } from "@/components/ui/Intro";
import SciFiBackground from "../ui/ScifiBackground";
import { WAVE_VIDEO_SRC } from "@/components/ui/assets";
import { useLang } from "@/i18n/lang";

type HeroSectionProps = {
  contentOpacity?: number;
  powered?: boolean;
  /** true: giriş animasyonu oynamaz, bitmiş hal sabit görünür.
   *  Adres "?final=1" ile açılınca (Header'daki HOME) da otomatik açılır. */
  finished?: boolean;
  /** true: üstteki sokette fiş TAKILI çizilir. Avatar sayfadan çıkıp
   *  gizlenince (sayfa geçişi) fiş sokette kalmaya devam etsin diye. */
  plugged?: boolean;
};

type ChipLayoutResult = ReturnType<typeof computeChipLayout>;

/* =========================================================
   SABİTLER
========================================================= */
const MENU_RIGHT = 322;
const PANEL_TOP_STACK = 34; // SiteAvatar PANEL_TOP_CSS ile aynı
const PORT_MAX_ROT = 20;
/** Yazı bloğunun menü–çip arası ortadan kayması (px, menü ölçeğiyle).
 *  Negatif → sola. */
const TEXT_SHIFT_X = -40;

/** İsim (başlık) fontu: layout.tsx'teki --font-display (Chakra Petch);
 *  yüklenemezse eski mono font */
const NAME_FONT: CSSProperties = {
  fontFamily: "var(--font-display), var(--font-geist-mono), monospace",
  fontWeight: 700,
  letterSpacing: "0.06em",
};

/* =========================================================
   METİNLER — isim ve unvanlar tek yerden değişir
========================================================= */
const NAME = "ZEYNEP DELİ";
/* unvan dile göre (i18n/dict → hero.role); yazı hesapları bileşende */
/** Teknolojiler: istediğin gibi ekle / çıkar */
const STACK = ["REACT", "REACT NATIVE", "NEXT.JS", "NODE.JS", "TYPESCRIPT"];

/** Dar yerde alt alta yazılan satırlar */
const subtitleLines = (role: string) => [role, STACK.join(" · ")];
/** Geniş yerde tek satır */
const subtitleOneLine = (role: string) =>
  `${role} | ${STACK.join(" | ")}`;
/** terminal istemi (footer'daki commit satırıyla aynı): "~/zeynep $" */
const PROMPT_PATH = "~/zeynep";

const CHIP_TILT = 0;
const CHIP_SPIN = -8;
const CHIP_TURN = 0;

/** Kişi fotoğrafı artık çipin içinde (4 parçalı mozaik).
 *  Kadraj: yüz karoların birleştiği merkeze gelecek şekilde ayarla. */
/* PORTRE = EL SALLAYAN KİŞİ (arka planı şeffaf)
   Sayfa ilk açılıp portreye ilk ışık tutulduğunda video BİR KEZ oynar (el sallar),
   sonra son karede durur. Video oynamazken aynı karelerin PNG'si gösterilir
   (üzerine gelince parçacık etkisi bu PNG ile çalışır).
   Dosyalar: public/videos/zeynep-wave.mp4, public/images/zeynep-wave-*.webp */
const WAVE_VIDEO = WAVE_VIDEO_SRC;
const WAVE_START = "/images/zeynep-wave-start.webp"; // videonun ilk karesi
const WAVE_END = "/images/zeynep-wave-end.webp"; // videonun son karesi
/** video karesi portreden geniştir (kol yana açılınca taşmasın diye):
    genişlik / yükseklik. Sol kenarı ve boyu portreyle birebir aynı. */
const WAVE_ASPECT = 840 / 720;
const PHOTO_POSITION = "50% 18%";
const PORTRAIT_ASPECT = 3 / 4;
/** Portrenin halka merkezine göre kayması (çip boyuna oran).
 *  x < 0 → sola. Alt kenar her zaman halkanın alt kenarında kalır. */
const PORTRAIT_NUDGE = { x: -0.085, y: 0.018 }; // biraz sola ve aşağı
/** Portre boyu bu halka oranına göre hesaplanır (halka genişlese de
 *  portre aynı boyda kalsın diye orta daireden bağımsız) */
const PORTRAIT_RING_RATIO = 0.215;
const PORTRAIT_IN_RING = 2.35; // portre biraz daha büyük (eskiden 2.1)

const STACK_CHIP_DROP = 0.02; // mobilde çip yazının hemen altından başlar → daha büyük
const CHIP_BACK_OPACITY = 0.55;

/** Avatar bir sebeple gelmezse (video yüklenmedi vb.) giriş yine de
 *  tamamlansın diye en geç bu süre sonra her şey açılır (ms) */
const AVATAR_FALLBACK_MS = 32000; // açılış + avatar yavaşladı
const SOCIAL_COUNT = 4;
const SOCIAL_W = 710; // 4 çip (WhatsApp eklendi)
const CAMERA_OUT_MS = 2200;

const ALL_SHOWN: boolean[] = Array<boolean>(SOCIAL_COUNT).fill(true);

/* =========================================================
   AÇILIŞ
   CINEMATIC_INTRO = true → sinematik açılış (ışık, aydınlatma…).
   Sahne karardığı AN avatar tırmanmaya başlar: fişi takınca ışıklar
   yanar, karanlıkta bekleme kısa sürer.
   false → sinematik açılış olmadan, doğrudan aydınlık açılır.
========================================================= */
const CINEMATIC_INTRO = true;
/** hızlı açılışta avatarın tırmanmaya başlaması (ms) */
const QUICK_INTRO_MS = 700;
/** terminal yazma hızı (harf / sn) */
const TYPE_CPS_NAME = 38;
/** açılış oturduktan sonra avatarın tırmanmaya başlaması (ms) */
const AVATAR_START_MS = 3500;
/* alt yazı terminalde elle yazılıyormuş gibi (footer'daki commit
   satırına yakın hız) */
const TYPE_CPS_TEXT = 32;
/** isim yazılmaya başlama gecikmesi (ms) */
const TYPE_NAME_DELAY = 180;
/** isim yazıldıktan sonra alt yazının başlama gecikmesi (ms).
 *  Sinematik açılışta isim uçarak gelir (yazılmaz): alt yazı hemen başlar */
const nameTypeMs = (text: string) =>
  CINEMATIC_INTRO
    ? 150
    : TYPE_NAME_DELAY + (text.length * 1000) / TYPE_CPS_NAME + 80;
/** mobilde teknolojiler unvandan sonra sırayla yazılır */
const stackDelay = (role: string, i: number) =>
  nameTypeMs(NAME) +
  ((role.length + STACK.slice(0, i).join("").length) * 1000) /
    TYPE_CPS_TEXT;

/* =========================================================
   TERMİNAL YAZISI — harf harf yazılır, yanıp sönen imleçle.
   Karışık / rastgele karakter YOK. Tam metnin yeri baştan ayrılır
   (görünmez kopya): yazılırken satır kaymaz, titremez.
========================================================= */
function TerminalText({
  text,
  color,
  active,
  instant = false,
  delay = 0,
  cps = TYPE_CPS_TEXT,
  keepCursor = false,
  bend = false,
  prompt = false,
}: {
  /** başında terminal istemi ("~/zeynep $"): baştan görünür, yazı
   *  onun arkasından yazılır (footer'daki commit satırı gibi) */
  prompt?: boolean;
  text: string;
  color?: string;
  active: boolean;
  instant?: boolean;
  delay?: number;
  cps?: number;
  /** yazı bitince imleç yanıp sönmeye devam etsin */
  keepCursor?: boolean;
  /** harfler ayrı kutularda: avatar bastığında tek tek ezilip eğilir */
  bend?: boolean;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active || instant) return;
    const start = performance.now() + delay;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(
        text.length,
        Math.max(0, Math.floor(((now - start) * cps) / 1000)),
      );
      setN(k);
      if (k < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, instant, text, delay, cps]);

  const shown = instant ? text.length : active ? n : 0;
  const typing = !instant && active && shown > 0 && shown < text.length;
  const cursor = typing || (keepCursor && shown === text.length);
  const promptEl = prompt && (
    <>
      <span style={{ color: "rgb(var(--c-5df2a6,93,242,166))" }}>
        {PROMPT_PATH}
      </span>
      <span style={{ color: "rgb(var(--c-46beff,70,190,255))" }}> $ </span>
    </>
  );

  return (
    <span className="relative inline-block" style={{ color }}>
      <span aria-hidden className="invisible">
        {promptEl}
        {text}
      </span>
      {/* harfler ayrı kutudayken satır harf aralarından KIRILMASIN
          (eskiden "DELİ" → "DEL" + alt satırda "İ" oluyordu) */}
      <span
        /* hizalama dıştaki kutudan gelir: iki satıra inen yazı (unvan +
           teknolojiler) bitince görünmez kopyayla birebir aynı yerde durur */
        className={`absolute inset-0 ${bend ? "whitespace-nowrap" : ""}`}
        aria-label={text}
      >
        {promptEl}
        {bend
          ? Array.from(text.slice(0, shown)).map((ch, i) => (
              <span
                key={i}
                data-bend
                className="inline-block origin-bottom whitespace-pre"
              >
                {ch}
              </span>
            ))
          : text.slice(0, shown)}
        {/* imleç footer'daki gibi: yanıp sönen alt çizgi */}
        {cursor && (
          <span
            aria-hidden
            className="term-cursor ml-px"
            style={{ color: "rgb(var(--c-a8eef6,168,238,246))" }}
          >
            _
          </span>
        )}
      </span>
    </span>
  );
}

const TERMINAL_CSS = `
  .term-cursor { animation: termBlink 1s steps(1) infinite; }
  @keyframes termBlink { 50% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .term-cursor { animation: none; } }
`;

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

/** SidePort'un dönüşü + ışık hüzmesinin açısı/uzunluğu.
 *  maxRot: port gövdesinin en fazla dönüşü (derece)
 *  follow: hedef açısının ne kadarını gövde döner (gerisini ışık kırar).
 *  Hedef çok yandaysa gövde ona doğru dönmeli; yoksa ışık gövdenin
 *  yanından fışkırıyor gibi görünür. */
function computeSpot(
  p: PortBox,
  t: SpotTarget,
  maxRot = PORT_MAX_ROT,
  follow = 0.4,
  overshoot = 1.12,
) {
  if (!p) return null;
  const pivot = { x: p.x, y: p.y + 17 };
  const aim0 = deg(Math.atan2(-(t.x - pivot.x), t.y - pivot.y));
  const swing = Math.min(maxRot, Math.max(-maxRot, aim0 * follow));
  const hole = {
    x: pivot.x - 42 * Math.sin(rad(swing)),
    y: pivot.y + 42 * Math.cos(rad(swing)),
  };
  const aim = deg(Math.atan2(-(t.x - hole.x), t.y - hole.y));
  /* overshoot: ışığın hedefin ne kadar ötesine uzandığı */
  const len = Math.hypot(t.x - hole.x, t.y - hole.y) * overshoot;
  return { swing, beamAngle: aim - swing, len, width: t.spread, t };
}

/** Portrenin boyutu ve çipin ışık halkasına oturduğu yer.
 *  Portre HER ZAMAN çipin orta dairesine (ışık halkasına) hizalı:
 *  yatayda halkanın merkezinde, alt kenarı halkanın alt kenarında.
 *  Boyu çiple orantılı (çip ölçeği yüksekliğe bağlı → ekran daralınca
 *  portre kısalmaz). */
function computePortrait(
  layout: ChipLayoutResult,
  _vw: number,
  _stacked: boolean,
  _textCenter: number,
  _textWidth: number,
) {
  const { panel } = layout;
  const ringR = layout.size * CHIP.plateRatio * CHIP.ringRatio;
  /* halkanın ekrandaki alt kenarı (perspektif dahil) */
  const footY = layout.ring.y + layout.ring.ry + PORTRAIT_NUDGE.y * layout.size;

  /* boy orta dairenin genişliğinden bağımsız: halka büyüse de portre aynı */
  const designed =
    layout.size * CHIP.plateRatio * PORTRAIT_RING_RATIO * 2 * PORTRAIT_IN_RING;
  /* yalnızca panelin üst kenarına sığmazsa kısalır */
  const ph = Math.max(40, Math.min(designed, footY - panel.top - 30));
  const pw = ph * PORTRAIT_ASPECT;
  const cx = layout.ring.x + PORTRAIT_NUDGE.x * layout.size;

  return { ringR, footY, ph, pw, cx, cy: footY - ph * 0.64 };
}

/* portrenin alt kenarındaki sönme + yan kenarlarda ince sönme */
const PORTRAIT_MASK = {
  WebkitMaskImage:
    "linear-gradient(to bottom, #000 0%, #000 92%, transparent 100%), linear-gradient(to right, transparent 0%, #000 4%, #000 96%, transparent 100%)",
  WebkitMaskComposite: "source-in",
  maskImage:
    "linear-gradient(to bottom, #000 0%, #000 92%, transparent 100%), linear-gradient(to right, transparent 0%, #000 4%, #000 96%, transparent 100%)",
  maskComposite: "intersect",
} as const;

/* net ve parlak: hafif kontrast + ince ışık kenarı + hale; kenarlardan
   vuran ışık şeffaf görselde silüeti izler (fotoğraf ve video aynı) */
/* Portrenin rengi. Işıltı ve gölge ARTIK FİLTRE DEĞİL (aşağıdaki
   PortraitGlow): üç katlı drop-shadow, el sallama videosunun her
   karesinde yeniden hesaplanıyordu — iPhone Safari drop-shadow'u
   hızlandıramadığı için portre takılıyor, kare kare kırpışıyordu. */
const portraitFilter = () => "contrast(1.05) brightness(1.06)";

/** Portrenin ışıltısı ve yere düşen gölgesi: fotoğrafın siluetinden
 *  (maske) bir kez bulanıklaştırılmış SABİT katmanlar. Video oynarken
 *  yeniden çizilmez; açık / kapalı ışık yalnızca opaklıkla değişir. */
function PortraitGlow({ powered }: { powered: boolean }) {
  /* siluet × alttan solma (fotoğrafın alt kenarı gibi erir) */
  const fade = "linear-gradient(to bottom, #000 0%, #000 80%, transparent 97%)";
  const sil = {
    WebkitMaskImage: `url(${WAVE_START}), ${fade}`,
    maskImage: `url(${WAVE_START}), ${fade}`,
    WebkitMaskComposite: "source-in",
    maskComposite: "intersect",
    WebkitMaskSize: "cover, 100% 100%",
    maskSize: "cover, 100% 100%",
    WebkitMaskPosition: `${PHOTO_POSITION}, 0 0`,
    maskPosition: `${PHOTO_POSITION}, 0 0`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  } as const;
  return (
    <>
      {/* yere düşen gölge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          transform: "translateY(18px)",
          filter: "blur(12px)",
          opacity: 0.45,
        }}
      >
        <div className="absolute inset-0 bg-black" style={sil} />
      </div>
      {/* çevresindeki mavi ışıltı */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          filter: "blur(9px)",
          opacity: powered ? 0.75 : 0.5,
          transition: "opacity 700ms",
        }}
      >
        <div
          className="absolute"
          style={{
            ...sil,
            inset: "-2%",
            background: "rgb(var(--photo-edge,70,190,255))",
          }}
        />
      </div>
    </>
  );
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
  plugged: pluggedProp = false,
}: HeroSectionProps) {
  const { w: vw, h: vh } = useViewport();
  const { t } = useLang();
  const ROLE = t("hero.role");
  const SUBTITLE_LINES_ = subtitleLines(ROLE);
  const SUBTITLE_ONE_LINE_ = subtitleOneLine(ROLE);

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
  /* el sallama videosu bitti mi (bitince son karenin fotoğrafı kalır) */
  const [waveEnded, setWaveEnded] = useState(false);
  /* video bitip söndükten sonra tuvali kaldır (görünmez de olsa GPU'da
     ayrı bir katman olarak yer tutuyordu) */
  const [waveGone, setWaveGone] = useState(false);
  useEffect(() => {
    if (!waveEnded) return;
    const t = window.setTimeout(() => setWaveGone(true), 900);
    return () => window.clearTimeout(t);
  }, [waveEnded]);
  /* video gerçekten oynamaya başladı mı (ilk kare çizildi) */
  const [waveStarted, setWaveStarted] = useState(false);
  const [dim, setDim] = useState(false);
  const [camera, setCamera] = useState<"close" | "out" | "none">("none");

  const avatarPowered = avatarPoweredRaw || final;
  const chipShown = final ? ALL_SHOWN : chipShownRaw;
  const waiting = !final && !introDone;
  const nameReady = final || nameLanded;
  const portraitGo = final || portraitLanded;
  const powered = poweredProp || avatarPowered;
  /* açılıştaki İLK ışıkta (sinematik girişte portre ışığın altına
     oturduğu an) video oynar — yalnızca ilk açılışta */
  const wavePlaying = !final && portraitGo && !waveEnded;
  const waveShowEnd = final || waveEnded;

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

  /* AVATARI BAŞLAT (bir kez, AVATAR_START_MS gecikmeyle): tırmanır, porta
     yürür, fişi takar */
  const avatarTimer = useRef(0);
  /* avatar yola çıktı mı: soketi gösteren lazer ANCAK o zaman yanar
     (açılış animasyonu bitip her şey yerine oturduktan sonra) */
  const [avatarGoing, setAvatarGoing] = useState(false);
  const startAvatar = useCallback(() => {
    if (avatarTimer.current) return;
    avatarTimer.current = window.setTimeout(() => {
      setAvatarGoing(true);
      window.dispatchEvent(new Event("hero:built"));
      window.dispatchEvent(new Event("hero:plug"));
    }, AVATAR_START_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(avatarTimer.current), []);

  /* final: sahne hazır sinyali. Değilse: çipler görünür, sinematik giriş başlar. */
  useEffect(() => {
    if (final) {
      window.dispatchEvent(new Event("hero:built"));
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      setChipShown(ALL_SHOWN);
      /* hızlı açılış: portre ve isim hemen hazır (karanlık bekleme yok) */
      if (!CINEMATIC_INTRO) {
        setNameLanded(true);
        setPortraitLanded(true);
      }
    });
    if (!CINEMATIC_INTRO) {
      const t = window.setTimeout(() => {
        setIntroDone(true);
        setAvatarGoing(true);
        window.dispatchEvent(new Event("hero:built"));
        window.dispatchEvent(new Event("hero:plug"));
      }, QUICK_INTRO_MS);
      return () => {
        window.cancelAnimationFrame(raf);
        window.clearTimeout(t);
      };
    }
    /* bekleme yok: sahne kurulur kurulmaz ışık yanık başlar */
    const id = window.requestAnimationFrame(() => setCineGo(true));
    return () => {
      window.cancelAnimationFrame(raf);
      window.cancelAnimationFrame(id);
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
  const stackTextTop = PANEL_TOP_STACK + (phone ? 84 : 110);
  const STACK_TEXT_PAD = phone ? 26 : 56;
  const stackTextW = vw - STACK_TEXT_PAD * 2;
  const stackNameSize = Math.min(
    phone ? 44 : 64,
    Math.floor(stackTextW / ((NAME.length + 1) * 0.62)),
  );
  const stackTextH = stackNameSize + (phone ? 92 : 104);
  const stackTextBottom = stackTextTop + stackTextH;
  const stackChipBase = stackTextBottom + (phone ? 6 : 10);
  const stackChipTop = stackChipBase + vh * STACK_CHIP_DROP;
  /* mobilde çip daha büyük: yanlardan ekran dışına taşabilir (çapraz
     duran çipin köşeleri), portrenin altı yine sosyal butonların üstünde kalır */
  const stackChipMaxH = Math.max(220, vh - stackChipBase + (phone ? 0 : 40));
  const stackChipMaxW = vw * 1.6;

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

  /* masaüstünde yazı ekranın üst üçte birinde (eskiden %42) */
  const textY = stacked ? stackTextTop + stackTextH / 2 : vh * 0.32;
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
    /* Portun YERLEŞİM konumu (offsetLeft/Top): açılış animasyonunun
       kaydırması (introDown) ve kamera dönüşümü dahil EDİLMEZ. Eskiden
       getBoundingClientRect kullanılıyordu; /home'da sahne yanık açıldığı
       için ölçüm, portlar hâlâ yukarıdan kayarken yapılıyor ve ışık açısı
       fazla dik hesaplanıyordu (ışık hedefin altına düşüyordu). */
    const measure = () => {
      const root = sectionRef.current;
      if (!root) return;
      const at = (el: HTMLElement | null) => {
        if (!el) return null;
        let x = 0;
        let y = 0;
        let n: HTMLElement | null = el;
        while (n && n !== root) {
          x += n.offsetLeft;
          y += n.offsetTop;
          n = n.offsetParent as HTMLElement | null;
        }
        return { x: x + el.offsetWidth / 2, y, h: el.offsetHeight };
      };
      setPortBoxes([at(portRef0.current), at(portRef1.current)]);
    };

    const t = window.setTimeout(measure, 0);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [vw, vh, powered]);

  const PORTS_LEFT = stacked
    ? vw - (phone ? 104 : 118) // telefonda portlar daha küçük (compact)
    : Math.round((textCenter + layout.cx) / 2) + 130;

  /* ---------- Portre + kamera ---------- */
  const PG = computePortrait(layout, vw, stacked, textCenter, textWidth);
  const { ringR, footY, ph, pw, cx } = PG;

  /* Port ışıklarının hedefleri:
     0 → İSİM (yazı bloğunun üst kısmı: ismin ortası)
     1 → PORTRENİN YÜZÜ (portrenin üst ~çeyreği) */
  const nameY = stacked
    ? stackTextTop + 28 + stackNameSize / 2
    : textY - 22 * textScale;
  const spotTargets: SpotTarget[] = [
    {
      x: textCenter,
      y: nameY,
      /* ismin genişliğine yakın (eskiden yazı bloğunun %55'i: isimden çok geniş) */
      spread: Math.min(560, textWidth) * (stacked ? 0.6 : 0.42),
    },
    { x: cx, y: footY - ph * 0.74, spread: pw * 0.9 },
  ];
  /* 0 (isim): hedef sola çok açık → gövde ona dönsün (en fazla 45°, %80)
     1 (portre): hedef neredeyse aşağıda → eski ayar (20°, %40) */
  /* [en fazla dönüş, takip oranı, hedefin ötesine uzama]
     isim ışığı ismin hemen arkasında biter (1.04) */
  const SPOT_AIM: [number, number, number][] = [
    [45, 0.8, 1.04],
    [PORT_MAX_ROT, 0.4, 1.12],
  ];
  const spots = portBoxes.map((p, i) =>
    computeSpot(p, spotTargets[i], ...SPOT_AIM[i]),
  );

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
      className={`hero-h relative flex w-full flex-col overflow-hidden ${waiting ? "pb-wait" : ""}`}
    >
      <IntroStyles />

      <style>
        {TERMINAL_CSS +
          POWER_BUILD_CSS +
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
          /* fişi bu sayfada avatar kendisi takar (animasyonlu) */
          plugged={pluggedProp || final}
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
                /* cam panelin üst kenarına vidalı braket */
                left: STACK_PAD_X - 4,
                top: PANEL_TOP_STACK,
                width: MENU_BTN_W,
                height: MENU_BTN_H,
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
              data-build-text={NAME}
              data-part="hero-text"
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
                {/* data-avatar-name: avatar fişi taktıktan sonra bu yazının üstüne zıplar */}
                <h1
                  data-avatar-name
                  className="font-mono leading-[1.05] font-bold whitespace-nowrap text-accent"
                  style={{
                    ...NAME_FONT,
                    fontSize: stackNameSize,
                    minHeight: "1.05em",
                    textShadow: "0 0 24px rgba(var(--c-4fd8ff,79,216,255),.35)",
                  }}
                >
                  {/* isim açılışta zaten uçarak yerine geliyor (CinematicIntro):
                      burada TEKRAR yazılmaz, olduğu gibi görünür */}
                  <TerminalText
                    text={NAME}
                    color="rgb(var(--c-c4f7fb,196,247,251))"
                    instant={final || CINEMATIC_INTRO}
                    active={nameReady}
                    delay={TYPE_NAME_DELAY}
                    cps={TYPE_CPS_NAME}
                    bend
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
                {/* data-avatar-skills: avatar isimden sonra bu satıra asılır */}
                <p
                  data-avatar-skills
                  className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-accent/80 ${phone ? "text-[11px]" : "text-[15px]"}`}
                >
                  {/* unvan kendi satırında; teknolojiler aralarında nokta ile,
                      dar ekranda düzgünce alt satıra sarar */}
                  <span className="w-full whitespace-nowrap">
                    <TerminalText
                      color="rgb(var(--c-7fe3ef,127,227,239))"
                      text={ROLE}
                      key={ROLE}
                      instant={final}
                      active={nameReady}
                      delay={nameTypeMs(NAME)}
                      prompt
                    />
                  </span>
                  {STACK.map((item, i) => (
                    <span
                      key={item}
                      className="flex items-center gap-2 whitespace-nowrap"
                    >
                      {i > 0 && <span className="text-accent/60">·</span>}

                      <TerminalText
                        color="rgb(var(--c-7fe3ef,127,227,239))"
                        text={item}
                        instant={final}
                        active={nameReady}
                        delay={stackDelay(ROLE, i)}
                        keepCursor={i === STACK.length - 1}
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
              data-build-text={`>>> ${NAME}`}
              data-part="hero-text"
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
                  style={{
                    ...NAME_FONT,
                    fontSize: 40 * textScale,
                    minHeight: "1.2em",
                  }}
                >
                  {/* isim açılışta zaten uçarak yerine geliyor: tekrar yazılmaz */}
                  <TerminalText
                    text={`>>> ${NAME}`}
                    color="rgb(var(--c-c4f7fb,196,247,251))" /* başlık: paletin en açık tonu */
                    instant={final || CINEMATIC_INTRO}
                    active={nameReady}
                    delay={TYPE_NAME_DELAY}
                    cps={TYPE_CPS_NAME}
                    bend
                  />
                </h1>

                {/* Çip büyüdüğü için yazı alanı daraldı: sığmazsa unvanlar
                    alt alta (her satır kendi decode efektiyle) yazılır */}
                {/* tek satır sığıyorsa tek satır (mono font: karakter ≈ 0.62em) */}
                {textWidth >=
                (PROMPT_PATH.length + 3 + SUBTITLE_ONE_LINE_.length) *
                  14 *
                  0.62 *
                  textScale ? (
                  <p
                    data-avatar-skills
                    className="font-mono text-accent/80"
                    style={{ fontSize: 14 * textScale }}
                  >
                    <TerminalText
                      color="rgb(var(--c-7fe3ef,127,227,239))"
                      text={SUBTITLE_ONE_LINE_}
                      instant={final}
                      active={nameReady}
                      delay={nameTypeMs(`>>> ${NAME}`)}
                      keepCursor
                      prompt
                    />
                  </p>
                ) : (
                  <p
                    data-avatar-skills
                    className="flex flex-col items-center gap-1 font-mono text-accent/80"
                    style={{ fontSize: 14 * textScale }}
                  >
                    {SUBTITLE_LINES_.map((line, i) => (
                      <TerminalText
                        key={line}
                        color="rgb(var(--c-7fe3ef,127,227,239))"
                        text={line}
                        instant={final}
                        active={nameReady}
                        delay={
                          nameTypeMs(`>>> ${NAME}`) +
                          SUBTITLE_LINES_.slice(0, i).join("").length *
                            (1000 / TYPE_CPS_TEXT)
                        }
                        keepCursor={i === SUBTITLE_LINES_.length - 1}
                        prompt={i === 0}
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
            {/* ORGANİK RENK LEKESİ — sadece palet tanımlarsa görünür
                (--blob-opacity); portrenin arkasında akan renkli şekil */}
            <svg
              aria-hidden
              viewBox="0 0 400 500"
              preserveAspectRatio="xMidYMid meet"
              className="absolute"
              style={{
                left: "-75%",
                right: "-75%",
                top: "-12%",
                bottom: "0%",
                width: "250%",
                height: "112%",
                overflow: "visible",
                opacity: `calc(var(--blob-opacity, 0) * ${powered ? 1 : 0.55})`,
                filter: "blur(var(--blob-blur, 0px))",
                transition: "opacity 700ms",
              }}
            >
              <defs>
                <linearGradient id="hero-blob-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="rgb(var(--blob-1,190,60,150))" />
                  <stop
                    offset="0.55"
                    stopColor="rgb(var(--blob-2,120,76,216))"
                  />
                  <stop offset="1" stopColor="rgb(var(--blob-3,74,106,232))" />
                </linearGradient>
              </defs>
              <path
                d="M 60 120 C 40 40, 180 -10, 260 30 C 340 70, 400 150, 380 260 C 365 350, 300 440, 200 470 C 110 495, 20 430, 30 330 C 38 260, 80 220, 60 120 Z"
                fill="url(#hero-blob-grad)"
              />
            </svg>

            {/* arkadaki hale (palet ışık rengiyle) */}
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

            {/* zemindeki ışık yansıması — fotoğrafın alt kısmı paletin
                --photo-floor tonuna (yoksa --photo-edge) yumuşakça erir */}
            <div
              className="absolute"
              style={{
                left: "-25%",
                right: "-25%",
                bottom: "-6%",
                height: "26%",
                background: `radial-gradient(ellipse 50% 50% at 50% 60%, rgba(var(--photo-floor, var(--photo-edge,70,190,255)),${powered ? 0.6 : 0.35}), rgba(var(--photo-floor, var(--photo-edge,70,190,255)),${powered ? 0.18 : 0.1}) 45%, transparent 75%)`,
                transition: "background 700ms",
              }}
            />

            {/* portrenin ışıltısı + gölgesi (sabit katman) */}
            {portraitGo && <PortraitGlow powered={powered} />}

            {/* FOTOĞRAF: açılışta parçacıksız, doğrudan görünür; üzerine
                gelince parçacıklara ayrılma etkileşimi sürer */}
            {portraitGo && (
              <div
                className="absolute inset-0"
                style={{
                  /* video oynarken fotoğraf gizli; video bitince aynı son
                     kare fotoğraf olarak kalır (geçiş görünmez) */
                  /* video ilk karesini çizene kadar fotoğraf görünür kalır;
                     video bitince fotoğraf ANINDA altta hazır olur, video
                     üstünden yavaşça söner → yanıp sönme yok */
                  opacity: wavePlaying && waveStarted ? 0 : 1,
                  transition: "none",
                }}
              >
                <PortraitMorph
                  instant={final}
                  introless
                  src={waveShowEnd ? WAVE_END : WAVE_START}
                  alt={t("hero.photo")}
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
                    ...PORTRAIT_MASK,
                    filter: portraitFilter(),
                  }}
                />
              </div>
            )}

            {/* EL SALLAMA VİDEOSU — ışık tutulunca bir kez oynar */}
            {portraitGo && !final && !waveGone && (
              <>
                <WaveVideo
                  src={WAVE_VIDEO}
                  play={wavePlaying}
                  onEnded={() => setWaveEnded(true)}
                  onStart={() => setWaveStarted(true)}
                  className="absolute"
                  style={{
                    left: 0,
                    top: 0,
                    width: ph * WAVE_ASPECT,
                    height: ph,
                    opacity: waveStarted && !waveEnded ? 1 : 0,
                    transition: waveEnded ? "opacity 350ms ease 250ms" : "none",
                    /* süzgeç ve alt sönüş gölgelendiricide (WaveVideo) */
                  }}
                />
                {/* son kare önceden yüklensin: video bitince anında görünsün */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={WAVE_END} alt="" aria-hidden className="hidden" />
              </>
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
                compact={phone}
                lit={powered}
                swing={spots[0]?.swing ?? 0}
                beamAngle={spots[0]?.beamAngle ?? 0}
                beamLength={spots[0]?.len ?? 650}
                beamWidth={spots[0]?.width ?? 420}
              />
            </div>
            <div ref={portRef1}>
              {/* FENER: portreye tutulan ışık da (isim ışığı gibi) ancak
                  avatar fişi takınca yanar */}
              <SidePort
                type="audio"
                compact={phone}
                lit={powered || !CINEMATIC_INTRO}
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
                  /* hedefteki parlama da konnektör/port ışığıyla aynı renk */
                  data-part="connector"
                  className="pointer-events-none"
                  aria-hidden
                >
                  {/* Işık yanmadan önce bölge daha koyu: ışık gelince açılır
                      (hızlı açılışta karanlık bölge yok) */}
                  {CINEMATIC_INTRO && (
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
                  )}

                  <div
                    className="absolute rounded-full"
                    style={{
                      left: sp.t.x,
                      top: sp.t.y,
                      width: sp.t.spread * 1.15,
                      height: sp.t.spread * (i === 0 ? 0.55 : 1),
                      transform: "translate(-50%, -50%)",
                      background:
                        "radial-gradient(closest-side, rgba(var(--c-d7eeff,215,238,255),.18), rgba(var(--c-c8ebff,200,235,255),.07) 55%, transparent)",
                      mixBlendMode: "screen",
                      opacity: powered || !CINEMATIC_INTRO ? 1 : 0,
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
              /* biraz yukarıda: panel kenarına yapışık durmasın */
              bottom: panel.bottom + (stacked ? 30 : 64),
              transform: `translateX(-50%) scale(${socialScale})`,
              transformOrigin: "bottom center",
            }}
          >
            <div style={intro("introFade", T.social - 0.15, 0.5)}>
              <SocialStrip>
                <SocialChip
                  icon={FaLinkedin}
                  href={LINKEDIN}
                  shown={chipShown[0]}
                  label="LinkedIn"
                />
                <SocialChip
                  icon={FaGithub}
                  href={GITHUB}
                  shown={chipShown[1]}
                  label="GitHub"
                />
                <SocialChip
                  icon={FaInstagram}
                  href={INSTAGRAM}
                  shown={chipShown[2]}
                  label="Instagram"
                />
                <SocialChip
                  icon={FaWhatsapp}
                  href={WHATSAPP}
                  shown={chipShown[3]}
                  label="WhatsApp"
                />
              </SocialStrip>
            </div>
          </div>
        </div>

        {/* ELEKTRİKSİZ HAL: açılış yerleşirken sahne kararır (fotoğraf,
            çip, menü…); fiş takılınca ışıklar yanar ve karanlık kalkar.
            Karanlık paletin en koyu tonundan gelir (paletsiz: eski siyah-lacivert) */}
        {!final && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-60"
            style={{
              background:
                "radial-gradient(ellipse 75% 70% at 55% 50%, rgba(var(--c-040c1a,3,5,12),.5), rgba(var(--c-010204,3,5,12),.72))",
              /* karanlıkta fenerin aydınlattığı portre açık kalır */
              WebkitMaskImage: `radial-gradient(ellipse ${Math.round(pw * 0.75)}px ${Math.round(ph * 0.62)}px at ${Math.round(cx)}px ${Math.round(footY - ph * 0.5)}px, transparent 55%, #000 100%)`,
              maskImage: `radial-gradient(ellipse ${Math.round(pw * 0.75)}px ${Math.round(ph * 0.62)}px at ${Math.round(cx)}px ${Math.round(footY - ph * 0.5)}px, transparent 55%, #000 100%)`,
              opacity: dim && !powered ? 1 : 0,
              transition: powered
                ? `opacity ${POWER_FADE_MS}ms ease`
                : "opacity 1.3s ease",
            }}
          />
        )}

        {/* TEPE AYDINLANIR: açılış bitip avatar yola çıkınca üst ortadaki
            güç soketinin çevresine yukarıdan yumuşak bir ışık düşer
            (sahnenin geri kalanı karanlıkken); ilk kez gören biri
            avatarın tırmanıp fişi taktığını fark etsin. Fiş takılınca
            söner (o an bütün sahne zaten aydınlanır). Karanlık katmanın
            üstünde; yalnızca saydamlığı değişir (hafif). */}
        {!final && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-60"
            style={{
              left: panel.left + (vw - panel.left - panel.right) / 2,
              top: panel.top,
              width: phone ? 340 : 520,
              height: phone ? 190 : 260,
              transform: "translate(-50%, -42%)",
              background: `radial-gradient(ellipse 50% 50% at 50% 42%,
                rgba(var(--c-e1f8ff,225,248,255),.6) 0%,
                rgba(var(--c-a8eef6,168,238,246),.3) 30%,
                rgba(var(--c-4fd8ff,79,216,255),.08) 60%,
                transparent 100%)`,
              opacity: avatarGoing && !avatarPowered ? 1 : 0,
              transition: "opacity 900ms ease",
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
      {!final && CINEMATIC_INTRO && (
        <CinematicIntro
          start={cineGo}
          rootRef={cameraRef}
          title={stacked ? NAME : `>>> ${NAME}`}
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
          onSettle={() => {
            setDim(true);
            /* sahne oturduktan AVATAR_START_MS sonra avatar tırmanıp fişi
               takar (izleyici önce portreyi ve el sallamayı görsün) */
            startAvatar();
          }}
          /* avatar açılış animasyonu BİTENE kadar görünmez; bitince
             tırmanır, porta yürür ve fişi takar */
          onAvatarGo={() => {}}
          onDone={() => {
            setIntroDone(true);
            startAvatar();
          }}
        />
      )}
    </section>
  );

  return final ? <FinalState>{section}</FinalState> : section;
}
