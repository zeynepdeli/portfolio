"use client";

import {
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { IconType } from "react-icons";
import {
  FaLinkedin,
  FaGithub,
  FaInstagram,
  FaEnvelope,
  FaWhatsapp,
  FaRegCopy,
  FaCheck,
} from "react-icons/fa";
import SittingAvatar, {
  SIT_ASPECT,
  SIT_SEAT,
} from "@/components/ui/SittingAvatar";
import { useViewport } from "@/components/ui/ChipLayout";
import {
  EMAIL,
  GITHUB,
  INSTAGRAM,
  LINKEDIN,
  WHATSAPP,
  linkProps,
} from "@/components/ui/SocialLinks";
import SpriteVideo from "@/components/ui/SpriteVideo";
import { CLIMB_SPRITE } from "@/components/ui/assets";
import SciFiBackground from "@/components/ui/ScifiBackground";
import { useLang } from "@/i18n/lang";
import type { DictKey } from "@/i18n/dict";

/* =========================================================
   FOOTER — sade "kasanın arkası"
   • ÇAĞRI        → başlık, rol, e-posta (kopyala)
   • I/O PORTLARI → yalnızca kullandığımız hesaplar
   • MENÜ         → sayfa bağlantıları + başa dön
   • 0-1 NEHRİ    → avatar yukarıdan suya düşer, nehirle sağa kayar,
                    sayfanın SONUNDA (sağ uçta) oturur; suya değince
                    sistem "enerjilenir".
========================================================= */

/* ---- içerik ---- */
const NAME = "ZEYNEP DELİ";
/* e-posta ve sosyal adresler: components/ui/socialLinks.ts */
const YEAR = new Date().getFullYear();
/** sözün altındaki terminal satırı */
/* commit satırı dile göre: i18n/dict → footer.commit */

type PortKind = "usb" | "hdmi" | "dp" | "usbc" | "rj45";
type PortItem = {
  kind: PortKind;
  spec: string;
  label: string;
  href: string;
  icon: IconType;
};

/* hero'daki sosyal hesaplar + CV'deki e-posta */
const PORTS: PortItem[] = [
  {
    kind: "usb",
    spec: "USB 3.2",
    label: "LinkedIn",
    href: LINKEDIN,
    icon: FaLinkedin,
  },
  {
    kind: "hdmi",
    spec: "HDMI 2.1",
    label: "GitHub",
    href: GITHUB,
    icon: FaGithub,
  },
  {
    kind: "dp",
    spec: "DP 1.4",
    label: "Instagram",
    href: INSTAGRAM,
    icon: FaInstagram,
  },
  {
    kind: "usbc",
    spec: "USB-C",
    label: "WhatsApp",
    href: WHATSAPP,
    icon: FaWhatsapp,
  },
  {
    kind: "rj45",
    spec: "LAN 10G",
    label: "E-mail",
    href: `mailto:${EMAIL}`,
    icon: FaEnvelope,
  },
];

const SLOTS: { label: DictKey; href: string | null }[] = [
  { label: "nav.home", href: "/home" },
  { label: "nav.skills", href: "/roadmap" },
  { label: "nav.projects", href: "/projects" },
  { label: "nav.documents", href: "/documents" }, // özgeçmişler (PDF)
];

/* ---- renkler ---- */
const EDGE = "70,190,255"; // #46beff
const ICE = "207,230,255"; // #cfe6ff
const NAVY = "10,44,82"; // #0a2c52
const DEEP = "6,31,58"; // #061f3a
/* AÇIK MAVİ — footer'daki TÜM yazılar bu renkte (vurgu / normal / soluk) */
/* sitedeki tüm sayfalarda kullanılan AÇIK MAVİ (menü etiket rengi) —
   paletten gelir: --c-a8eef6 */
const TURQ = "var(--ft-t)";
const T_HI = `rgb(${TURQ})`;
const T_DIM = `rgba(${TURQ},.58)`;

/* ---- avatar ---- */
const AV_H = 180; // nehirde oturan avatarın boyu (px; eskiden 150)
/** dar ekranda oturduğu yer (nehir genişliğine oran) */
const SEAT_X = 0.84;

/* ---- zamanlama (ms) ---- */
/* TIRMANMA — ana sayfadaki gibi: footer'ın ÜST kenarının arkasından
   tırmanıp çıkar, ayakta doğrudan fanın önündeki nehre düşer, oturur */
const CLIMB_ASPECT = 486 / 420; // video oranı
const CLIMB_LEDGE = 0.86; // videoda kenar çizgisi (sonda, diz çökünce)
const CLIMB_GRIP = 0.74; // başta ellerin tutunduğu kenar
const CLIMB_K = 0.8; // tırmanma kutusu boyu (avatar boyuna oran)
const CLIMB_RATE = 2.1; // video oynatma hızı (eskiden 2.8: daha sakin)
const CLIMB_MS = Math.round(5000 / CLIMB_RATE);
/** video yüklenemezse / bitmezse en geç bu süre sonra devam et */
const CLIMB_FALLBACK_MS = CLIMB_MS + 1200;
/* DÜŞÜŞ — tırmanınca, suya atlar gibi BURNUNU KAPATMIŞ ayakta pozla
   doğrudan fanın önündeki nehre atlar (public/images/zeynep-burun.webp) */
const JUMP_SRC = "/images/zeynep-burun.webp";
const JUMP_ASPECT = 223 / 720; // görsel oranı
const JUMP_K = 0.95; // boyu (avatar boyuna oran)
const JUMP_FEET = 0.997; // görselde ayak tabanı (yüksekliğe oran)
/** suya girerken boyunun ne kadarı suya batar (oran) */
const JUMP_SINK = 0.3;
const FALL_MS = 1700; // üst kenardan nehre düşüş (eskiden 1250)
const HOP_UP = 34; // kenardan kalkarken küçük sıçrama (px)
/** üst kenar: zemine karışan bölümün ortasında, panelin belirdiği yer
    (topFade'e oran) */
const EDGE_IN_FADE = 0.55;
const SPLASH_MS = 850; // suya değip toparlanma (eskiden 650)

/* ---- 0-1 nehri ---- */
const RIVER_H = 120;
const SURF = 38; // su yüzeyinin şeridin üstünden uzaklığı
const WAVE_LEN = 240;
const POWER_STEP_MS = 110; // LED'lerin sırayla yanma aralığı

/* ---- panel: diğer sayfalardaki cam panelle aynı ---- */
const PANEL_GAP = 12; // panelin zemin kenarlarına uzaklığı (px)
/** port kutusu, menü yuvaları ve güç kaynağı kutusunun ORTAK yüksekliği (px) */
const BOX_H = 184;
/** üst kenarın arka plana karışma yüksekliği (px) */
const TOP_FADE = 90;
const PANEL_INSET = {
  left: `${PANEL_GAP}px`,
  right: `${PANEL_GAP}px`,
  top: "0px", // üst kenar görünmez (zemine karışır)
  bottom: `${PANEL_GAP}px`,
};

type Pt = { x: number; y: number };
type Phase =
  | "idle"
  | "climb" // footer'ın ÜST kenarından tırmanır
  | "fall" // ayakta, doğrudan fanın önündeki nehre düşer
  | "splash" // suya değer (çömelme pozu)
  | "landed";
type Motion = {
  x: number;
  y: number;
  rot: number;
  sq: number;
  /** suya batma (boyuna oran) */
  sink: number;
};
/** CSS özel değişkenleri (--dx, --w ...) için tip */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutBack = (t: number) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/* ortak metal yüzey */
const metal = (light = 0): CSSProperties => ({
  background: `
    repeating-linear-gradient(90deg, rgba(255,255,255,.018) 0 1px, transparent 1px 3px),
    linear-gradient(180deg, rgba(${14 + light},${59 + light},${107 + light},1) 0%, rgba(${NAVY},1) 55%, rgba(${DEEP},1) 100%)
  `,
  border: `1px solid rgba(${ICE},.22)`,
  boxShadow: `inset 0 1px 0 rgba(255,255,255,.16), inset 0 -2px 0 rgba(0,0,0,.35), 0 14px 34px rgba(0,0,0,.38)`,
});

/** açılış sırası (CSS --i) */
const ftI = (i: number) => ({ "--i": i }) as CSSProperties;

type Props = {
  /** footer görünür/açık mı. Verilmezse ekrana girince kendisi başlar. */
  open?: boolean;
  /** üst kenarın zemine karışma yüksekliği (px). 0: keskin kenar
   *  (perde geçişinde footer proje sayfasının altından çıkar) */
  topFade?: number;
  /** içerik açılış animasyonu (sayfa geçişi BAŞLARKEN true): yazı,
   *  kutular ve nehir sırayla yerine oturur. Verilmezse open ile aynı. */
  reveal?: boolean;
  /** tırmanma videosu önceden hazırlansın mı (sıra footer'a yaklaşınca).
   *  Verilmezse hep hazır. Açılışta indirilip kritik dosyalarla yarışmasın */
  prepare?: boolean;
};

export default function FooterSection({
  open,
  topFade = TOP_FADE,
  reveal,
  prepare = true,
}: Props) {
  const { t } = useLang();
  const commitLine = t("footer.commit");
  const rootRef = useRef<HTMLElement>(null);
  const riverRef = useRef<HTMLDivElement>(null);
  /** geniş ekranda avatarın oturduğu boş sütun (en sağ) */
  const spotRef = useRef<HTMLDivElement>(null);

  const [inView, setInView] = useState(false);

  const { w: vw, h: vh } = useViewport();
  const phone = vw < 640;
  /* kısa telefon (iPhone SE vb.): boşluklar daralır, telif satırı gizlenir */
  const short = phone && vh < 720;
  const riverH = vh < 560 ? 90 : phone ? 96 : RIVER_H;
  /* telefonda avatar küçük ve SAĞ KÖŞEDE oturur: butonların önüne geçmez */
  const avH = vh < 560 ? 108 : phone ? (vh < 760 ? 100 : 116) : AV_H;
  /* içerik ekranı aşarsa kendi içinde kayar (nehir altta sabit kalır) */
  const scrollerStyle: CSSProperties =
    vw >= 1280
      ? {}
      : phone
        ? {
            /* telefonda sade içerik kısa kalıyordu: footer ekranın çoğunu
               kaplasın, içerik ortada dursun (arkadaki proje görünmesin) */
            maxHeight: Math.max(200, vh - riverH - 60 - 2 * PANEL_GAP),
            minHeight: Math.max(200, vh - riverH - 110 - 2 * PANEL_GAP),
            justifyContent: "center",
          }
        : { maxHeight: Math.max(200, vh - riverH - 60 - 2 * PANEL_GAP) };
  const isOpen = open ?? inView;
  const revealOn = reveal ?? isOpen;

  const [phase, setPhase] = useState<Phase>("idle");
  /* DÜŞÜŞ: her karede React yeniden çizmesin diye konum doğrudan
     stile yazılır (eskiden her kare bütün footer yeniden çiziliyordu) */
  const fallRef = useRef<HTMLDivElement>(null);
  const fallImgRef = useRef<HTMLImageElement>(null);
  const [splash, setSplash] = useState<Pt | null>(null);
  /** tırmandığı kenar: güç kaynağı kutusunun üst kenarı */
  const [ledge, setLedge] = useState<Pt | null>(null);
  const [seat, setSeat] = useState<Pt | null>(null);
  const [landKey, setLandKey] = useState(0);
  const [prevOpen, setPrevOpen] = useState(isOpen);
  const powered = phase === "landed";

  /* footer kapanınca sıfırla (render sırasında state ayarlama) */
  if (prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    if (!isOpen) {
      setPhase("idle");
      setSplash(null);
    }
  }

  const avHRef = useRef(avH);
  const phoneRef = useRef(phone);
  useEffect(() => {
    avHRef.current = avH;
    phoneRef.current = phone;
  }, [avH, phone]);

  /* oturma yeri: nehrin SAĞ ucu (geniş ekranda en sağdaki boş sütun) */
  const measureSeat = useCallback((): Pt | null => {
    const root = rootRef.current;
    const river = riverRef.current;
    if (!root || !river) return null;
    const r = root.getBoundingClientRect();
    const v = river.getBoundingClientRect();
    /* fanın tam önü: avatar güç kaynağının (fanın) önünde oturur */
    const spot = spotRef.current?.getBoundingClientRect();
    const x =
      spot && spot.width > 0
        ? spot.left - r.left + spot.width / 2
        : phoneRef.current
          ? v.left - r.left + v.width - (avHRef.current * SIT_ASPECT) / 2 - 14
          : v.left - r.left + v.width * SEAT_X;
    return { x, y: v.top - r.top + SURF };
  }, []);

  useEffect(() => {
    const update = () => setSeat(measureSeat());
    const ro = new ResizeObserver(update);
    [rootRef, riverRef, spotRef].forEach((r) => {
      if (r.current) ro.observe(r.current);
    });
    return () => ro.disconnect();
  }, [measureSeat]);

  /* open verilmediyse: ekrana girince başla */
  useEffect(() => {
    if (open !== undefined) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.35,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [open]);

  /* ---------- TIRMAN → ÇÖMEL → ZIPLA → OTUR ---------- */
  const climbEndRef = useRef(false);
  useEffect(() => {
    if (!isOpen) return;

    let raf = 0;
    climbEndRef.current = false;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => {
        setSeat(measureSeat());
        setPhase("landed");
        setLandKey((k) => k + 1);
      });
      return () => cancelAnimationFrame(raf);
    }

    let stage: Phase = "idle";
    let stageAt = 0;
    let splashed = false;
    const setMotion = (m: Motion) => {
      const box = fallRef.current;
      const img = fallImgRef.current;
      if (!box || !img) return;
      box.style.transform = `translate3d(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px, 0)`;
      img.style.transform = `rotate(${m.rot.toFixed(2)}deg) scale(${(2 - m.sq).toFixed(3)}, ${m.sq.toFixed(3)})`;
      const mask =
        m.sink > 0
          ? `linear-gradient(180deg, #000 ${((JUMP_FEET - m.sink) * 100 - 1).toFixed(1)}%, transparent ${((JUMP_FEET - m.sink) * 100 + 1).toFixed(1)}%)`
          : "";
      img.style.webkitMaskImage = mask;
      img.style.maskImage = mask;
    };
    const go = (p: Phase, now: number) => {
      if (stage !== p) {
        stage = p;
        stageAt = now;
        setPhase(p);
      }
    };

    const tick = (now: number) => {
      const root = rootRef.current;
      const river = riverRef.current;
      const s = measureSeat();
      if (!root || !river || !s) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const r = root.getBoundingClientRect();
      const v = river.getBoundingClientRect();
      const surf = v.top - r.top + SURF;
      const x = s.x;

      /* footer'ın üst kenarı (tırmanıp çıktığı yer) */
      const edge = Math.round(topFade * EDGE_IN_FADE);

      if (stage === "idle") {
        go("climb", now);
        setLedge({ x, y: edge });
      }
      const el = now - stageAt;

      if (stage === "climb") {
        if (climbEndRef.current || el > CLIMB_FALLBACK_MS) go("fall", now);
      } else if (stage === "fall") {
        /* kenardan küçük bir sıçrayışla kalkar, yerçekimiyle hızlanarak
           fanın önündeki suya düşer */
        const t = clamp(el / FALL_MS);
        setMotion({
          x,
          y: lerp(edge, surf, t * t) - HOP_UP * 4 * t * (1 - t),
          rot: Math.sin(t * Math.PI * 2) * 3 * (1 - t),
          sq: t < 0.1 ? lerp(0.9, 1, t / 0.1) : 1,
          sink: 0,
        });
        if (t >= 1) go("splash", now);
      } else if (stage === "splash") {
        const t = clamp(el / SPLASH_MS);
        if (!splashed) {
          splashed = true;
          setSplash({ x, y: surf });
        }
        /* suya girer: bacakları suyun altına batar, hafifçe ezilip toparlanır */
        const sink = JUMP_SINK * (1 - Math.pow(1 - t, 3));
        setMotion({
          x,
          y: surf + sink * avHRef.current * JUMP_K,
          rot: 0,
          sq: lerp(0.86, 1, easeOutBack(clamp(t / 0.6))),
          sink,
        });
        if (t >= 1) {
          setSeat(s);
          setPhase("landed");
          setLandKey((k) => k + 1);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, measureSeat, topFade]);

  const avW = avH * SIT_ASPECT;
  const climbH = avH * CLIMB_K;
  const climbW = climbH * CLIMB_ASPECT;
  const jumpH = avH * JUMP_K;
  const jumpW = jumpH * JUMP_ASPECT;

  return (
    <footer
      ref={rootRef}
      className={`ft-root ft-boot relative isolate w-full ${revealOn ? "is-on" : ""}`}
      style={{ overflow: "visible" }}
    >
      <style>{`
        @keyframes ftType { from { width: 0; } to { width: ${commitLine.length + 0.6}ch; } }
        .ft-root { --ft-t: var(--c-a8eef6, 168, 238, 246); }
        .ft-root a, .ft-root button, .ft-root [role="button"] { cursor: pointer; }
        @keyframes ftSpinUp { from { transform: rotate(0); } to { transform: rotate(540deg); } }
        @keyframes ftSpin { to { transform: rotate(360deg); } }
        @keyframes ftSquash {
          0%   { transform: scale(1.1, .84); }
          45%  { transform: scale(.95, 1.06); }
          100% { transform: scale(1, 1); }
        }
        @keyframes ftRing {
          from { transform: translate(-50%, -50%) scale(.25); opacity: .95; }
          to   { transform: translate(-50%, -50%) scale(1.9); opacity: 0; }
        }
        @keyframes ftBlink { 50% { opacity: .3; } }
        @keyframes ftBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
        @keyframes ftRipple {
          from { transform: translate(-50%, -50%) scale(.5); opacity: .9; }
          to   { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }
        @keyframes ftBitSplash {
          0%   { transform: translate(0, 0) scale(.6); opacity: 0; }
          10%  { opacity: 1; }
          55%  { transform: translate(calc(var(--dx) * .6), var(--dy)) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), 30px) scale(.8); opacity: 0; }
        }
        @keyframes ftClimbLedge {
          0%, 48% { transform: translateY(${Math.round(100 * (CLIMB_LEDGE - CLIMB_GRIP))}%); }
          88%, 100% { transform: translateY(0); }
        }
        @keyframes ftWaveX { to { transform: translateX(-${WAVE_LEN}px); } }
        @keyframes ftBitsFlow { from { transform: translateX(0); } to { transform: translateX(var(--w)); } }
        @keyframes ftLaneFlow { to { stroke-dashoffset: var(--len); } }
        @keyframes ftDigit {
          0%   { transform: translate(0, 0); opacity: 0; }
          10%  { opacity: var(--o); }
          50%  { transform: translate(calc(var(--w) * .5), -6px); }
          90%  { opacity: var(--o); }
          100% { transform: translate(var(--w), 0); opacity: 0; }
        }
        /* AÇILIŞ: footer yükselirken içerik sırayla, ışıkla yerine oturur
           (yalnızca transform + opacity: telefonda da akıcı) */
        .ft-boot [data-ft-in] { opacity: 0; transform: translate3d(0, 26px, 0) scale(.97); }
        .ft-boot.is-on [data-ft-in] {
          animation: ftIn 760ms cubic-bezier(.2,.85,.25,1) calc(var(--i, 0) * 110ms + 260ms) both;
        }
        @keyframes ftIn {
          0%   { opacity: 0; transform: translate3d(0, 26px, 0) scale(.97); }
          55%  { opacity: 1; }
          100% { opacity: 1; transform: none; }
        }
        .ft-scan { opacity: 0; }
        .ft-boot.is-on .ft-scan { animation: ftScan 1300ms cubic-bezier(.4,0,.2,1) 180ms both; }
        @keyframes ftScan {
          0%   { transform: translate3d(0, 0, 0); opacity: 0; }
          12%  { opacity: 1; }
          85%  { opacity: .8; }
          100% { transform: translate3d(0, var(--scan-h, 600px), 0); opacity: 0; }
        }
        .ft-glow { opacity: 0; }
        .ft-boot.is-on .ft-glow { animation: ftGlow 1600ms ease-out 120ms both; }
        @keyframes ftGlow { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .ft-boot [data-ft-in], .ft-boot.is-on [data-ft-in] { opacity: 1; transform: none; animation: none; }
          .ft-boot.is-on .ft-scan, .ft-boot.is-on .ft-glow { animation: none; }
        }
        .ft-plug { transform: translate(-50%, 14px); }
        .ft-port:hover .ft-plug, .ft-port:focus-visible .ft-plug { transform: translate(-50%, 0); opacity: 1; }
        .ft-port:hover .ft-hole, .ft-port:focus-visible .ft-hole { filter: drop-shadow(0 0 8px rgba(${EDGE},.9)); }
        .ft-port:hover .ft-plabel, .ft-port:focus-visible .ft-plabel { color: #ffffff; }
        @media (min-width: 640px) { .ft-slots, .ft-iobox { height: ${BOX_H}px; } }
        .ft-slot:hover .ft-slot-glow, .ft-slot:focus-visible .ft-slot-glow { opacity: 1; }
        @media (prefers-reduced-motion: reduce) {
          .ft-fan-a, .ft-fan-b, .ft-river * { animation: none !important; }
        }
      `}</style>

      {/* ================= ZEMİN + PANEL =================
          Diğer sayfalarla aynı: açık zemin, önde lacivert cam panel */}
      {/* üst kenarda çizgi yok: zemin + panel yukarıdan yumuşakça belirir,
          üstteki sayfanın zeminine karışır */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          WebkitMaskImage: topFade
            ? `linear-gradient(180deg, transparent 0, #000 ${topFade}px)`
            : "none",
          maskImage: topFade
            ? `linear-gradient(180deg, transparent 0, #000 ${topFade}px)`
            : "none",
        }}
      >
        <SciFiBackground panelInset={PANEL_INSET} connector={false} />
      </div>

      {/* panelin içi: içerik + en altta nehir (köşeleri panelle aynı) */}
      <div
        className="relative z-10 flex flex-col overflow-hidden"
        style={{
          margin: `${PANEL_GAP}px ${PANEL_GAP}px ${PANEL_GAP}px`,
          borderRadius: "var(--glass-radius, 14px)",
        }}
      >
        {/* açılışta panel enerjilenir: yumuşak ışık + yukarıdan aşağı
            inen tarama çizgisi */}
        <div
          aria-hidden
          className="ft-glow pointer-events-none absolute inset-0 z-20"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 0%, rgba(${EDGE},.16), transparent 70%)`,
          }}
        />
        <div
          aria-hidden
          className="ft-scan pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5"
          style={
            {
              "--scan-h": `${Math.max(300, vh)}px`,
              background: `linear-gradient(90deg, transparent, rgba(${ICE},.9) 30%, #fff 50%, rgba(${ICE},.9) 70%, transparent)`,
              boxShadow: `0 0 16px rgba(${EDGE},.9), 0 0 40px rgba(${EDGE},.45)`,
            } as CSSProperties
          }
        />
        <div
          data-footer-scroll
          className={`relative z-10 flex flex-col overflow-y-auto px-4 sm:gap-6 sm:px-8 sm:pb-1 sm:pt-24 lg:px-12 xl:overflow-visible xl:pb-1 xl:pt-28 ${short ? "gap-3.5 pb-4 pt-8" : "gap-6 pb-5 pt-12"}`}
          style={scrollerStyle}
        >
          {/* ÜST: söz (+ geniş ekranda terminal satırı) + baştan izle.
              E-posta satırı yok: alttaki E-mail portu aynı işi görüyor. */}
          <div className="flex flex-col gap-x-10 gap-y-3 lg:flex-row lg:items-end lg:justify-between">
            <div data-ft-in className="flex flex-col gap-2.5" style={ftI(0)}>
              <h2
                className={`font-mono font-bold leading-[1.1] text-[#c4f7fb] ${short ? "text-[19px]" : "text-[clamp(22px,2.4vw,38px)]"}`}
                style={{ textShadow: `0 0 22px rgba(${EDGE},.35)` }}
              >
                {t("footer.line1")} <br className="sm:hidden" />
                <span
                  style={{
                    color: "#6ef5e8",
                    textShadow: `0 0 26px rgba(110,245,232,.45)`,
                  }}
                >
                  {t("footer.line2")}
                </span>
              </h2>
              {/* terminalde yazılıyormuş gibi: sistem enerjilenince yazılır.
                  Telefonda gizli (üst kısım kalabalık görünüyordu, satır
                  dar ekrana sığmıyordu) */}
              <p className="hidden items-center whitespace-nowrap sm:flex font-mono text-[11px] text-[#8fdcea] sm:text-[12px]">
                <span style={{ color: "#5df2a6" }}>~/zeynep</span>
                <span className="mx-1.5" style={{ color: `rgb(${EDGE})` }}>
                  $
                </span>
                <span
                  key={`${powered ? "typed" : "idle"}-${commitLine}`}
                  className="inline-block shrink-0 overflow-hidden whitespace-nowrap"
                  style={{
                    width: powered ? `${commitLine.length + 0.6}ch` : 0,
                    animation: powered
                      ? `ftType ${commitLine.length * 55}ms steps(${commitLine.length}) 400ms both`
                      : "none",
                  }}
                >
                  {commitLine}
                </span>
                <span
                  aria-hidden
                  className="ml-0.5 inline-block"
                  style={{
                    color: `rgb(${ICE})`,
                    animation: "ftBlink 1s steps(1) infinite",
                  }}
                >
                  _
                </span>
              </p>
              {/* HİKÂYEYİ BAŞTAN İZLE: terminal komutu gibi; tıklayınca
                  açılış animasyonu baştan oynar */}
              <div className="flex flex-wrap items-center gap-2.5">
                <ReplayIntro />
              </div>
            </div>
          </div>

          {/* ALT: portlar · menü yuvaları · güç kaynağı YAN YANA
              (avatar, güç kaynağının fanının ÖNÜNDE oturur) */}
          <div className="grid items-end gap-5 md:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.75fr)_minmax(0,1.2fr)] xl:grid-cols-[minmax(0,1.25fr)_minmax(0,.8fr)_minmax(0,1.15fr)] xl:gap-7">
            {phone ? (
              /* TELEFON: portlar + menü + saat + fan TEK kutuda, küçük */
              <div data-ft-in style={ftI(2)}>
                <PhoneDeck powered={powered} compact={short} />
              </div>
            ) : (
              <>
                <div data-ft-in style={ftI(2)}>
                  <IOShield powered={powered} />
                </div>
                <div data-ft-in style={ftI(3)}>
                  <ExpansionSlots powered={powered} />
                </div>
                <div
                  data-ft-in
                  className="md:col-span-2 lg:col-span-1"
                  style={ftI(4)}
                >
                  <PSU powered={powered} fanRef={spotRef} />
                </div>
              </>
            )}
          </div>

          {/* telif satırı */}
          <div
            data-ft-in
            className={`${short ? "hidden" : "flex"} flex-wrap items-center gap-x-6 gap-y-1 border-t pt-3 pr-24 font-mono text-[9px] tracking-[.2em] text-[rgba(var(--ft-t),.6)] xl:pr-0`}
            style={{ borderColor: `rgba(${ICE},.1)`, ...ftI(5) }}
          >
            <span>
              © {YEAR} {NAME} · {t("footer.rights")}
            </span>
            <span className="hidden sm:inline">{t("footer.role")}</span>
          </div>
        </div>

        {/* ---------- EN ALT: 0-1 NEHRİ ---------- */}
        <div
          ref={riverRef}
          data-ft-in
          className="relative z-5 -mt-5 w-full"
          style={{ height: riverH, ...ftI(4) }}
        >
          <BinaryRiver powered={powered} height={riverH} />
        </div>
      </div>

      {/* ================= TIRMANMA: kutunun arkasından üst kenarına =================
          video kenar çizgisinde kesilir: alt kısmı kutunun ARKASINDA kalır */}
      {/* video baştan (gizli, duraklatılmış) hazır bekler: footer
          yükselmeye başlar başlamaz tırmanış ANINDA başlar (eskiden video
          o an yüklenmeye başlıyor, avatar geç geliyordu) */}
      {(phase === "climb" || (phase === "idle" && prepare)) && (
        <div
          className="pointer-events-none absolute z-40 overflow-hidden"
          style={{
            left: (ledge?.x ?? 0) - climbW / 2,
            top: (ledge?.y ?? 0) - climbH,
            width: climbW,
            height: climbH,
            visibility: phase === "climb" && ledge ? "visible" : "hidden",
          }}
          aria-hidden
        >
          <div
            className="absolute left-0"
            style={{
              width: climbW,
              height: climbH,
              top: climbH * (1 - CLIMB_LEDGE),
              animation:
                phase === "climb"
                  ? `ftClimbLedge ${CLIMB_MS}ms linear both`
                  : "none",
              filter: `drop-shadow(0 0 10px rgba(${EDGE},.35))`,
            }}
          >
            <SpriteVideo
              {...CLIMB_SPRITE}
              playbackRate={CLIMB_RATE}
              playing={phase === "climb"}
              onEnded={() => {
                climbEndRef.current = true;
              }}
              className="absolute inset-0"
            />
          </div>
        </div>
      )}

      {/* ================= ZIPLAYIP SUYA İNEN AVATAR ================= */}
      {(phase === "fall" || phase === "splash") && (
        <div
          ref={fallRef}
          className="pointer-events-none absolute top-0 left-0 z-40 will-change-transform"
          /* ilk konum ilk karede yazılır; o ana dek kenarda (görünmez) */
          style={{
            width: 0,
            height: 0,
            transform: ledge
              ? `translate3d(${ledge.x}px, ${ledge.y}px, 0)`
              : undefined,
          }}
          aria-hidden
        >
          {/* burnunu kapatmış, ayakta suya atlar; suya girerken bacakları
              su çizgisinin altında kalır (maske) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={fallImgRef}
            src={JUMP_SRC}
            alt=""
            draggable={false}
            className="absolute max-w-none"
            style={{
              width: jumpW,
              height: jumpH,
              left: -jumpW / 2,
              top: -jumpH * JUMP_FEET,
              transformOrigin: `50% ${JUMP_FEET * 100}%`,
              filter: `drop-shadow(0 0 12px rgba(${EDGE},.45))`,
            }}
          />
        </div>
      )}

      {/* suya düştüğü yerde sıçrayan su + bitler */}
      {splash && phase !== "idle" && (
        <SplashFx key={`sp${splash.x}`} at={splash} />
      )}

      {/* ================= SAĞ UÇTA OTURAN AVATAR ================= */}
      {powered && seat && (
        <>
          <div
            className="pointer-events-none absolute z-40"
            style={{
              left: seat.x - avW / 2,
              top: seat.y - SIT_SEAT * avH,
              animation: "ftBob 2.8s ease-in-out 600ms infinite",
            }}
          >
            <div
              key={`av${landKey}`}
              style={{
                transformOrigin: `50% ${SIT_SEAT * 100}%`,
                animation: "ftSquash 560ms cubic-bezier(.3,1.6,.5,1) both",
                filter: `drop-shadow(0 0 12px rgba(${EDGE},.35))`,
              }}
            >
              <SittingAvatar height={avH} swinging />
            </div>
          </div>

          {/* ön su: bacaklar suyun içinde kalır (yarı saydam) */}
          <div
            className="pointer-events-none absolute z-41"
            style={{
              left: seat.x - 150,
              top: seat.y - 2,
              width: 300,
              height: riverH - SURF + 2,
              background: `linear-gradient(180deg, rgba(${EDGE},.28) 0px, rgba(14,59,107,.62) 6px, rgba(6,31,58,.88) 100%)`,
              WebkitMaskImage:
                "radial-gradient(ellipse 50% 100% at 50% 0%, #000 55%, transparent 100%)",
              maskImage:
                "radial-gradient(ellipse 50% 100% at 50% 0%, #000 55%, transparent 100%)",
            }}
          />
          {[0, 1, 2].map((k) => (
            <span
              key={`rip${k}`}
              className="pointer-events-none absolute z-42 rounded-[50%]"
              style={{
                left: seat.x,
                top: seat.y + 2,
                width: 120,
                height: 18,
                border: `1.5px solid rgba(${ICE},.55)`,
                animation: `ftRipple 2.4s ease-out ${k * 0.8}s infinite`,
              }}
            />
          ))}
          {/* oturunca tek, yumuşak halka */}
          <span
            key={`r${landKey}`}
            className="pointer-events-none absolute z-30 rounded-[50%]"
            style={{
              left: seat.x,
              top: seat.y,
              width: 200,
              height: 38,
              border: `2px solid rgba(${ICE},.8)`,
              boxShadow: `0 0 14px rgba(${EDGE},.7)`,
              animation: "ftRing 760ms ease-out both",
            }}
          />
        </>
      )}
    </footer>
  );
}

/* =========================================================
   SUYA DÜŞÜŞ: darbe halkaları + havaya saçılıp geri düşen 0/1'ler
========================================================= */
function SplashFx({ at }: { at: Pt }) {
  return (
    <>
      {[0, 140].map((d) => (
        <span
          key={d}
          className="pointer-events-none absolute z-30 rounded-[50%]"
          style={{
            left: at.x,
            top: at.y,
            width: 220,
            height: 42,
            border: `2px solid rgba(${ICE},.85)`,
            boxShadow: `0 0 14px rgba(${EDGE},.8)`,
            animation: `ftRing 760ms ease-out ${d}ms both`,
          }}
        />
      ))}
      {Array.from({ length: 16 }, (_, i) => {
        const a = Math.PI + (Math.PI * (i + 0.5)) / 16;
        const dist = 60 + ((i * 41) % 80);
        const style: CSSVars = {
          left: at.x - 4,
          top: at.y - 10,
          fontSize: 11 + (i % 3) * 3,
          color: i % 3 === 0 ? "#e1f8ff" : `rgb(${EDGE})`,
          textShadow: `0 0 8px rgba(${EDGE},.9)`,
          "--dx": `${Math.cos(a) * dist}px`,
          "--dy": `${Math.sin(a) * dist * 0.9}px`,
          animation: `ftBitSplash 900ms cubic-bezier(.2,.7,.4,1) ${i * 12}ms both`,
        };
        return (
          <span
            key={i}
            className="pointer-events-none absolute z-43 font-mono font-bold"
            style={style}
          >
            {(i * 7) % 3 === 0 ? "1" : "0"}
          </span>
        );
      })}
    </>
  );
}

/* =========================================================
   0-1 NEHRİ — footer'ın en altından akan veri nehri.
========================================================= */
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** sabit desenli bit dizisi */
function makeBits(n: number, seed: number) {
  let out = "";
  let v = seed;
  for (let i = 0; i < n; i++) {
    v = (v * 9301 + 49297) % 233280;
    out += v / 233280 > 0.5 ? "1" : "0";
    if (i % 8 === 7) out += " ";
  }
  return out;
}

function BinaryRiver({
  powered,
  height,
}: {
  powered: boolean;
  height: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = height;
  const L = WAVE_LEN;

  const surface = (y: number, amp: number) => {
    let d = `M ${-L} ${y}`;
    for (let x = -L; x < w + L; x += L) {
      d += ` Q ${x + L / 4} ${y - amp} ${x + L / 2} ${y} T ${x + L} ${y}`;
    }
    return d;
  };
  const body = (y: number, amp: number) =>
    `${surface(y, amp)} L ${w + L} ${H} L ${-L} ${H} Z`;

  const lanes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        y: SURF + 12 + i * ((H - SURF - 22) / 13),
        c: i % 3 === 0 ? "#e1f8ff" : i % 3 === 1 ? `rgb(${EDGE})` : "#8cc4f2",
        dash: `${60 + ((i * 37) % 140)} ${40 + ((i * 53) % 160)}`,
        o: 0.12 + ((i * 17) % 30) / 100,
        dur: 3 + ((i * 7) % 5),
        wdt: 0.8 + (i % 3) * 0.5,
      })),
    [H],
  );

  const digits = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        ch: (i * 5) % 3 === 0 ? "1" : "0",
        y: SURF + 22 + ((i * 29) % (H - SURF - 50)),
        size: 14 + ((i * 7) % 4) * 3,
        dur: 14 + ((i * 11) % 9),
        delay: -((i * 3.7) % 18),
        o: 0.25 + ((i * 13) % 35) / 100,
      })),
    [H],
  );

  const bitLines = useMemo(
    () =>
      [0, 1].map((k) => ({
        k,
        y: SURF + 34 + k * 48,
        txt: makeBits(Math.ceil(w / 7) + 20, 11 + k * 97),
      })),
    [w],
  );

  return (
    <div
      ref={ref}
      className="ft-river absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {/* PERFORMANS: eskiden tek bir SVG'nin İÇİNDEKİ grupları ve 12
          rakamı canlandırıyordu — SVG içi hareket ekran kartına
          devredilemez, nehir sayfa dururken bile her kare yeniden
          boyanıyordu. Artık her hareketli parça kendi HTML katmanında ve
          yalnızca transform / opacity ile kayar (yeniden boyama yok). */}
      {w > 0 && (
        <>
          <svg width={0} height={0} className="absolute" aria-hidden>
            <defs>
              <linearGradient id="ftRiverWater" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0e3b6b" />
                <stop offset=".45" stopColor="#0a2c52" />
                <stop offset="1" stopColor="#04142a" />
              </linearGradient>
            </defs>
          </svg>

          {/* dalgalar: bir dalga boyu kadar sola kayıp başa döner */}
          <div
            className="absolute top-0"
            style={{
              left: -L,
              width: w + 2 * L,
              height: H,
              animation: "ftWaveX 9s linear infinite",
            }}
          >
            <svg
              width={w + 2 * L}
              height={H}
              viewBox={`${-L} 0 ${w + 2 * L} ${H}`}
              className="absolute inset-0"
            >
              <path d={body(SURF - 6, 5)} fill={`rgba(${EDGE},.10)`} />
            </svg>
          </div>
          <div
            className="absolute top-0"
            style={{
              left: -L,
              width: w + 2 * L,
              height: H,
              animation: "ftWaveX 6s linear infinite",
            }}
          >
            <svg
              width={w + 2 * L}
              height={H}
              viewBox={`${-L} 0 ${w + 2 * L} ${H}`}
              className="absolute inset-0"
            >
              <path d={body(SURF, 6)} fill="url(#ftRiverWater)" />
              <path
                d={surface(SURF, 6)}
                fill="none"
                stroke={`rgba(${ICE},${powered ? 0.8 : 0.45})`}
                strokeWidth="1.4"
                style={{ transition: "stroke 700ms" }}
              />
              <path
                d={surface(SURF, 6)}
                fill="none"
                stroke={`rgba(${EDGE},${powered ? 0.35 : 0.18})`}
                strokeWidth="6"
              />
            </svg>
          </div>

          {/* suyun içi (yüzeyin altı kırpılır) */}
          <div
            className="absolute inset-x-0 overflow-hidden"
            style={{ top: SURF - 10, height: Math.max(0, H - SURF + 10) }}
          >
            {/* akan çizgiler (hafif modda durur) */}
            <svg
              width={w}
              height={H}
              className="absolute left-0"
              style={{ top: -(SURF - 10) }}
            >
              {lanes.map((l, i) => {
                const style: CSSVars = {
                  "--len": "-600px",
                  animation: `ftLaneFlow ${l.dur}s linear infinite`,
                  transition: "stroke-opacity 700ms",
                };
                return (
                  <line
                    key={i}
                    className="ft-lane"
                    x1={-20}
                    x2={w + 20}
                    y1={l.y}
                    y2={l.y}
                    stroke={l.c}
                    strokeWidth={l.wdt}
                    strokeOpacity={powered ? l.o * 1.6 : l.o}
                    strokeDasharray={l.dash}
                    strokeLinecap="round"
                    style={style}
                  />
                );
              })}
            </svg>

            {/* akan 0-1 satırları */}
            {bitLines.map(({ k, y, txt }) => {
              const style: CSSVars = {
                "--w": `${w}px`,
                left: -w,
                top: -(SURF - 10),
                width: 2 * w,
                height: H,
                animation: `ftBitsFlow ${38 + k * 12}s linear infinite`,
              };
              return (
                <div key={k} className="ft-bits absolute" style={style}>
                  <svg
                    width={2 * w}
                    height={H}
                    viewBox={`${-w} 0 ${2 * w} ${H}`}
                    className="absolute inset-0"
                  >
                    {[-w, 0].map((x) => (
                      <text
                        key={x}
                        x={x}
                        y={y}
                        fontFamily={MONO}
                        fontSize={10 + k}
                        letterSpacing="2"
                        fill={`rgba(${ICE},${0.13 + k * 0.04})`}
                      >
                        {txt}
                      </text>
                    ))}
                  </svg>
                </div>
              );
            })}

            {/* süzülen büyük rakamlar */}
            {digits.map((d, i) => {
              const style: CSSVars = {
                "--w": `${w + 60}px`,
                "--o": d.o,
                left: -30,
                top: d.y - (SURF - 10) - d.size * 0.8,
                fontFamily: MONO,
                fontSize: d.size,
                lineHeight: 1,
                fontWeight: 600,
                color: "#cfe6ff",
                opacity: 0,
                animation: `ftDigit ${d.dur}s linear ${d.delay}s infinite`,
              };
              return (
                <span key={i} className="ft-digit absolute" style={style}>
                  {d.ch}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   küçük parçalar
========================================================= */
function Led({
  on,
  color,
  blink,
  delay = 0,
}: {
  on: boolean;
  color: string;
  blink?: boolean;
  delay?: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-block size-1.75 shrink-0 rounded-full"
      style={{
        background: on ? color : "rgba(127,182,232,.18)",
        boxShadow: on ? `0 0 8px ${color}` : "none",
        transition: `background 250ms ${delay}ms, box-shadow 250ms ${delay}ms`,
        animation: on && blink ? "ftBlink 1.6s ease-in-out infinite" : "none",
      }}
    />
  );
}

/* =========================================================
   TELEFON KUTUSU — web'deki üç kutunun hepsi tek bir güç kaynağı
   kutusunda, küçültülmüş: üstte saat + fan, ortada sosyal portlar,
   altta menü yuvaları ve BAŞA DÖN anahtarı.
========================================================= */
function PhoneDeck({
  powered,
  fanRef,
  compact = false,
}: {
  powered: boolean;
  fanRef?: Ref<HTMLDivElement>;
  /** kısa ekran: daha sık yerleşim */
  compact?: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="relative flex flex-col">
      <div className="mb-1.5 flex h-4 items-center justify-between font-mono text-[9px] tracking-[.22em] text-[rgba(var(--ft-t),.6)]">
        <span>PSU · I/O · SLOTS</span>
        <span className="flex items-center gap-1.5">
          <Led on={powered} color="#5df2a6" blink />
          {powered ? "LINK UP" : "NO SIGNAL"}
        </span>
      </div>
      <div
        className={`relative flex flex-col rounded-xl ${compact ? "gap-2 p-2.5" : "gap-3 p-3"}`}
        style={metal(8)}
      >
        {[
          "left-1.5 top-1.5",
          "right-1.5 top-1.5",
          "left-1.5 bottom-1.5",
          "right-1.5 bottom-1.5",
        ].map((c) => (
          <Screw key={c} small className={`absolute ${c}`} />
        ))}

        {/* saat + BAŞA DÖN + fan */}
        <div className="flex items-center gap-3 pt-1">
          <div className="min-w-0 flex-1">
            <LcdClock powered={powered} />
          </div>
          <a
            href="/home"
            aria-label={t("footer.topAria")}
            className="flex flex-col items-center gap-0.5 outline-hidden"
          >
            <span
              className="relative flex h-9 w-6 flex-col overflow-hidden rounded-sm"
              style={{
                background: "#020b17",
                border: `1px solid rgba(${ICE},.45)`,
              }}
            >
              <span
                className="flex flex-1 items-center justify-center font-mono text-[9px] font-bold"
                style={{
                  background: powered
                    ? `linear-gradient(180deg, rgb(${ICE}), rgb(${EDGE}))`
                    : `rgba(${NAVY},1)`,
                  color: powered ? `rgb(${DEEP})` : T_DIM,
                }}
              >
                I
              </span>
              <span
                className="flex flex-1 items-center justify-center font-mono text-[9px] font-bold"
                style={{ color: T_DIM }}
              >
                O
              </span>
            </span>
            <span className="font-mono text-[7px] tracking-[.12em] text-[rgba(var(--ft-t),.6)]">
              {t("footer.top")}
            </span>
          </a>
          <div
            ref={fanRef}
            className={`relative shrink-0 ${compact ? "size-15" : "size-19"}`}
          >
            <Fan powered={powered} />
          </div>
        </div>

        {/* sosyal portlar: tek sıra, küçük */}
        <div
          className="grid grid-cols-5 gap-1 rounded-lg px-1 py-2"
          style={{ background: "rgba(2,11,23,.45)" }}
        >
          {PORTS.map((p, i) => {
            const Icon = p.icon;
            return (
              <a
                key={p.label}
                {...linkProps(p.href)}
                aria-label={p.label}
                className="ft-port flex flex-col items-center gap-1 outline-hidden"
              >
                <span className="ft-hole flex h-6 items-center justify-center">
                  <span className="origin-center scale-[.62]">
                    <PortShape kind={p.kind} />
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Led
                    on={powered}
                    color={`rgb(${EDGE})`}
                    delay={powered ? 250 + i * POWER_STEP_MS : 0}
                  />
                  <Icon className="size-2.75 shrink-0 text-[rgb(var(--ft-t))]" />
                </span>
                <span className="ft-plabel whitespace-nowrap font-mono text-[8.5px] tracking-[.02em] text-[rgb(var(--ft-t))]">
                  {p.label}
                </span>
              </a>
            );
          })}
        </div>

        {/* menü yuvaları: 2×2, küçük */}
        <nav className="grid grid-cols-2 gap-1.5" aria-label="Footer">
          {SLOTS.map((sl, i) => {
            const cls =
              "ft-slot relative flex h-7.5 items-center gap-2 rounded-md px-2 outline-hidden";
            const style: CSSProperties = {
              ...metal(sl.href ? 4 : -2),
              color: sl.href ? T_HI : `rgba(${TURQ},.35)`,
            };
            const inner = (
              <>
                <Led
                  on={powered && !!sl.href}
                  color={`rgb(${EDGE})`}
                  delay={powered ? 250 + (PORTS.length + i) * POWER_STEP_MS : 0}
                />
                <span className="flex-1 text-right font-mono text-[9.5px] tracking-[.16em]">
                  {t(sl.label)}
                </span>
                <span
                  aria-hidden
                  className="ft-slot-glow pointer-events-none absolute inset-0 rounded-md opacity-0 transition-opacity duration-300"
                  style={{
                    boxShadow: `inset 3px 0 0 ${T_HI}, 0 0 12px rgba(${TURQ},.35)`,
                    background: `linear-gradient(90deg, rgba(${TURQ},.2), transparent 70%)`,
                  }}
                />
              </>
            );
            return sl.href ? (
              <a key={sl.label} href={sl.href} className={cls} style={style}>
                {inner}
              </a>
            ) : (
              <span
                key={sl.label}
                className={cls}
                style={style}
                title={t("footer.soon")}
              >
                {inner}
              </span>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* =========================================================
   I/O PANELİ — her sosyal hesap bir port. Üstüne gelince altından
   kablolu fiş kayarak takılır, portun LED'i yanar.
========================================================= */
function IOShield({ powered }: { powered: boolean }) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex h-4 items-center font-mono text-[10px] tracking-[.26em] text-[rgba(var(--ft-t),.6)] justify-between">
        <span>I/O · CONNECT</span>
        <span className="flex items-center gap-2">
          <Led on={powered} color="#5df2a6" blink />
          {powered ? "LINK UP" : "NO SIGNAL"}
        </span>
      </div>
      <div
        className="ft-iobox relative flex flex-col justify-around rounded-xl px-3 py-4 sm:px-5 sm:py-0"
        style={metal(6)}
      >
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-5 sm:gap-x-3 sm:gap-y-0">
          {PORTS.map((p, i) => {
            const Icon = p.icon;
            return (
              <a
                key={p.label}
                {...linkProps(p.href)}
                aria-label={p.label}
                className="ft-port group relative flex flex-col items-center gap-1.5 outline-hidden"
              >
                <span className="relative flex h-11.5 w-full items-center justify-center overflow-hidden">
                  <span className="ft-hole relative z-10 transition">
                    <PortShape kind={p.kind} />
                  </span>
                  {/* takılan fiş + kablo */}
                  <span className="ft-plug pointer-events-none absolute left-1/2 top-7.5 z-0 flex flex-col items-center opacity-0 transition duration-300">
                    <span
                      className="block h-3 w-8 rounded-[3px]"
                      style={{
                        background: `linear-gradient(180deg, rgb(${ICE}), rgb(${EDGE}))`,
                        boxShadow: `0 0 10px rgba(${EDGE},.8)`,
                      }}
                    />
                    <span
                      className="block h-6 w-1"
                      style={{ background: `rgb(${EDGE})` }}
                    />
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Led
                    on={powered}
                    color={`rgb(${EDGE})`}
                    delay={powered ? 250 + i * POWER_STEP_MS : 0}
                  />
                  <span className="whitespace-nowrap font-mono text-[clamp(8px,0.62vw,11px)] tracking-[.08em] text-[rgba(var(--ft-t),.6)]">
                    {p.spec}
                  </span>
                </span>
                <span className="ft-plabel flex items-center gap-1 whitespace-nowrap font-mono text-[clamp(10px,0.82vw,14px)] tracking-[.02em] text-[rgb(var(--ft-t))] transition">
                  <Icon className="size-[1.15em] shrink-0" /> {p.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** port delikleri (SVG) */
function PortShape({ kind }: { kind: PortKind }) {
  const hole = "#020b17";
  const rim = `rgba(${ICE},.55)`;
  const tongue = `rgb(${EDGE})`;
  switch (kind) {
    case "usb":
      return (
        <svg width="42" height="20" viewBox="0 0 42 20" aria-hidden>
          <rect
            x="1"
            y="1"
            width="40"
            height="18"
            rx="2"
            fill={hole}
            stroke={rim}
          />
          <rect x="6" y="5" width="30" height="5" rx="1" fill={tongue} />
        </svg>
      );
    case "hdmi":
      return (
        <svg width="46" height="20" viewBox="0 0 46 20" aria-hidden>
          <path d="M2 2 H44 V12 L38 18 H8 L2 12 Z" fill={hole} stroke={rim} />
          <rect
            x="9"
            y="6"
            width="28"
            height="3.5"
            rx="1"
            fill={`rgba(${ICE},.75)`}
          />
        </svg>
      );
    case "dp":
      return (
        <svg width="40" height="20" viewBox="0 0 40 20" aria-hidden>
          <path d="M2 2 H38 V18 H9 L2 11 Z" fill={hole} stroke={rim} />
          <rect
            x="10"
            y="7"
            width="22"
            height="3.5"
            rx="1"
            fill={`rgba(${ICE},.75)`}
          />
        </svg>
      );
    case "usbc":
      return (
        <svg width="34" height="16" viewBox="0 0 34 16" aria-hidden>
          <rect
            x="1"
            y="1"
            width="32"
            height="14"
            rx="7"
            fill={hole}
            stroke={rim}
          />
          <rect
            x="7"
            y="6.2"
            width="20"
            height="3.6"
            rx="1.8"
            fill={`rgb(${EDGE})`}
          />
        </svg>
      );
    case "rj45":
      return (
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
          <rect
            x="1"
            y="1"
            width="32"
            height="32"
            rx="2"
            fill={`rgba(${ICE},.12)`}
            stroke={rim}
          />
          <path d="M5 6 H29 V24 H22 V29 H12 V24 H5 Z" fill={hole} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
            <rect
              key={k}
              x={8 + k * 2.4}
              y="7"
              width="1.2"
              height="5"
              fill="#d9b25c"
            />
          ))}
        </svg>
      );
  }
}

/* =========================================================
   GENİŞLEME YUVALARI — menü. DOCUMENTS şimdilik boş (kapalı) yuva.
========================================================= */
function ExpansionSlots({ powered }: { powered: boolean }) {
  const { t } = useLang();
  return (
    <nav className="flex flex-col" aria-label="Footer">
      <span className="mb-2 flex h-4 items-center font-mono text-[10px] tracking-[.26em] text-[rgba(var(--ft-t),.6)]">
        EXPANSION SLOTS
      </span>
      {/* telefonda 2'li ızgara; geniş ekranda kutularla aynı boyda,
          yuvalar aralarında eşit boşlukla (space-around) dizilir */}
      <div className="ft-slots grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:justify-around sm:gap-0">
        {SLOTS.map((s, i) => {
          const inner = (
            <>
              <Screw small />
              <span
                aria-hidden
                className="h-3 flex-1 opacity-70"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,.6) 0 6px, transparent 6px 10px)`,
                  borderRadius: 2,
                }}
              />
              <span className="w-23 text-right font-mono text-[11px] tracking-[.18em]">
                {t(s.label)}
              </span>
              <Led
                on={powered && !!s.href}
                color={`rgb(${EDGE})`}
                delay={powered ? 250 + (PORTS.length + i) * POWER_STEP_MS : 0}
              />
              {/* üstüne gelince kenardan yanan ışık */}
              <span
                aria-hidden
                className="ft-slot-glow pointer-events-none absolute inset-0 rounded-md opacity-0 transition-opacity duration-300"
                style={{
                  boxShadow: `inset 3px 0 0 ${T_HI}, 0 0 16px rgba(${TURQ},.35)`,
                  background: `linear-gradient(90deg, rgba(${TURQ},.2), transparent 70%)`,
                }}
              />
            </>
          );
          const cls =
            "ft-slot relative flex h-9.5 items-center gap-3 rounded-md px-3 outline-hidden transition";
          const style: CSSProperties = {
            ...metal(s.href ? 4 : -2),
            color: s.href ? T_HI : `rgba(${TURQ},.35)`,
          };
          return s.href ? (
            <a key={s.label} href={s.href} className={cls} style={style}>
              {inner}
            </a>
          ) : (
            <span key={s.label} className={cls} style={style} title={t("footer.soon")}>
              {inner}
            </span>
          );
        })}
      </div>
    </nav>
  );
}

/* =========================================================
   GÜÇ KAYNAĞI — sistem açılınca fan döner, ekran yanar.
========================================================= */
function PSU({
  powered,
  fanRef,
}: {
  powered: boolean;
  /** fanın yeri: avatar bunun önüne oturur */
  fanRef?: Ref<HTMLDivElement>;
}) {
  const { t } = useLang();
  return (
    <div className="relative flex flex-col">
      <span className="mb-2 flex h-4 items-center font-mono text-[10px] tracking-[.26em] text-[rgba(var(--ft-t),.6)] justify-end">
        PSU · 2026W · 80+ CREATIVE
      </span>
      <div
        className="relative flex flex-row-reverse items-center gap-4 rounded-xl p-3.5"
        style={{ ...metal(8), height: BOX_H }}
      >
        {[
          "left-2 top-2",
          "right-2 top-2",
          "left-2 bottom-2",
          "right-2 bottom-2",
        ].map((c) => (
          <Screw key={c} small className={`absolute ${c}`} />
        ))}

        {/* FAN + IZGARA */}
        <div
          ref={fanRef}
          className="relative aspect-square h-full shrink-0 lg:max-xl:h-[82%]"
        >
          <Fan powered={powered} />
        </div>

        {/* KONTROLLER */}
        <div className="flex h-full min-w-0 flex-1 flex-col justify-around">
          <LcdClock powered={powered} />

          <div className="flex items-end justify-between gap-3">
            {/* güç girişi + kablo */}
            <div className="relative flex flex-col items-center gap-1">
              <span className="font-mono text-[8px] tracking-[.16em] text-[rgba(var(--ft-t),.6)]">
                AC IN
              </span>
              <svg width="44" height="34" viewBox="0 0 44 34" aria-hidden>
                <path
                  d="M4 2 H40 V24 L32 32 H12 L4 24 Z"
                  fill="#020b17"
                  stroke={`rgba(${ICE},.5)`}
                />
                {/* takılı fiş */}
                <path
                  d="M8 5 H36 V22 L30 28 H14 L8 22 Z"
                  fill={`rgba(${NAVY},1)`}
                  stroke={powered ? `rgb(${EDGE})` : `rgba(${ICE},.3)`}
                  style={{ transition: "stroke 400ms" }}
                />
              </svg>
            </div>

            {/* I/O anahtarı = BAŞA DÖN */}
            <a
              href="/home"
              aria-label={t("footer.topAria")}
              className="group flex flex-col items-center gap-1 outline-hidden"
            >
              <span
                className="relative flex h-11 w-7.5 flex-col overflow-hidden rounded-[5px]"
                style={{
                  background: "#020b17",
                  border: `1px solid rgba(${ICE},.45)`,
                }}
              >
                <span
                  className="flex flex-1 items-center justify-center font-mono text-[11px] font-bold transition"
                  style={{
                    background: powered
                      ? `linear-gradient(180deg, rgb(${ICE}), rgb(${EDGE}))`
                      : `rgba(${NAVY},1)`,
                    color: powered ? `rgb(${DEEP})` : T_DIM,
                    boxShadow: powered ? `0 0 12px rgba(${EDGE},.9)` : "none",
                  }}
                >
                  I
                </span>
                <span
                  className="flex flex-1 items-center justify-center font-mono text-[11px] font-bold transition group-hover:bg-[#46beff]/25"
                  style={{ color: T_DIM }}
                >
                  O
                </span>
              </span>
              <span className="font-mono text-[8px] tracking-[.16em] text-[rgba(var(--ft-t),.6)] transition group-hover:text-[#ffffff]">
                {t("footer.top")}
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/** PSU fanı: enerji gelince yavaşça hızlanıp sabit hızda döner */
function Fan({ powered }: { powered: boolean }) {
  const blades = 7;
  return (
    <div
      className="absolute inset-0 rounded-full"
      style={{
        background: `radial-gradient(circle, #020b17 0%, #03101f 70%, rgba(${NAVY},1) 100%)`,
        boxShadow: `inset 0 0 0 3px rgba(${ICE},.18), inset 0 0 30px rgba(0,0,0,.8)`,
      }}
    >
      {/* yanınca fanın arkasından gelen ışık */}
      <div
        className="absolute inset-[10%] rounded-full transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle, rgba(${EDGE},.35), transparent 70%)`,
          opacity: powered ? 1 : 0,
        }}
      />
      <div
        className="ft-fan-a absolute inset-[6%]"
        style={{
          animation: powered
            ? "ftSpinUp 1.6s cubic-bezier(.55,0,1,1) forwards"
            : "none",
        }}
      >
        <svg
          className="ft-fan-b size-full"
          viewBox="-50 -50 100 100"
          style={{
            animation: powered ? "ftSpin .55s linear 1.6s infinite" : "none",
          }}
          aria-hidden
        >
          {Array.from({ length: blades }, (_, k) => (
            <path
              key={k}
              transform={`rotate(${(360 / blades) * k})`}
              d="M0 -10 C 14 -26, 34 -30, 44 -16 C 30 -18, 18 -10, 6 0 Z"
              fill={`rgba(${NAVY},.95)`}
              stroke={`rgba(${EDGE},.7)`}
              strokeWidth=".8"
            />
          ))}
          <circle r="11" fill={`rgb(${DEEP})`} stroke={`rgba(${ICE},.4)`} />
          <circle r="5" fill={powered ? `rgb(${EDGE})` : `rgba(${ICE},.15)`} />
        </svg>
      </div>
      {/* ızgara */}
      <svg
        className="absolute inset-0 size-full"
        viewBox="-50 -50 100 100"
        aria-hidden
      >
        {[46, 37, 28, 19].map((r) => (
          <circle
            key={r}
            r={r}
            fill="none"
            stroke={`rgba(${ICE},.45)`}
            strokeWidth="1.3"
          />
        ))}
        {[0, 45, 90, 135].map((a) => (
          <line
            key={a}
            x1="-46"
            x2="46"
            transform={`rotate(${a})`}
            stroke={`rgba(${ICE},.4)`}
            strokeWidth="1.3"
          />
        ))}
        <circle r="9" fill={`rgb(${NAVY})`} stroke={`rgba(${ICE},.5)`} />
      </svg>
    </div>
  );
}

/** PSU üzerindeki küçük ekran: İstanbul saati */
function LcdClock({ powered }: { powered: boolean }) {
  const { t } = useLang();
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const tick = () => setNow(fmt.format(new Date()));
    /* ilk değer effect gövdesinde senkron set edilmesin diye zamanlayıcıyla */
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return (
    <div
      className="rounded-md px-3 py-2 font-mono transition-all duration-700"
      style={{
        background: powered
          ? `linear-gradient(180deg, #eefcff, ${T_HI} 60%, rgba(${TURQ},.85))`
          : "#020b17",
        border: `1px solid rgba(${TURQ},${powered ? 0.9 : 0.15})`,
        boxShadow: powered
          ? `0 0 16px rgba(${TURQ},.35), inset 0 1px 0 rgba(255,255,255,.5)`
          : "none",
        color: powered ? `rgba(${DEEP},.75)` : T_DIM,
      }}
    >
      <div className="flex items-center justify-between text-[9px] font-bold tracking-[.2em]">
        <span>{t("footer.city")}</span>
        <Led on={powered} color="#5df2a6" />
      </div>
      <div
        className="mt-0.5 text-[clamp(15px,1.45vw,20px)] font-bold tracking-[.06em] transition-opacity duration-500"
        style={{
          color: powered ? `rgb(${DEEP})` : T_HI,
          fontVariantNumeric: "tabular-nums",
          opacity: powered ? 1 : 0.08,
        }}
      >
        {now ?? "--:--:--"}
      </div>
      <div className="text-[9px] font-bold tracking-[.2em]">
        {powered ? "STATUS · AVAILABLE" : "STANDBY"}
      </div>
    </div>
  );
}

/* =========================================================
   küçük parçalar
========================================================= */
function Screw({
  className = "",
  small,
}: {
  className?: string;
  small?: boolean;
}) {
  const s = small ? 10 : 14;
  return (
    <span
      aria-hidden
      className={`${className.includes("absolute") ? "" : "relative"} inline-block shrink-0 rounded-full ${className}`}
      style={{
        width: s,
        height: s,
        background: `radial-gradient(circle at 35% 30%, rgba(${ICE},.9), rgba(${EDGE},.5) 45%, rgba(${DEEP},1) 100%)`,
        boxShadow: "0 1px 2px rgba(0,0,0,.6)",
      }}
    >
      <span
        className="absolute left-1/2 top-1/2 block h-0.375 w-[70%] -translate-x-1/2 -translate-y-1/2 rotate-45"
        style={{ background: `rgba(${DEEP},.9)` }}
      />
    </span>
  );
}

/** Açılış hikâyesini baştan oynatır (ana sayfayı yeniden yükler). */
function ReplayIntro() {
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={() => {
        /* tam yeniden yükleme: hikâye sıfırdan başlasın (istemci tarafı
           geçişte bölümler son halinde kalıyordu) */
        if (window.location.pathname === "/") window.location.reload();
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- bilerek tam yükleme
        else window.location.href = "/";
      }}
      className="group flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-[rgba(70,190,255,.28)] bg-[rgba(6,22,46,.55)] px-2.5 py-1 font-mono text-[11px] text-[#8fdcea] transition-colors hover:border-[#6ef5e8] hover:text-[#c4f7fb] focus-visible:outline-2 focus-visible:outline-[#6ef5e8] sm:text-[12px]"
      aria-label={t("footer.replayAria")}
    >
      <span
        aria-hidden
        className="inline-block transition-transform duration-500 group-hover:-rotate-180"
        style={{ color: "#6ef5e8" }}
      >
        ↻
      </span>
      <span style={{ color: "#5df2a6" }}>{t("footer.replayCmd")}</span>
      <span>{t("footer.replayArg")}</span>
    </button>
  );
}
