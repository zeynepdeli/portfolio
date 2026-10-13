"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { IconType } from "react-icons";
import {
  FaLinkedin,
  FaGithub,
  FaBehance,
  FaInstagram,
  FaTelegram,
  FaEnvelope,
  FaRegCopy,
  FaCheck,
} from "react-icons/fa";
import SittingAvatar, {
  SIT_ASPECT,
  SIT_SEAT,
} from "@/components/ui/SittingAvatar";
import { useViewport } from "@/components/ui/ChipLayout";

/* =========================================================
   FOOTER — "KASANIN ARKASI"
   • I/O PANELİ        → sosyal hesaplar gerçek portlar
   • GENİŞLEME YUVALARI → menü
   • GÜÇ KAYNAĞI (PSU) → fan, saat ekranı, güç kablosu, başa dön
   • SERİ NUMARASI     → isim, rol, konum
   • EN ALTTA 0-1 NEHRİ → avatar fandan zıplar, nehre dalar, oturur;
                          suya değince sistem "enerjilenir".
========================================================= */

/* ---- içerik (kendi bilgilerinle değiştir) ---- */
const NAME = "AYŞE YILMAZ";
const ROLE = "Creative AI Architect · Digital Developer · Systems Designer";
const EMAIL = "hello@example.com";
const SERIAL = "ZY-2026-IST-0427";
const YEAR = new Date().getFullYear();

type PortKind = "usb" | "hdmi" | "dp" | "rj45" | "audio";
type PortItem = {
  kind: PortKind;
  spec: string;
  label: string;
  href: string;
  icon: IconType;
};

const PORTS: PortItem[] = [
  {
    kind: "usb",
    spec: "USB 3.2",
    label: "LinkedIn",
    href: "#",
    icon: FaLinkedin,
  },
  { kind: "usb", spec: "USB 3.2", label: "GitHub", href: "#", icon: FaGithub },
  {
    kind: "hdmi",
    spec: "HDMI 2.1",
    label: "Behance",
    href: "#",
    icon: FaBehance,
  },
  {
    kind: "dp",
    spec: "DP 1.4",
    label: "Telegram",
    href: "#",
    icon: FaTelegram,
  },
  {
    kind: "rj45",
    spec: "LAN 10G",
    label: "E-mail",
    href: `mailto:${EMAIL}`,
    icon: FaEnvelope,
  },
  {
    kind: "audio",
    spec: "AUDIO",
    label: "Instagram",
    href: "#",
    icon: FaInstagram,
  },
];

const SLOTS: { label: string; href: string | null }[] = [
  { label: "HOME", href: "/home" },
  { label: "SKILLS", href: "/roadmap" },
  { label: "PROJECTS", href: "/projects" },
  { label: "DOCUMENTS", href: null }, // şimdilik boş yuva
];

/* ---- renkler ---- */
const EDGE = "70,190,255"; // #46beff
const ICE = "207,230,255"; // #cfe6ff
const NAVY = "10,44,82"; // #0a2c52
const DEEP = "6,31,58"; // #061f3a

/* ---- animasyon ---- */
const JUMP_MS = 1150; // fandan nehre uçuş
const ARC_PX = 230; // zıplamanın tepe yüksekliği
const AV_H = 150; // nehirde oturan avatarın boyu (px)
const AV_X = 0.6; // dar ekranda avatarın nehirdeki yatay yeri (oran)

/* ---- 0-1 nehri ---- */
const RIVER_H = 150;
const SURF = 38; // su yüzeyinin şeridin üstünden uzaklığı
const WAVE_LEN = 240;
const POWER_STEP_MS = 110; // port LED'lerinin sırayla yanma aralığı

type Pt = { x: number; y: number };
type Phase = "idle" | "jump" | "landed";
type Flight = { x: number; y: number; h: number; rot: number };
/** CSS özel değişkenleri (--dx, --w ...) için tip */
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ortak metal yüzey */
const metal = (light = 0): CSSProperties => ({
  background: `
    repeating-linear-gradient(90deg, rgba(255,255,255,.018) 0 1px, transparent 1px 3px),
    linear-gradient(180deg, rgba(${14 + light},${59 + light},${107 + light},1) 0%, rgba(${NAVY},1) 55%, rgba(${DEEP},1) 100%)
  `,
  border: `1px solid rgba(${ICE},.22)`,
  boxShadow: `inset 0 1px 0 rgba(255,255,255,.16), inset 0 -2px 0 rgba(0,0,0,.35), 0 14px 34px rgba(0,0,0,.38)`,
});

type Props = {
  /** footer görünür/açık mı. Verilmezse ekrana girince kendisi başlar. */
  open?: boolean;
};

export default function FooterSection({ open }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const riverRef = useRef<HTMLDivElement>(null);
  /** avatarın oturacağı sütun (çağrı sütunu: altı boş) */
  const spotRef = useRef<HTMLDivElement>(null);

  const [inView, setInView] = useState(false);

  /* ekran boyuna göre: kısa ekranda alçak nehir, telefonda küçük avatar */
  const { w: vw, h: vh } = useViewport();
  const phone = vw < 640;
  const riverH = vh < 560 ? 96 : phone ? 128 : RIVER_H;
  const avH = vh < 560 ? 96 : phone ? 118 : AV_H;
  /* xl altı: sütunlar alt alta/2'li; içerik ekranı aşarsa kendi içinde kayar.
     Telefonda footer tüm ekranı kaplar. */
  const scrollerStyle: CSSProperties =
    vw >= 1280
      ? {}
      : phone
        ? { height: Math.max(200, vh - riverH + 12) }
        : { maxHeight: Math.max(200, vh - riverH - 30) };
  const isOpen = open ?? inView;

  const [phase, setPhase] = useState<Phase>("idle");
  const [flight, setFlight] = useState<Flight | null>(null);
  const [seat, setSeat] = useState<Pt | null>(null);
  const [landKey, setLandKey] = useState(0);
  const [prevOpen, setPrevOpen] = useState(isOpen);
  const powered = phase === "landed";

  /* footer kapanınca sıfırla (effect yerine render sırasında state ayarlama) */
  if (prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    if (!isOpen) {
      setPhase("idle");
      setFlight(null);
    }
  }

  /* animasyon döngüsü güncel avatar boyunu okusun, ama yeniden başlamasın */
  const avHRef = useRef(avH);
  useEffect(() => {
    avHRef.current = avH;
  }, [avH]);

  /* oturma yeri: 0-1 nehrinin su yüzeyi */
  const measureSeat = useCallback((): Pt | null => {
    const root = rootRef.current;
    const river = riverRef.current;
    if (!root || !river) return null;
    const r = root.getBoundingClientRect();
    const v = river.getBoundingClientRect();
    const spot = spotRef.current?.getBoundingClientRect();
    /* geniş ekranda çağrı sütununun ortası; dar ekranda nehrin AV_X'i */
    const x =
      spot && window.innerWidth >= 1280
        ? spot.left - r.left + Math.min(spot.width * 0.62, 260)
        : v.left - r.left + v.width * AV_X;
    return { x, y: v.top - r.top + SURF };
  }, []);

  /* ResizeObserver gözlemeye başlarken bir kez tetiklenir → ilk ölçüm de buradan */
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

  /* ---------- ZIPLAMA ---------- */
  useEffect(() => {
    if (!isOpen) return;

    let raf = 0;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => {
        setSeat(measureSeat());
        setPhase("landed");
        setLandKey((k) => k + 1);
      });
      return () => cancelAnimationFrame(raf);
    }

    /* başlangıç: fan göbeğindeki avatarın ekrandaki yeri ve boyu */
    const hub = document.querySelector("[data-hub-rider]");
    const hr = hub?.getBoundingClientRect();
    const rootR = rootRef.current?.getBoundingClientRect();
    const start =
      hr && hr.width > 4
        ? {
            x: hr.left + hr.width / 2,
            y: hr.top + hr.height / 2,
            h: hr.height * 0.88,
          }
        : {
            x: window.innerWidth * 0.82,
            y: (rootR?.top ?? window.innerHeight) - 160,
            h: avHRef.current * 0.8,
          };

    let t0 = 0;
    const tick = (now: number) => {
      if (!t0) {
        t0 = now;
        setPhase("jump");
      }
      const t = clamp((now - t0) / JUMP_MS);
      const root = rootRef.current;
      const s = measureSeat();
      if (!root || !s) {
        raf = requestAnimationFrame(tick);
        return;
      }
      /* footer hâlâ kayıyor olabilir: hedefi her karede canlı ölç */
      const r = root.getBoundingClientRect();
      const h = avHRef.current;
      const end = { x: s.x, y: s.y - SIT_SEAT * h + h / 2 };
      const sx = start.x - r.left;
      const sy = start.y - r.top;
      const dir = end.x >= sx ? 1 : -1;
      setFlight({
        x: lerp(sx, end.x, t),
        y: lerp(sy, end.y, t) - ARC_PX * 4 * t * (1 - t),
        h: lerp(start.h, h, easeInOut(t)),
        rot: 360 * dir * easeInOut(clamp((t - 0.08) / 0.84)),
      });
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setSeat(s);
        setPhase("landed");
        setLandKey((k) => k + 1);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, measureSeat]);

  const avW = avH * SIT_ASPECT;

  return (
    <footer
      ref={rootRef}
      className="relative w-full"
      style={{ overflow: "visible" }}
    >
      <style>{`
        @keyframes ftSpinUp { from { transform: rotate(0); } to { transform: rotate(540deg); } }
        @keyframes ftSpin { to { transform: rotate(360deg); } }
        @keyframes ftSquash {
          0%   { transform: scale(1.12, .82); }
          45%  { transform: scale(.94, 1.07); }
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
        @keyframes ftCablePulse { to { stroke-dashoffset: -60; } }
        .ft-plug { transform: translate(-50%, 14px); }
        .ft-port:hover .ft-plug, .ft-port:focus-visible .ft-plug { transform: translate(-50%, 0); opacity: 1; }
        .ft-port:hover .ft-hole, .ft-port:focus-visible .ft-hole { filter: drop-shadow(0 0 8px rgba(${EDGE},.9)); }
        .ft-port:hover .ft-plabel, .ft-port:focus-visible .ft-plabel { color: #fff; }
        .ft-slot:hover .ft-slot-glow, .ft-slot:focus-visible .ft-slot-glow { opacity: 1; }
        @media (prefers-reduced-motion: reduce) {
          .ft-fan-a, .ft-fan-b, .ft-cable, .ft-river * { animation: none !important; }
        }
      `}</style>

      {/* ================= KASA ARKA YÜZÜ ================= */}
      <div
        className="relative overflow-hidden rounded-t-4xl"
        style={{
          background: `
            radial-gradient(ellipse 50% 70% at 85% 100%, rgba(${EDGE},.14), transparent 70%),
            linear-gradient(180deg, #0b2a4a 0%, #071d36 55%, #04142a 100%)
          `,
          borderTop: `1px solid rgba(${EDGE},.4)`,
          boxShadow: `0 -24px 70px rgba(0,0,0,.5), inset 0 1px 0 rgba(${ICE},.35)`,
        }}
      >
        {/* kasa perforasyonu (üst şerit) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-4 h-5 opacity-60"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(0,0,0,.55) 2.2px, transparent 2.6px)`,
            backgroundSize: "12px 10px",
            maskImage:
              "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
          }}
        />
        {/* kasa vidaları */}
        {["left-4 top-4", "right-4 top-4"].map((c) => (
          <Screw key={c} className={`absolute ${c}`} />
        ))}

        {/* dar ekranlarda sütunlar alt alta / 2'li dizilir; yükseklik ekranı
            aşarsa bu alan kendi içinde kayar (nehir altta sabit kalır) */}
        <div
          data-footer-scroll
          className="relative z-10 grid content-start gap-4 overflow-y-auto px-4 pb-6 pt-9 sm:px-6 md:grid-cols-2 md:gap-5 lg:px-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,.72fr)_minmax(0,1fr)] xl:content-normal xl:items-end xl:overflow-visible xl:pb-8 xl:pt-11"
          style={scrollerStyle}
        >
          {/* 1. sütun: çağrı — altı boş kalır, avatar orada nehirde oturur */}
          <div
            ref={spotRef}
            className="flex flex-col gap-3 self-start md:col-span-2 xl:col-span-1"
          >
            <span
              className="font-mono text-[10px] tracking-[.26em]"
              style={{ color: `rgba(${EDGE},.95)` }}
            >
              [ REAR PANEL · END OF TRANSMISSION ]
            </span>
            <h2
              className="whitespace-nowrap font-mono text-[clamp(18px,1.75vw,28px)] font-bold leading-[1.15] text-[#c4f7fb]"
              style={{ textShadow: `0 0 22px rgba(${EDGE},.35)` }}
            >
              Bir sonraki projeyi
              <br />
              <span style={{ color: "#6ef5e8" }}>birlikte kuralım.</span>
            </h2>
            <p className="font-mono text-[11px] leading-snug text-[#8fdcea]">
              {ROLE}
            </p>
            <EmailCopy />
            <span className="font-mono text-[9px] tracking-[.2em] text-[#5fb8d0]">
              © {YEAR} {NAME} · ALL SIGNALS RESERVED
            </span>
          </div>

          {/* 2. sütun: I/O paneli + seri etiketi */}
          <div className="flex flex-col gap-3">
            <IOShield powered={powered} />
            <SerialLabel />
          </div>

          {/* 3. sütun: genişleme yuvaları (menü) */}
          <ExpansionSlots powered={powered} />

          {/* 4. sütun: güç kaynağı */}
          <PSU powered={powered} />
        </div>

        {/* ---------- EN ALT: 0-1 NEHRİ ---------- */}
        <div
          ref={riverRef}
          className="relative z-5 -mt-3 w-full"
          style={{ height: riverH }}
        >
          <BinaryRiver powered={powered} height={riverH} />
        </div>
      </div>

      {/* ================= UÇAN AVATAR ================= */}
      {phase === "jump" && flight && (
        <div
          className="pointer-events-none absolute z-40"
          style={{
            left: flight.x - (flight.h * SIT_ASPECT) / 2,
            top: flight.y - flight.h / 2,
            transform: `rotate(${flight.rot}deg)`,
            filter: `drop-shadow(0 0 14px rgba(${EDGE},.55))`,
          }}
        >
          <SittingAvatar height={flight.h} swinging={false} />
        </div>
      )}

      {/* ================= 0-1 NEHRİNDE SÜZÜLEN AVATAR ================= */}
      {powered && seat && (
        <>
          <div
            className="pointer-events-none absolute z-40"
            style={{
              left: seat.x - avW / 2,
              top: seat.y - SIT_SEAT * avH,
              /* dalgalarla hafifçe inip kalkar */
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

          {/* darbe halkaları */}
          {[0, 140].map((d) => (
            <span
              key={`r${landKey}-${d}`}
              className="pointer-events-none absolute z-30 rounded-[50%]"
              style={{
                left: seat.x,
                top: seat.y,
                width: 230,
                height: 44,
                border: `2px solid rgba(${ICE},.85)`,
                boxShadow: `0 0 14px rgba(${EDGE},.8)`,
                animation: `ftRing 760ms ease-out ${d}ms both`,
              }}
            />
          ))}

          {/* SIÇRAYAN BİTLER — suya dalınca 0 ve 1'ler havaya saçılıp geri düşer */}
          {Array.from({ length: 16 }, (_, i) => {
            const a = Math.PI + (Math.PI * (i + 0.5)) / 16;
            const dist = 70 + ((i * 41) % 80);
            const style: CSSVars = {
              left: seat.x - 4,
              top: seat.y - 10,
              fontSize: 11 + (i % 3) * 3,
              color: i % 3 === 0 ? "#e1f8ff" : `rgb(${EDGE})`,
              textShadow: `0 0 8px rgba(${EDGE},.9)`,
              "--dx": `${Math.cos(a) * dist}px`,
              "--dy": `${Math.sin(a) * dist * 0.9}px`,
              animation: `ftBitSplash 900ms cubic-bezier(.2,.7,.4,1) ${i * 12}ms both`,
            };
            return (
              <span
                key={`s${landKey}-${i}`}
                className="pointer-events-none absolute z-43 font-mono font-bold"
                style={style}
              >
                {(i * 7) % 3 === 0 ? "1" : "0"}
              </span>
            );
          })}
        </>
      )}
    </footer>
  );
}

/* =========================================================
   I/O PANELİ — her sosyal hesap bir port. Üstüne gelince altından
   kablolu fiş kayarak takılır, portun LED'i yanar.
========================================================= */
function IOShield({ powered }: { powered: boolean }) {
  return (
    <div className="relative rounded-xl px-5 pb-4 pt-3" style={metal(6)}>
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] tracking-[.26em] text-[#5fb8d0]">
        <span>I/O · CONNECT</span>
        <span className="flex items-center gap-2">
          <Led on={powered} color="#5df2a6" blink />
          {powered ? "LINK UP" : "NO SIGNAL"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-6">
        {PORTS.map((p, i) => {
          const Icon = p.icon;
          return (
            <a
              key={p.label}
              href={p.href}
              target={p.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noopener noreferrer"
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
                <span className="whitespace-nowrap font-mono text-[8px] tracking-[.08em] text-[#5fb8d0]">
                  {p.spec}
                </span>
              </span>
              <span className="ft-plabel flex items-center gap-1 whitespace-nowrap font-mono text-[9px] tracking-[.02em] text-[#a8eef6] transition">
                <Icon size={11} /> {p.label}
              </span>
            </a>
          );
        })}
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
    case "audio":
      return (
        <svg width="46" height="22" viewBox="0 0 46 22" aria-hidden>
          {[0, 1, 2].map((k) => (
            <g key={k} transform={`translate(${8 + k * 15} 11)`}>
              <circle
                r="6.5"
                fill="none"
                stroke={[`rgb(${EDGE})`, `rgb(${ICE})`, "#2a6db0"][k]}
                strokeWidth="2"
              />
              <circle r="3" fill={hole} />
            </g>
          ))}
        </svg>
      );
  }
}

/* =========================================================
   GENİŞLEME YUVALARI — menü. DOCUMENTS şimdilik boş (kapalı) yuva.
========================================================= */
function ExpansionSlots({ powered }: { powered: boolean }) {
  return (
    <nav
      className="grid grid-cols-2 gap-2 sm:flex sm:flex-col"
      aria-label="Footer"
    >
      <span className="col-span-2 mb-1 font-mono text-[10px] tracking-[.26em] text-[#5fb8d0]">
        EXPANSION SLOTS
      </span>
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
              {s.label}
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
                boxShadow: `inset 3px 0 0 rgb(${ICE}), 0 0 16px rgba(${EDGE},.45)`,
                background: `linear-gradient(90deg, rgba(${EDGE},.22), transparent 70%)`,
              }}
            />
          </>
        );
        const cls =
          "ft-slot relative flex h-9.5 items-center gap-3 rounded-md px-3 outline-hidden transition";
        const style: CSSProperties = {
          ...metal(s.href ? 4 : -2),
          color: s.href ? "#e6f2ff" : "rgba(127,182,232,.45)",
        };
        return s.href ? (
          <a key={s.label} href={s.href} className={cls} style={style}>
            {inner}
          </a>
        ) : (
          <span key={s.label} className={cls} style={style} title="Yakında">
            {inner}
          </span>
        );
      })}
    </nav>
  );
}

/* =========================================================
   GÜÇ KAYNAĞI — sistem açılınca fan döner, ekran yanar.
========================================================= */
function PSU({ powered }: { powered: boolean }) {
  return (
    <div className="relative">
      <span className="mb-2 block text-right font-mono text-[10px] tracking-[.26em] text-[#5fb8d0]">
        PSU · 2026W · 80+ CREATIVE
      </span>
      <div
        className="relative flex h-43 items-center gap-4 rounded-xl p-3.5"
        style={metal(8)}
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
        <div className="relative aspect-square h-full shrink-0">
          <Fan powered={powered} />
        </div>

        {/* KONTROLLER */}
        <div className="flex h-full min-w-0 flex-1 flex-col justify-between py-1">
          <LcdClock powered={powered} />

          <div className="flex items-end justify-between gap-3">
            {/* güç girişi + kablo */}
            <div className="relative flex flex-col items-center gap-1">
              <span className="font-mono text-[8px] tracking-[.16em] text-[#5fb8d0]">
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
              {/* güç kablosu: fişten aşağı, kasanın dışına iner */}
              <svg
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-11 h-65 w-15 -translate-x-1/2 overflow-visible"
                viewBox="0 0 60 260"
              >
                <path
                  d="M30 0 V40 C30 80, 50 90, 50 260"
                  fill="none"
                  stroke="#020b17"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <path
                  d="M30 0 V40 C30 80, 50 90, 50 260"
                  fill="none"
                  stroke={`rgba(${ICE},.18)`}
                  strokeWidth="1.5"
                  transform="translate(-3 0)"
                />
                <path
                  className="ft-cable"
                  d="M30 0 V40 C30 80, 50 90, 50 260"
                  fill="none"
                  stroke={`rgb(${EDGE})`}
                  strokeWidth="2"
                  strokeDasharray="8 22"
                  style={{
                    opacity: powered ? 0.9 : 0,
                    transition: "opacity 500ms",
                    animation: "ftCablePulse .9s linear infinite reverse",
                  }}
                />
              </svg>
            </div>

            {/* I/O anahtarı = BAŞA DÖN */}
            <a
              href="/home"
              aria-label="Başa dön"
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
                    color: powered ? `rgb(${DEEP})` : `rgba(${ICE},.5)`,
                    boxShadow: powered ? `0 0 12px rgba(${EDGE},.9)` : "none",
                  }}
                >
                  I
                </span>
                <span
                  className="flex flex-1 items-center justify-center font-mono text-[11px] font-bold transition group-hover:bg-[#46beff]/25"
                  style={{ color: `rgba(${ICE},.6)` }}
                >
                  O
                </span>
              </span>
              <span className="font-mono text-[8px] tracking-[.16em] text-[#5fb8d0] transition group-hover:text-white">
                BAŞA DÖN
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
          ? `linear-gradient(180deg, rgba(${EDGE},.22), rgba(${DEEP},.9))`
          : "#020b17",
        border: `1px solid rgba(${ICE},${powered ? 0.45 : 0.15})`,
        boxShadow: powered
          ? `0 0 16px rgba(${EDGE},.3), inset 0 0 12px rgba(${EDGE},.2)`
          : "none",
      }}
    >
      <div className="flex items-center justify-between text-[9px] tracking-[.2em] text-[#5fb8d0]">
        <span>İSTANBUL · GMT+3</span>
        <Led on={powered} color="#5df2a6" />
      </div>
      <div
        className="mt-0.5 text-[18px] tracking-[.08em] transition-opacity duration-500"
        style={{
          color: `rgb(${ICE})`,
          textShadow: `0 0 10px rgba(${EDGE},.9)`,
          fontVariantNumeric: "tabular-nums",
          opacity: powered ? 1 : 0.08,
        }}
      >
        {now ?? "--:--:--"}
      </div>
      <div className="text-[9px] tracking-[.2em] text-[#5fb8d0]">
        {powered ? "STATUS · AVAILABLE" : "STANDBY"}
      </div>
    </div>
  );
}

/* =========================================================
   SERİ NUMARASI ETİKETİ
========================================================= */
/* sabit desenli barkod (modül seviyesinde bir kez hesaplanır) */
const BARCODE = Array.from(SERIAL + NAME).map(
  (c, i) => 1 + ((c.charCodeAt(0) * (i + 3)) % 3),
);

function SerialLabel() {
  return (
    <div
      className="hidden items-stretch justify-between gap-4 rounded-md px-4 py-2.5 font-mono sm:flex"
      style={{
        background: `linear-gradient(180deg, rgba(${ICE},.13), rgba(${ICE},.06))`,
        border: `1px solid rgba(${ICE},.3)`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.18)",
      }}
    >
      <div className="flex flex-col justify-between gap-1 text-[10px] leading-tight tracking-[.12em] text-[#8fdcea]">
        <Row k="MODEL" v={NAME} strong />
        <Row k="S/N" v={SERIAL} />
        <Row k="I/O" v="IDEAS → PRODUCTS" />
        <Row k="MADE IN" v="İSTANBUL, TÜRKİYE" />
      </div>
      <div className="hidden flex-col items-center justify-end gap-1 sm:flex">
        <div className="flex h-8.5 items-stretch gap-0.5">
          {BARCODE.map((w, i) => (
            <span
              key={i}
              style={{ width: w, background: `rgba(${ICE},.85)` }}
            />
          ))}
        </div>
        <span className="text-[8px] tracking-[.2em] text-[#5fb8d0]">
          {SERIAL}
        </span>
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="w-15.5 shrink-0 text-[#5fb8d0]">{k}</span>
      <span
        className={strong ? "font-bold tracking-[.16em] text-[#c4f7fb]" : ""}
      >
        {v}
      </span>
    </div>
  );
}

/* =========================================================
   0-1 NEHRİ — footer'ın en altından akan veri nehri.
   Dalgalı yüzey, akan ışık çizgileri, kayan bit şeritleri ve
   süzülen büyük 0 / 1'ler. Sistem açılınca akış parlaklaşır.
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

  /* sinüs dalga yüzeyi (bir dalga boyu fazladan: kaydırınca dikiş görünmez) */
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
      {w > 0 && (
        <svg width={w} height={H} className="absolute inset-0">
          <defs>
            <linearGradient id="ftRiverWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0e3b6b" />
              <stop offset=".45" stopColor="#0a2c52" />
              <stop offset="1" stopColor="#04142a" />
            </linearGradient>
            <clipPath id="ftRiverClip">
              <rect x="0" y={SURF - 10} width={w} height={H} />
            </clipPath>
          </defs>

          {/* arka dalga (daha açık, yavaş) */}
          <g style={{ animation: "ftWaveX 9s linear infinite" }}>
            <path d={body(SURF - 6, 5)} fill={`rgba(${EDGE},.10)`} />
          </g>
          {/* su gövdesi */}
          <g style={{ animation: "ftWaveX 6s linear infinite" }}>
            <path d={body(SURF, 6)} fill="url(#ftRiverWater)" />
            {/* yüzeyde parlak ışık çizgisi */}
            <path
              d={surface(SURF, 6)}
              fill="none"
              stroke={`rgba(${ICE},${powered ? 0.8 : 0.45})`}
              strokeWidth="1.4"
              style={{ transition: "stroke 700ms" }}
            />
            {/* parlama: filtre yerine kalın, saydam kopya */}
            <path
              d={surface(SURF, 6)}
              fill="none"
              stroke={`rgba(${EDGE},${powered ? 0.35 : 0.18})`}
              strokeWidth="6"
            />
          </g>

          <g clipPath="url(#ftRiverClip)">
            {/* akan ışık çizgileri */}
            {lanes.map((l, i) => {
              const style: CSSVars = {
                "--len": "-600px",
                animation: `ftLaneFlow ${l.dur}s linear infinite`,
                transition: "stroke-opacity 700ms",
              };
              return (
                <line
                  key={i}
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

            {/* bit şeritleri */}
            {bitLines.map(({ k, y, txt }) => {
              const style: CSSVars = {
                "--w": `${w}px`,
                animation: `ftBitsFlow ${38 + k * 12}s linear infinite`,
              };
              return (
                <g key={k} style={style}>
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
                </g>
              );
            })}

            {/* tek tek süzülen büyük 0 / 1'ler */}
            {digits.map((d, i) => {
              const style: CSSVars = {
                "--w": `${w + 60}px`,
                "--o": d.o,
                animation: `ftDigit ${d.dur}s linear ${d.delay}s infinite`,
              };
              return (
                <text
                  key={i}
                  x={-30}
                  y={d.y}
                  fontFamily={MONO}
                  fontSize={d.size}
                  fontWeight="600"
                  fill="#cfe6ff"
                  style={style}
                >
                  {d.ch}
                </text>
              );
            })}
          </g>
        </svg>
      )}
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

function EmailCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={`mailto:${EMAIL}`}
        className="font-mono text-[clamp(15px,1.5vw,20px)] text-[#c4f7fb] underline decoration-[#46beff]/50 decoration-1 underline-offset-6 transition hover:decoration-[#cfe6ff]"
      >
        {EMAIL}
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] tracking-[.16em] text-white transition hover:-translate-y-0.5"
        style={{
          background: `linear-gradient(135deg, rgba(${EDGE},.28), rgba(${NAVY},.6))`,
          border: `1px solid rgba(${EDGE},.6)`,
          boxShadow: `0 0 14px rgba(${EDGE},.2), inset 0 1px 0 rgba(255,255,255,.25)`,
        }}
      >
        {copied ? <FaCheck /> : <FaRegCopy />}
        {copied ? "KOPYALANDI" : "KOPYALA"}
      </button>
    </div>
  );
}
