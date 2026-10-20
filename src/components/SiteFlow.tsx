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
import { type MenuKey } from "@/components/layout/MobileMenu";
import SiteMenu from "@/components/layout/SiteMenu";
import FinalState from "@/components/ui/FinalState";
import { ThemeStyles } from "@/components/ui/Theme";

/* =========================================================
   SİTE AKIŞI — Hero → Roadmap → Projects → Footer
   İki kullanım:
   - "story" (ana adres "/"): hikâye kendiliğinden oynar — avatar fişi
     takar, roadmap'e atlar, yetenekleri toplar, projelere geçer, footer
     açılır. Hikâye bitince kaydırarak bölümler arasında gezilebilir.
   - "hero" | "roadmap" | "projects" (menüden gidilen adresler): o bölüm
     BİTMİŞ haliyle açılır; aşağı / yukarı kaydırarak (tekerlek, parmak,
     klavye) diğer bölümlere aynı geçişlerle gidilir.

   PERFORMANS: geçişlerde React yeniden çizmez; yalnızca bölümlerin
   transform / opacity değerleri doğrudan yazılır. Bölümlerin katmanı
   sabittir (açılıp kapanmaz) → geçişlerde "fotoğraf çeker gibi"
   kırpışma olmaz. Gelecek bölüm, harekete başlamadan iki kare önce
   görünür yapılır → ilk karede boş ekran olmaz.
========================================================= */

export type FlowStart = "story" | "hero" | "roadmap" | "projects" | "footer";

/* ---------------- TEMPO (yavaş = hikâye daha belirgin) ---------------- */
const TRANSITION_MS = 2200;
/** telefonda / dar ekranda geçişler biraz daha kısa (ms) */
const MOBILE_TRANSITION_MS = 1500;
/** footer'ın yükselme süresi (ms) */
const FOOTER_MS = 1400;
/** telefonda yeni bölümün animasyonu geçişin bu oranında başlar */
const MOBILE_ARRIVE_AT = 0.75;
/** hikâyede projeler bitince footer bu kadar sonra kendiliğinden açılır */
const FOOTER_AUTO_MS = 3500;
/** bir geçiş bittikten sonra tekerlek bu süre yok sayılır (dokunmatik
 *  yüzeylerin kayma ataleti art arda iki sayfa geçirmesin) */
const WHEEL_COOLDOWN_MS = 700;

const isNarrow = () =>
  typeof window !== "undefined" && window.innerWidth < 768;
const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};

/* ---------------- KART GEÇİŞİ ----------------
   Eski bölüm bir kart gibi derinliğe çekilir (küçülür, hafif yukarı
   kayar, kararır); yeni bölüm alttan yükselir ve yerine otururken tam
   boya açılır. */
const OUT_SCALE = 0.9;
const IN_SCALE = 0.94;
const OUT_DIM = 0.55;
const REST = "translate3d(0, 0, 0)";
const outTransform = (t: number) =>
  `translate3d(0, ${(-5 * t).toFixed(3)}%, 0) scale(${(1 - (1 - OUT_SCALE) * t).toFixed(4)})`;
const inTransform = (t: number) =>
  `translate3d(0, ${((1 - t) * 100).toFixed(3)}%, 0) scale(${(IN_SCALE + (1 - IN_SCALE) * t).toFixed(4)})`;
const riseShadowOpacity = (t: number) =>
  t > 0 && t < 1 ? Math.sin(Math.PI * t) : 0;
const dimOpacity = (t: number) => (t > 0 && t < 1 ? OUT_DIM * t : 0);

/* yumuşak başlayıp yumuşak biten geçiş (easeInOutQuart) */
const easeInOut = (v: number) =>
  v < 0.5 ? 8 * v * v * v * v : 1 - Math.pow(-2 * v + 2, 4) / 2;

/** from → to arası yumuşak geçiş; her karede apply */
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
    apply(raw >= 1 ? to : from + (to - from) * easeInOut(raw));
    if (raw < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

const show = (el: HTMLElement | null, on: boolean) => {
  if (!el) return;
  const v = on ? "visible" : "hidden";
  if (el.style.visibility !== v) el.style.visibility = v;
};

/** bölümlerin sırası ve her adımın ilerleme anahtarı */
type Key = "hero" | "projects" | "footer";
const STEP_KEY: Key[] = ["hero", "projects", "footer"]; // 0→1, 1→2, 2→3
const START_INDEX: Record<FlowStart, number> = {
  story: 0,
  hero: 0,
  roadmap: 1,
  projects: 2,
  footer: 3,
};

/** menüde hangi buton yanık: footer'da hiçbiri */
const MENU_OF: (MenuKey | null)[] = ["home", "skills", "projects", null];

/* ---------------- BÖLÜM BAŞLIKLARI (hikâye) ---------------- */
const CHAPTERS: { no: string; title: string; sub: string }[] = [
  { no: "01", title: "SİSTEM AÇILIYOR", sub: "Merhaba, ben Zeynep." },
  { no: "02", title: "YETENEKLER", sub: "Yol boyunca öğrendiklerimi topluyorum" },
  { no: "03", title: "PROJELER", sub: "Topladıklarımla ürettiklerim" },
  { no: "04", title: "İLETİŞİM", sub: "Sıradaki commit birlikte olsun" },
];

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

export default function SiteFlow({ start = "story" }: { start?: FlowStart }) {
  const story = start === "story";
  const startIndex = START_INDEX[start];

  const [powered, setPowered] = useState(!story);
  const narrow = useSyncExternalStore(subscribeResize, isNarrow, () => false);

  /* hikâye durumu */
  const [heroTransitioning, setHeroTransitioning] = useState(!story);
  const [heroAvatarGone, setHeroAvatarGone] = useState(!story);
  const [roadmapArrived, setRoadmapArrived] = useState(false);
  const [projectsArrived, setProjectsArrived] = useState(false);
  const [roadmapComplete, setRoadmapComplete] = useState(false);
  const [projectsComplete, setProjectsComplete] = useState(false);

  /* footer: açılıyor mu (içerik animasyonu) / yerine oturdu mu (avatar) */
  const [footerOpen, setFooterOpen] = useState(startIndex === 3);
  const [footerArrived, setFooterArrived] = useState(startIndex === 3);

  /** ekrandaki bölüm (0 hero, 1 roadmap, 2 projects, 3 footer) */
  const [index, setIndex] = useState(startIndex);
  /** bölüm başlığının yeniden oynaması için sayaç */
  const [chapterKey, setChapterKey] = useState(0);
  /** ipucu hangi bölüm gelişinde görünür (-1: gizli) */
  const [hintFor, setHintFor] = useState(-1);
  useEffect(() => {
    const on = window.setTimeout(() => setHintFor(chapterKey), 1200);
    const off = window.setTimeout(() => setHintFor(-1), 6500);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [chapterKey]);

  const heroRef = useRef<HTMLElement>(null);
  const roadmapRef = useRef<HTMLElement>(null);
  const projectsRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const recedeRef = useRef<HTMLDivElement>(null);
  const heroDimRef = useRef<HTMLDivElement>(null);
  const roadDimRef = useRef<HTMLDivElement>(null);
  const roadShadowRef = useRef<HTMLDivElement>(null);
  const projShadowRef = useRef<HTMLDivElement>(null);

  /** geçiş ilerlemeleri (render tetiklemez) */
  const prog = useRef({
    hero: startIndex >= 1 ? 1 : 0,
    projects: startIndex >= 2 ? 1 : 0,
    footer: startIndex >= 3 ? 1 : 0,
  });
  const indexRef = useRef(startIndex);
  const busy = useRef(false);
  const lastNavEnd = useRef(0);
  const cancelRef = useRef<(() => void) | null>(null);

  /* tüm bölümlerin stilini mevcut ilerlemeye göre yazar */
  const paint = useCallback(() => {
    const { hero: h, projects: p, footer: f } = prog.current;
    const hero = heroRef.current;
    const road = roadmapRef.current;
    const proj = projectsRef.current;
    const foot = footerRef.current;
    if (hero) {
      hero.style.transform = h > 0 ? outTransform(h) : REST;
      if (heroDimRef.current)
        heroDimRef.current.style.opacity = String(dimOpacity(h));
      hero.style.pointerEvents = h < 0.5 ? "auto" : "none";
      show(hero, h < 1);
    }
    if (road) {
      road.style.transform =
        p > 0 ? outTransform(p) : h < 1 ? inTransform(h) : REST;
      if (roadShadowRef.current)
        roadShadowRef.current.style.opacity = String(riseShadowOpacity(h));
      if (roadDimRef.current)
        roadDimRef.current.style.opacity = String(dimOpacity(p));
      road.style.pointerEvents = h > 0.5 && p < 0.5 ? "auto" : "none";
      show(road, h > 0 && p < 1);
    }
    if (proj) {
      proj.style.transform = p < 1 ? inTransform(p) : REST;
      if (projShadowRef.current)
        projShadowRef.current.style.opacity = String(riseShadowOpacity(p));
      proj.style.pointerEvents = p > 0.5 && f < 0.5 ? "auto" : "none";
      show(proj, p > 0);
    }
    /* footer gelirken proje panelinin içi kararır (geri çekilme) */
    if (recedeRef.current) recedeRef.current.style.opacity = String(f);
    if (foot) {
      foot.style.transform = `translate3d(0, ${((1 - f) * 105).toFixed(3)}%, 0)`;
      foot.style.pointerEvents = f > 0.5 ? "auto" : "none";
      show(foot, f > 0);
    }
  }, []);

  /* ilk kare */
  useEffect(paint, [paint]);
  useEffect(() => () => cancelRef.current?.(), []);

  /** bir adımlık geçiş: step 0 (hero↔roadmap), 1 (roadmap↔projects),
   *  2 (projects↔footer); dir +1 ileri, -1 geri */
  const runStep = useCallback(
    (step: number, dir: 1 | -1) => {
      const key = STEP_KEY[step];
      if (!key || busy.current) return false;
      const to = dir > 0 ? 1 : 0;
      if (prog.current[key] === to) return false;
      busy.current = true;
      const target = step + (dir > 0 ? 1 : 0);

      if (key === "footer") {
        setFooterOpen(dir > 0);
        if (dir < 0) setFooterArrived(false);
      }

      /* ÖN ISINMA: gelen bölüm hareketten önce görünür olsun (ilk
         karede boş / siyah ekran olmasın) */
      if (dir > 0) {
        const el =
          key === "hero"
            ? roadmapRef.current
            : key === "projects"
              ? projectsRef.current
              : footerRef.current;
        show(el, true);
      } else {
        const el =
          key === "hero"
            ? heroRef.current
            : key === "projects"
              ? roadmapRef.current
              : projectsRef.current;
        show(el, true);
      }

      const dur =
        key === "footer"
          ? FOOTER_MS
          : isNarrow()
            ? MOBILE_TRANSITION_MS
            : TRANSITION_MS;

      let r1 = 0;
      let r2 = 0;
      let stop: (() => void) | null = null;
      r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => {
          stop = tweenTo(prog.current[key], to, dur, (v) => {
            prog.current[key] = v;
            paint();
            if (dir > 0 && v >= MOBILE_ARRIVE_AT) {
              if (key === "hero") setRoadmapArrived(true);
              if (key === "projects") setProjectsArrived(true);
            }
            if (v === to) {
              busy.current = false;
              lastNavEnd.current = performance.now();
              indexRef.current = dir > 0 ? target : step;
              setIndex(indexRef.current);
              setChapterKey((k) => k + 1);
              if (key === "footer" && dir > 0) setFooterArrived(true);
            }
          });
        });
      });
      cancelRef.current = () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
        stop?.();
      };
      return true;
    },
    [paint],
  );

  /** menüden bölüme git: komşuysa normal geçiş, değilse anında */
  const jumpTo = useCallback(
    (target: number) => {
      const cur = indexRef.current;
      if (target === cur || busy.current) return;
      if (target === cur + 1) return void runStep(cur, 1);
      if (target === cur - 1) return void runStep(target, -1);
      prog.current = {
        hero: target >= 1 ? 1 : 0,
        projects: target >= 2 ? 1 : 0,
        footer: target >= 3 ? 1 : 0,
      };
      setFooterOpen(target === 3);
      setFooterArrived(target === 3);
      paint();
      indexRef.current = target;
      setIndex(target);
      setChapterKey((k) => k + 1);
    },
    [paint, runStep],
  );
  const onMenu = useCallback(
    (key: MenuKey) => {
      /* hikâye sürerken menü normal adreslere gider */
      if (story && !projectsComplete) return false;
      const target = { home: 0, skills: 1, projects: 2 }[
        key as "home" | "skills" | "projects"
      ];
      if (target === undefined) return false; // documents: ayrı sayfa
      jumpTo(target);
      return true;
    },
    [story, projectsComplete, jumpTo],
  );

  /* ---------------- HİKÂYE (yalnızca "/") ---------------- */
  /* avatar dalmaya başlayınca → roadmap */
  const onHeroExit = useCallback(() => {
    setHeroTransitioning(true);
    runStep(0, 1);
  }, [runStep]);
  /* roadmap bitince → projeler */
  const onRoadmapDone = useCallback(() => {
    setRoadmapComplete(true);
    runStep(1, 1);
  }, [runStep]);
  const onProjectsDone = useCallback(() => setProjectsComplete(true), []);
  /* projeler bitince footer kendiliğinden açılır */
  useEffect(() => {
    if (!story || !projectsComplete) return;
    const t = window.setTimeout(() => {
      if (indexRef.current === 2) runStep(2, 1);
    }, FOOTER_AUTO_MS);
    return () => window.clearTimeout(t);
  }, [story, projectsComplete, runStep]);

  /* ---------------- SERBEST GEZİNME ----------------
     Menüden gelince hemen; hikâyede projeler bitince açılır. */
  const navEnabled = !story || projectsComplete;
  useEffect(() => {
    if (!navEnabled) return;

    const next = () => runStep(indexRef.current, 1);
    const prev = () => {
      if (indexRef.current > 0) runStep(indexRef.current - 1, -1);
    };

    /* içinde kendi kaydırması olan alanlar (footer içeriği telefonda) */
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
    /* tekerleği kendisi kullanan alanlar (yetenekler paneli) */
    const ownsWheel = (t: EventTarget | null, down: boolean) => {
      const el = (t as HTMLElement | null)?.closest?.(
        "[data-own-wheel]",
      ) as HTMLElement | null;
      if (!el) return false;
      return down ? el.dataset.endDown !== "1" : el.dataset.endUp !== "1";
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 12) return;
      if (busy.current) return;
      if (performance.now() - lastNavEnd.current < WHEEL_COOLDOWN_MS) return;
      if (ownsWheel(e.target, e.deltaY > 0)) return;
      if (canScroll(scroller(e.target), e.deltaY > 0)) return;
      if (e.deltaY > 0) next();
      else prev();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (["ArrowDown", "PageDown", " "].includes(e.key)) next();
      if (["ArrowUp", "PageUp"].includes(e.key)) prev();
    };

    let touchY = 0;
    let touchX = 0;
    let startTop = 0;
    let startEl: HTMLElement | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
      touchX = e.touches[0]?.clientX ?? 0;
      startEl = scroller(e.target);
      startTop = startEl?.scrollTop ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
      const dx = touchX - (e.changedTouches[0]?.clientX ?? touchX);
      if (Math.abs(dy) < 45 || Math.abs(dx) > Math.abs(dy)) return;
      /* footer içeriği kaydırılıyorsa sayfa geçişi yapma */
      if (startEl && startEl.scrollHeight > startEl.clientHeight + 1) {
        if (dy > 0 && canScroll(startEl, true)) return;
        if (dy < 0 && startTop > 0) return;
      }
      if (dy > 0) next();
      else prev();
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
  }, [navEnabled, runStep]);

  /* ---------------- BÖLÜMLER ---------------- */
  const roadmapActive = story && heroTransitioning && (!narrow || roadmapArrived);
  const projectsActive =
    story && roadmapComplete && (!narrow || projectsArrived);

  const hero = useMemo(
    () => (
      <HeroSection
        powered={powered}
        plugged={heroTransitioning}
        finished={!story}
      />
    ),
    [powered, heroTransitioning, story],
  );
  const roadmap = useMemo(
    () =>
      story ? (
        <RoadmapSection active={roadmapActive} onComplete={onRoadmapDone} />
      ) : (
        <FinalState>
          <RoadmapSection finished />
        </FinalState>
      ),
    [story, roadmapActive, onRoadmapDone],
  );
  const projects = useMemo(
    () =>
      story ? (
        <ProjectsSection
          active={projectsActive}
          onComplete={onProjectsDone}
          /* oturan avatar footer TAMAMEN gelince kaybolur */
          riderHidden={footerArrived}
        />
      ) : (
        <FinalState>
          <ProjectsSection finished riderHidden={footerArrived} />
        </FinalState>
      ),
    [story, projectsActive, onProjectsDone, footerArrived],
  );
  const footer = useMemo(
    () => <FooterSection open={footerArrived} reveal={footerOpen} />,
    [footerArrived, footerOpen],
  );

  /* bölüm başlığı: hikâyede her bölüme gelince; serbest gezinmede de */
  const chapter = CHAPTERS[index];
  const showChapter = index > 0;
  /* aşağı kaydır ipucu: bölüme gelince birkaç saniye görünür, sonra
     söner (alttaki butonların üstünde kalıcı durmasın) */
  const hintOn = navEnabled && index < 3 && hintFor === chapterKey;

  return (
    <main
      className="fixed inset-0 overflow-hidden"
      /* geçişte kartların arkasında kalan sahne: sitenin zemin renginin
         derin tonu */
      style={{
        background:
          "radial-gradient(ellipse 80% 70% at 50% 35%, rgb(var(--bg-2,52,66,104)), rgb(var(--bg-4,26,35,62)))",
      }}
    >
      <style>{`
        .flow-sec { will-change: transform; transform-origin: 50% 30%; backface-visibility: hidden; }
        .pf-recede { background: linear-gradient(180deg, rgba(2,6,20,.55), rgba(2,6,20,.75)); }
        @media (min-width: 1024px) and (hover: hover) {
          .pf-recede {
            background: linear-gradient(180deg, rgba(2,6,20,.35), rgba(2,6,20,.6));
            backdrop-filter: blur(5px) saturate(.75);
            -webkit-backdrop-filter: blur(5px) saturate(.75);
          }
        }
        /* TELEFON / TABLET: canlı bulanıklık (backdrop-filter) yok —
           hareketli sahnelerde her kare yeniden hesaplanıp donmaya ve
           kırpışmaya yol açıyordu */
        @media (max-width: 1023px), (hover: none) {
          main, main * {
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
          }
        }
        @keyframes chapterIn {
          0%   { opacity: 0; transform: translate(-50%, 10px); letter-spacing: .5em; }
          18%  { opacity: 1; transform: translate(-50%, 0); letter-spacing: .32em; }
          78%  { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -6px); }
        }
        .chapter { animation: chapterIn 3200ms cubic-bezier(.22,1,.36,1) both; }
        .scroll-hint { animation: scrollHint 1.6s ease-in-out infinite; }
        @keyframes scrollHint {
          0%, 100% { transform: translateY(0) rotate(45deg); opacity: .5; }
          50% { transform: translateY(5px) rotate(45deg); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .chapter, .scroll-hint { animation: none; }
        }
      `}</style>
      <ThemeStyles />

      {/* HERO */}
      <section
        ref={heroRef}
        className="flow-sec absolute inset-0 z-0"
        style={{
          transform: startIndex > 0 ? outTransform(1) : REST,
          visibility: startIndex > 0 ? "hidden" : "visible",
        }}
      >
        {hero}
        <Dim ref={heroDimRef} />
      </section>

      {/* ROADMAP */}
      <section
        ref={roadmapRef}
        className="flow-sec absolute inset-0 z-10"
        style={{
          transform:
            startIndex === 1 ? REST : startIndex > 1 ? outTransform(1) : inTransform(0),
          visibility: startIndex === 1 ? "visible" : "hidden",
        }}
      >
        <RiseShadow ref={roadShadowRef} />
        {roadmap}
        <Dim ref={roadDimRef} />
      </section>

      {/* PROJECTS */}
      <section
        ref={projectsRef}
        className="flow-sec absolute inset-0 z-20"
        style={{
          transform: startIndex >= 2 ? REST : inTransform(0),
          visibility: startIndex >= 2 ? "visible" : "hidden",
        }}
      >
        <RiseShadow ref={projShadowRef} />
        {projects}
        {/* GERİ ÇEKİLME: footer gelirken yalnızca cam panelin içi kararır */}
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
            opacity: startIndex === 3 ? 1 : 0,
          }}
        />
      </section>

      {/* FOOTER */}
      <section
        ref={footerRef}
        className="flow-sec absolute inset-x-0 bottom-0 z-30"
        style={{
          transform: `translate3d(0, ${startIndex === 3 ? 0 : 105}%, 0)`,
          visibility: startIndex === 3 ? "visible" : "hidden",
        }}
      >
        {footer}
      </section>

      {/* BÖLÜM BAŞLIĞI — her bölüme gelince kısa süre (hikâye) */}
      {showChapter && chapter && (
        <div
          key={`ch${chapterKey}-${index}`}
          aria-hidden
          className="chapter pointer-events-none fixed left-1/2 z-80 flex flex-col items-center gap-1 rounded-2xl px-5 py-2.5 text-center font-mono"
          style={{
            /* sayfaların başlıklarıyla çakışmasın: altta; footer'da üstte */
            ...(index === 3
              ? { top: "clamp(52px, 10vh, 110px)" }
              : { bottom: "clamp(64px, 11vh, 120px)" }),
            background: "rgba(3,11,26,.62)",
            border: "1px solid rgba(var(--c-a8eef6,168,238,246),.22)",
            boxShadow: "0 10px 30px rgba(0,0,0,.35)",
          }}
        >
          <span className="text-[clamp(11px,1.1vw,14px)] font-bold text-[rgb(var(--c-a8eef6,168,238,246))]">
            {chapter.no} · {chapter.title}
          </span>
          <span className="text-[clamp(10px,0.9vw,12px)] tracking-[.06em] text-[rgba(var(--c-c4f7fb,196,247,251),.8)]">
            {chapter.sub}
          </span>
        </div>
      )}

      {/* MENÜ — hero'nun kendi menüsü var; diğer bölümlerde sağ üstte
          (bilgisayarda butonlar, telefonda çekmeceli menü) */}
      {index > 0 && (
        <SiteMenu
          current={MENU_OF[index]}
          onNavigate={onMenu}
        />
      )}

      {/* aşağı kaydır ipucu */}
      <button
        type="button"
        onClick={() => runStep(indexRef.current, 1)}
        aria-label="Sonraki bölüm"
        className="absolute left-1/2 z-40 flex -translate-x-1/2 cursor-pointer flex-col items-center gap-1 font-mono text-[10px] tracking-[.24em] text-[#a8eef6]"
        style={{
          bottom: 22,
          opacity: hintOn ? 0.85 : 0,
          pointerEvents: hintOn ? "auto" : "none",
          transition: "opacity .6s ease",
          textShadow: "0 0 8px rgba(79,216,255,.8)",
        }}
      >
        AŞAĞI KAYDIR
        <span className="scroll-hint block h-3 w-3 rotate-45 border-r border-b border-[#a8eef6]" />
      </button>

      {/* HERO AVATAR — yalnızca hikâyede */}
      {story && (
        <SiteAvatar
          onPlugged={() => setPowered(true)}
          onExitStart={onHeroExit}
          onSequenceComplete={() => {
            onHeroExit();
            setHeroAvatarGone(true);
          }}
          hidden={heroAvatarGone}
        />
      )}
    </main>
  );
}
