"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";

import HeroSection from "@/components/sections/HeroSection";
import RoadmapSection from "@/components/sections/RoadmapSection";
import ProjectsSection from "@/components/sections/ProjectsSection";
import FooterSection from "@/components/sections/FooterSection";
import SiteAvatar from "@/components/ui/SiteAvatar";
import { ThemeStyles } from "@/components/ui/Theme";

/* =========================================================
   ANA SAYFA — Hero → Roadmap → Projects → Footer
   PERFORMANS:
   - Bölüm geçişleri React state'i ile DEĞİL, doğrudan stil yazarak
     yapılır: geçiş sırasında hiçbir bölüm yeniden render edilmez.
   - Ekranda olmayan bölüm `visibility: hidden` olur: tarayıcı onu
     çizmez, içindeki animasyonlar ekranı yormaz.
========================================================= */

const HERO_TO_ROADMAP_MS = 2200;
const ROADMAP_TO_PROJECTS_MS = 2200;
/** telefonda / dar ekranda geçişler daha kısa (ms) */
const MOBILE_TRANSITION_MS = 1300;
const isNarrow = () => typeof window !== "undefined" && window.innerWidth < 768;
const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};

/* SAYFA GEÇİŞİ — yeni sayfa alttan, üst kenarına düşen gölgeyle
   yükselir; eski sayfa ondan YAVAŞ yukarı kayar (derinlik / paralaks)
   ve kararır. */
/** eski sayfanın yukarı kayması (yeni sayfanın yolunun oranı) */
const PARALLAX = 0.3;
/** eski sayfanın en fazla kararması */
const OUT_DIM = 0.55;

/* PERFORMANS: geçişte HER KAREDE yalnızca transform ve opacity
   değişir (ekran kartı yapar, telefonda da akıcı). Kararma ve gölge
   için filter / box-shadow ANİME EDİLMEZ — onların yerine üstte duran
   hazır katmanların (Dim, RiseShadow) yalnızca opaklığı değişir. */
/** yükselen sayfanın üst kenarındaki gölgenin opaklığı */
const riseShadowOpacity = (t: number) =>
  t > 0 && t < 1 ? Math.sin(Math.PI * t) : 0;
/** geride kalan sayfanın kararma katmanının opaklığı */
const dimOpacity = (t: number) => (t > 0 && t < 1 ? OUT_DIM * t : 0);

/** sayfanın üstüne serilen kararma katmanı */
function Dim({ ref }: { ref: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-60 bg-black"
      style={{ opacity: 0 }}
    />
  );
}
/** sayfanın üst kenarının hemen üstüne düşen hazır gölge */
function RiseShadow({ ref }: { ref: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-full h-24"
      style={{
        opacity: 0,
        background: "linear-gradient(0deg, rgba(0,0,0,.6), transparent)",
      }}
    />
  );
}

/* =========================================================
   FOOTER GEÇİŞİ — denemek için yalnızca bunu değiştir:
   "curtain"  : PERDE — proje sayfası bir kapak gibi yukarı kalkar,
                footer altından ortaya çıkar (proje kenarına gölge düşer)
   "recede"   : GERİ ÇEKİLME — footer yükselirken üstte kalan proje
                sayfası kararır, bulanıklaşır, hafifçe küçülür
   "poweroff" : EKRAN KAPANIR — proje ekranı eski monitör gibi tek bir
                yatay çizgiye inip söner, sonra footer yükselir
========================================================= */
type FooterMode = "curtain" | "recede" | "poweroff";
const FOOTER_MODE: FooterMode = "recede";

/** geçiş süreleri (ms) */
const FOOTER_MS: Record<FooterMode, number> = {
  curtain: 1300,
  recede: 1200,
  poweroff: 2000,
};
/** projeler bitince footer KENDİLİĞİNDEN açılır (ms sonra).
    null: yalnızca aşağı kaydırınca açılır */
const FOOTER_AUTO_MS: number | null = 1800;

/* yumuşak başlayıp yumuşak biten geçiş (easeInOutCubic) */
const easeInOut = (v: number) =>
  v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;

/** duration boyunca 0→1 ilerleme üretir, her karede apply çağırır */
function tween(duration: number, apply: (p: number) => void) {
  return tweenTo(0, 1, duration, apply);
}

/** from → to arası (geri dönüşte de) yumuşak geçiş */
function tweenTo(
  from: number,
  to: number,
  duration: number,
  apply: (p: number) => void,
) {
  let raf = 0;
  const start = performance.now();
  const dur = Math.max(1, duration * Math.abs(to - from));
  const tick = (now: number) => {
    const raw = Math.min(1, (now - start) / dur);
    apply(from + (to - from) * easeInOut(raw));
    if (raw < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const show = (el: HTMLElement | null, on: boolean) => {
  if (el) el.style.visibility = on ? "visible" : "hidden";
};

export default function Home() {
  const [powered, setPowered] = useState(false);
  const [heroTransitioning, setHeroTransitioning] = useState(false);
  /* TELEFON: yeni sayfanın animasyonu (kayan avatar, fan…) geçiş BİTİNCE
     başlar — geçişle aynı anda iki ağır animasyon telefonu kasıyordu */
  const narrow = useSyncExternalStore(subscribeResize, isNarrow, () => false);
  const [roadmapArrived, setRoadmapArrived] = useState(false);
  const [projectsArrived, setProjectsArrived] = useState(false);
  const [roadmapComplete, setRoadmapComplete] = useState(false);
  const [projectsComplete, setProjectsComplete] = useState(false);
  const [footerOpen, setFooterOpen] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const roadmapRef = useRef<HTMLElement>(null);
  const projectsRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  /** EKRAN KAPANIR modunda proje ekranının kapanırken bıraktığı ışık çizgisi */
  const crtRef = useRef<HTMLDivElement>(null);
  /** GERİ ÇEKİLME modunda proje panelini karartıp bulanıklaştıran katman */
  const recedeRef = useRef<HTMLDivElement>(null);
  /* geçiş katmanları (yalnızca opaklıkları değişir) */
  const heroDimRef = useRef<HTMLDivElement>(null);
  const roadDimRef = useRef<HTMLDivElement>(null);
  const roadShadowRef = useRef<HTMLDivElement>(null);
  const projShadowRef = useRef<HTMLDivElement>(null);
  /** geçiş ilerlemeleri (render tetiklemez) */
  const prog = useRef({ hero: 0, projects: 0, footer: 0 });
  /** footer bir kez açıldı mı (sonra kapatılırsa ipucu görünür) */
  const [footerSeen, setFooterSeen] = useState(false);
  /** footer geçişi BİTTİ mi: avatar ancak footer yerine oturunca düşer */
  const [footerArrived, setFooterArrived] = useState(false);
  if (!footerOpen && footerArrived) setFooterArrived(false);

  /* tüm bölümlerin stilini mevcut ilerlemeye göre yazar */
  const paint = useCallback(() => {
    const { hero: h, projects: p, footer: f } = prog.current;
    const hero = heroRef.current;
    const road = roadmapRef.current;
    const proj = projectsRef.current;
    const foot = footerRef.current;
    const crt = crtRef.current;
    const dim = recedeRef.current;
    if (hero) {
      /* geride kalır: yavaşça yukarı kayar ve kararır */
      hero.style.transform = `translate3d(0, ${-PARALLAX * h * 100}%, 0)`;
      if (heroDimRef.current)
        heroDimRef.current.style.opacity = String(dimOpacity(h));
      hero.style.pointerEvents = h < 0.5 ? "auto" : "none";
      show(hero, h < 1);
    }
    if (road) {
      /* alttan gölgeyle yükselir; sonra projelere yer açarken geride kalır */
      road.style.transform = `translate3d(0, ${(1 - h) * 100 - PARALLAX * p * 100}%, 0)`;
      if (roadShadowRef.current)
        roadShadowRef.current.style.opacity = String(riseShadowOpacity(h));
      if (roadDimRef.current)
        roadDimRef.current.style.opacity = String(dimOpacity(p));
      road.style.pointerEvents = h > 0.5 && p < 0.5 ? "auto" : "none";
      show(road, h > 0 && p < 1);
    }
    if (proj) {
      let transform = `translate3d(0, ${(1 - p) * 100}%, 0)`;
      let filter = "none";
      let shadow = "none";
      if (projShadowRef.current)
        projShadowRef.current.style.opacity = String(riseShadowOpacity(p));
      let visible = p > 0;

      if (FOOTER_MODE === "curtain") {
        /* proje sayfası footer'ın boyu kadar yukarı kalkar */
        const fh = foot?.offsetHeight ?? 0;
        transform = `translate3d(0, calc(${(1 - p) * 100}% - ${f * fh}px), 0)`;
        if (f > 0)
          shadow = `0 ${18 + 22 * f}px ${50 + 30 * f}px rgba(0,0,0,${0.75 * f})`;
      } else if (FOOTER_MODE === "recede") {
        /* derinliğe çekilir: yalnızca ORTADAKİ lacivert panel kararıp
           bulanıklaşır (recedeRef). Sayfa küçülmez: kenarlardaki zemin
           sitenin normal arka planı olarak kalır */
      } else {
        /* eski monitör kapanışı: önce dikeyde ince bir çizgiye iner
           (parlayarak), sonra çizgi yatayda noktaya küçülüp söner */
        const c = clamp01(f / 0.5);
        const sy = c < 0.6 ? 1 - 0.994 * easeInOut(c / 0.6) : 0.006;
        const sx = c < 0.6 ? 1 : 1 - easeInOut((c - 0.6) / 0.4);
        transform += ` scale(${Math.max(sx, 0.0001)}, ${sy})`;
        if (f > 0) filter = `brightness(${1 + 2.5 * c})`;
        visible = visible && c < 1;
      }

      proj.style.transform = transform;
      proj.style.filter = filter;
      proj.style.boxShadow = shadow;
      proj.style.pointerEvents = p > 0.5 && f < 0.5 ? "auto" : "none";
      show(proj, visible);
    }

    if (dim) dim.style.opacity = FOOTER_MODE === "recede" ? String(f) : "0";

    if (crt) {
      /* kapanırken ortada kalan parlak çizgi / nokta */
      const c = clamp01(f / 0.5);
      const on = FOOTER_MODE === "poweroff" && c > 0.45 && c < 1.15 && f < 0.7;
      crt.style.opacity = on
        ? String(Math.sin(Math.PI * clamp01((c - 0.45) / 0.7)))
        : "0";
      crt.style.transform = `translate(-50%, -50%) scaleX(${c < 0.6 ? 1 : Math.max(0.02, 1 - (c - 0.6) / 0.4)})`;
    }

    if (foot) {
      let ty = (1 - f) * 105; // yüzde
      if (FOOTER_MODE === "curtain") ty = (1 - f) * 18; // altta bekler, hafifçe yükselir
      if (FOOTER_MODE === "poweroff") ty = (1 - clamp01((f - 0.5) / 0.5)) * 105;
      foot.style.transform = `translate3d(0, ${ty}%, 0)`;
      foot.style.opacity =
        FOOTER_MODE === "curtain" ? String(0.4 + 0.6 * f) : "1";
      foot.style.pointerEvents = f > 0.5 ? "auto" : "none";
      show(foot, FOOTER_MODE === "poweroff" ? f > 0.5 : f > 0);
    }
  }, []);

  /* ilk kare: roadmap ve projects ekran dışında ve gizli */
  useEffect(paint, [paint]);

  /* HERO → ROADMAP */
  useEffect(() => {
    if (!heroTransitioning) return;
    return tween(
      isNarrow() ? MOBILE_TRANSITION_MS : HERO_TO_ROADMAP_MS,
      (v) => {
        prog.current.hero = v;
        paint();
        if (v >= 1) setRoadmapArrived(true);
      },
    );
  }, [heroTransitioning, paint]);

  /* ROADMAP → PROJECTS */
  useEffect(() => {
    if (!roadmapComplete) return;
    return tween(
      isNarrow() ? MOBILE_TRANSITION_MS : ROADMAP_TO_PROJECTS_MS,
      (v) => {
        prog.current.projects = v;
        paint();
        if (v >= 1) setProjectsArrived(true);
      },
    );
  }, [roadmapComplete, paint]);

  /* PROJECTS → FOOTER geçişi (açılırken ve kapanırken) */
  useEffect(() => {
    const target = footerOpen ? 1 : 0;
    return tweenTo(prog.current.footer, target, FOOTER_MS[FOOTER_MODE], (v) => {
      prog.current.footer = v;
      paint();
      if (target === 1 && v >= 1) setFooterArrived(true);
    });
  }, [footerOpen, paint]);

  /* projeler bitince footer kendiliğinden açılır */
  useEffect(() => {
    if (!projectsComplete || FOOTER_AUTO_MS === null) return;
    const t = window.setTimeout(() => setFooterOpen(true), FOOTER_AUTO_MS);
    return () => window.clearTimeout(t);
  }, [projectsComplete]);

  if (footerOpen && !footerSeen) setFooterSeen(true);

  /* =========================================================
     PROJECTS → FOOTER
     Projeler bitince footer kendiliğinden açılır (FOOTER_AUTO_MS).
     Aşağı kaydırınca açılır, yukarı kaydırınca kapanır. Footer'ın kendi
     içinde kayan alanı (mobil) varsa önce o kayar.
  ========================================================= */
  useEffect(() => {
    if (!projectsComplete) return;

    const scroller = (t: EventTarget | null) =>
      (t as HTMLElement | null)?.closest?.(
        "[data-footer-scroll]",
      ) as HTMLElement | null;
    const canScroll = (el: HTMLElement | null, down: boolean) =>
      !!el &&
      el.scrollHeight > el.clientHeight + 1 &&
      (down
        ? el.scrollTop + el.clientHeight < el.scrollHeight - 1
        : el.scrollTop > 0);

    const onWheel = (e: WheelEvent) => {
      if (canScroll(scroller(e.target), e.deltaY > 0)) return;
      if (e.deltaY > 8) setFooterOpen(true);
      else if (e.deltaY < -8) setFooterOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", "End", " "].includes(e.key))
        setFooterOpen(true);
      if (["ArrowUp", "PageUp", "Home"].includes(e.key)) setFooterOpen(false);
    };

    let touchY = 0;
    let startTop = 0;
    let startEl: HTMLElement | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
      startEl = scroller(e.target);
      startTop = startEl?.scrollTop ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
      /* footer içeriği kaydırılıyorsa sayfa geçişi yapma */
      if (startEl && startEl.scrollHeight > startEl.clientHeight + 1) {
        if (dy > 0 || startTop > 0) return;
      }
      if (dy > 30) setFooterOpen(true);
      else if (dy < -30) setFooterOpen(false);
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [projectsComplete]);

  /* Bölümler bir kez oluşturulur; yalnızca kendi prop'ları değişince
     yeniden render edilirler (sayfa state'i değişince değil) */
  const onRoadmapDone = useCallback(() => setRoadmapComplete(true), []);
  const onProjectsDone = useCallback(() => setProjectsComplete(true), []);

  const roadmapActive = heroTransitioning && (!narrow || roadmapArrived);
  const projectsActive = roadmapComplete && (!narrow || projectsArrived);

  /* avatar gizlenince fiş sokette takılı kalsın (sayfa geçişinde de) */
  const hero = useMemo(
    () => <HeroSection powered={powered} plugged={heroTransitioning} />,
    [powered, heroTransitioning],
  );
  const roadmap = useMemo(
    () => <RoadmapSection active={roadmapActive} onComplete={onRoadmapDone} />,
    [roadmapActive, onRoadmapDone],
  );
  const projects = useMemo(
    () => (
      <ProjectsSection
        active={projectsActive}
        onComplete={onProjectsDone}
        riderHidden={footerOpen}
      />
    ),
    [projectsActive, onProjectsDone, footerOpen],
  );
  const footer = useMemo(
    () => (
      <FooterSection
        open={footerArrived}
        /* içerik, footer yükselmeye BAŞLARKEN sırayla yerine oturur */
        reveal={footerOpen}
        topFade={FOOTER_MODE === "curtain" ? 0 : undefined}
      />
    ),
    [footerArrived, footerOpen],
  );

  /* ipucu: footer kapatılınca (ya da otomatik açılma kapalıysa) */
  const hintOn =
    projectsComplete && !footerOpen && (footerSeen || FOOTER_AUTO_MS === null);

  return (
    <main className="fixed inset-0 overflow-hidden">
      {/* GERİ ÇEKİLME katmanı: bulanıklık (backdrop-filter) pahalıdır —
          yalnızca geniş ekranda; telefonda biraz daha koyu kararma */}
      <style>{`
        .pf-recede { background: linear-gradient(180deg, rgba(2,6,20,.55), rgba(2,6,20,.75)); }
        @media (min-width: 1024px) and (hover: hover) {
          .pf-recede {
            background: linear-gradient(180deg, rgba(2,6,20,.35), rgba(2,6,20,.6));
            backdrop-filter: blur(5px) saturate(.75);
            -webkit-backdrop-filter: blur(5px) saturate(.75);
          }
        }
      `}</style>
      {/* RENK PALETİ (theme.tsx → PALETTE) */}
      <ThemeStyles />

      {/* HERO */}
      <section
        ref={heroRef}
        className="absolute inset-0 z-0 will-change-transform"
      >
        {hero}
        <Dim ref={heroDimRef} />
      </section>

      {/* ROADMAP */}
      <section
        ref={roadmapRef}
        className="absolute inset-0 z-10 will-change-transform"
        style={{ transform: "translate3d(0, 100%, 0)", visibility: "hidden" }}
      >
        <RiseShadow ref={roadShadowRef} />
        {roadmap}
        <Dim ref={roadDimRef} />
      </section>

      {/* PROJECTS — roadmap'in hemen altında */}
      <section
        ref={projectsRef}
        className="absolute inset-0 z-20 will-change-transform"
        style={{ transform: "translate3d(0, 100%, 0)", visibility: "hidden" }}
      >
        <RiseShadow ref={projShadowRef} />
        {projects}

        {/* GERİ ÇEKİLME: yalnızca cam panelin içi kararır / bulanıklaşır
            (ScifiBackground'daki panel yeriyle aynı: sol/sağ %1, üst/alt %1.5) */}
        {FOOTER_MODE === "recede" && (
          <div
            ref={recedeRef}
            aria-hidden
            className="pf-recede pointer-events-none absolute z-50"
            style={{
              left: "1%",
              right: "1%",
              top: "1.5%",
              bottom: "1.5%",
              borderRadius: "var(--glass-radius, 14px)",
              opacity: 0,
            }}
          />
        )}
      </section>

      {/* EKRAN KAPANIR: proje ekranının söndüğü yerde kalan ışık çizgisi */}
      {FOOTER_MODE === "poweroff" && (
        <div
          ref={crtRef}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-25 h-0.75 w-[80vw] rounded-full"
          style={{
            opacity: 0,
            background:
              "linear-gradient(90deg, transparent, rgb(var(--c-a8eef6,168,238,246)) 20%, #fff 50%, rgb(var(--c-a8eef6,168,238,246)) 80%, transparent)",
            boxShadow:
              "0 0 18px rgba(var(--c-a8eef6,168,238,246),.9), 0 0 60px rgba(var(--c-a8eef6,168,238,246),.5)",
          }}
        />
      )}

      {/* FOOTER — geçişi FOOTER_MODE belirler (paint) */}
      <section
        ref={footerRef}
        className={`absolute inset-x-0 bottom-0 will-change-transform ${
          FOOTER_MODE === "curtain" ? "z-15" : "z-30"
        }`}
        style={{ transform: "translate3d(0, 105%, 0)", visibility: "hidden" }}
      >
        {footer}
      </section>

      {/* Projeler bitince: footer'a inmek için küçük ipucu */}
      <button
        type="button"
        onClick={() => setFooterOpen(true)}
        aria-label="Aşağı kaydır"
        className="absolute left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1 font-mono text-[10px] tracking-[.24em] text-[#a8eef6]"
        style={{
          bottom: 22,
          opacity: hintOn ? 0.85 : 0,
          pointerEvents: hintOn ? "auto" : "none",
          transition: "opacity .6s ease",
          textShadow: "0 0 8px rgba(79,216,255,.8)",
        }}
      >
        AŞAĞI KAYDIR
        <span className="scroll-hint block h-3 w-3 rotate-45 border-b border-r border-[#a8eef6]" />
        <style>{`
          .scroll-hint { animation: scrollHint 1.6s ease-in-out infinite; }
          @keyframes scrollHint {
            0%, 100% { transform: translateY(0) rotate(45deg); opacity: .5; }
            50% { transform: translateY(5px) rotate(45deg); opacity: 1; }
          }
        `}</style>
      </button>

      {/* HERO AVATAR */}
      <SiteAvatar
        onPlugged={() => setPowered(true)}
        onSequenceComplete={() => setHeroTransitioning(true)}
        hidden={heroTransitioning}
      />
    </main>
  );
}
