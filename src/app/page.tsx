"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import HeroSection from "@/components/sections/HeroSection";
import RoadmapSection from "@/components/sections/RoadmapSection";
import ProjectsSection from "@/components/sections/ProjectsSection";
import FooterSection from "@/components/sections/Footersection";
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

const HERO_TO_ROADMAP_MS = 2100;
const ROADMAP_TO_PROJECTS_MS = 2100;
const FOOTER_SLIDE_MS = 1100;

/* yumuşak başlayıp yumuşak biten geçiş (easeInOutCubic) */
const easeInOut = (v: number) =>
  v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;

/** duration boyunca 0→1 ilerleme üretir, her karede apply çağırır */
function tween(duration: number, apply: (p: number) => void) {
  let raf = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const raw = Math.min(1, (now - start) / duration);
    apply(easeInOut(raw));
    if (raw < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

const show = (el: HTMLElement | null, on: boolean) => {
  if (el) el.style.visibility = on ? "visible" : "hidden";
};

export default function Home() {
  const [powered, setPowered] = useState(false);
  const [heroTransitioning, setHeroTransitioning] = useState(false);
  const [roadmapComplete, setRoadmapComplete] = useState(false);
  const [projectsComplete, setProjectsComplete] = useState(false);
  const [footerOpen, setFooterOpen] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const roadmapRef = useRef<HTMLElement>(null);
  const projectsRef = useRef<HTMLElement>(null);
  /** geçiş ilerlemeleri (render tetiklemez) */
  const prog = useRef({ hero: 0, projects: 0 });

  /* tüm bölümlerin stilini mevcut ilerlemeye göre yazar */
  const paint = useCallback(() => {
    const { hero: h, projects: p } = prog.current;
    const hero = heroRef.current;
    const road = roadmapRef.current;
    const proj = projectsRef.current;
    if (hero) {
      hero.style.opacity = String(1 - h);
      hero.style.pointerEvents = h < 0.5 ? "auto" : "none";
      show(hero, h < 1);
    }
    if (road) {
      road.style.transform = `translate3d(0, ${(1 - h) * 100 - p * 100}%, 0)`;
      road.style.pointerEvents = h > 0.5 && p < 0.5 ? "auto" : "none";
      show(road, h > 0 && p < 1);
    }
    if (proj) {
      proj.style.transform = `translate3d(0, ${(1 - p) * 100}%, 0)`;
      proj.style.pointerEvents = p > 0.5 ? "auto" : "none";
      show(proj, p > 0);
    }
  }, []);

  /* ilk kare: roadmap ve projects ekran dışında ve gizli */
  useEffect(paint, [paint]);

  /* HERO → ROADMAP */
  useEffect(() => {
    if (!heroTransitioning) return;
    return tween(HERO_TO_ROADMAP_MS, (v) => {
      prog.current.hero = v;
      paint();
    });
  }, [heroTransitioning, paint]);

  /* ROADMAP → PROJECTS */
  useEffect(() => {
    if (!roadmapComplete) return;
    return tween(ROADMAP_TO_PROJECTS_MS, (v) => {
      prog.current.projects = v;
      paint();
    });
  }, [roadmapComplete, paint]);

  /* =========================================================
     PROJECTS → FOOTER
     Projeler bitince sayfa projelerde KALIR. Footer yalnızca
     kullanıcı aşağı kaydırınca (ya da ipucuna tıklayınca) alttan
     açılır; yukarı kaydırınca kapanır. Footer'ın kendi
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

  const hero = useMemo(() => <HeroSection powered={powered} />, [powered]);
  const roadmap = useMemo(
    () => (
      <RoadmapSection active={heroTransitioning} onComplete={onRoadmapDone} />
    ),
    [heroTransitioning, onRoadmapDone],
  );
  const projects = useMemo(
    () => (
      <ProjectsSection
        active={roadmapComplete}
        onComplete={onProjectsDone}
        riderHidden={footerOpen}
      />
    ),
    [roadmapComplete, onProjectsDone, footerOpen],
  );
  const footer = useMemo(
    () => <FooterSection open={footerOpen} />,
    [footerOpen],
  );

  return (
    <main className="fixed inset-0 overflow-hidden">
      {/* RENK PALETİ (theme.tsx → PALETTE) */}
      <ThemeStyles />

      {/* HERO */}
      <section ref={heroRef} className="absolute inset-0 z-0">
        {hero}
      </section>

      {/* ROADMAP */}
      <section
        ref={roadmapRef}
        className="absolute inset-0 z-10 will-change-transform"
        style={{ transform: "translate3d(0, 100%, 0)", visibility: "hidden" }}
      >
        {roadmap}
      </section>

      {/* PROJECTS — roadmap'in hemen altında */}
      <section
        ref={projectsRef}
        className="absolute inset-0 z-20 will-change-transform"
        style={{ transform: "translate3d(0, 100%, 0)", visibility: "hidden" }}
      >
        {projects}
      </section>

      {/* FOOTER — projelerin altından kayarak açılır */}
      <section
        className="absolute inset-x-0 bottom-0 z-30"
        style={{
          transform: `translate3d(0, ${footerOpen ? 0 : 105}%, 0)`,
          /* kapanınca kayma bittikten sonra gizlenir */
          visibility: footerOpen ? "visible" : "hidden",
          transition: `transform ${FOOTER_SLIDE_MS}ms cubic-bezier(.22,1,.36,1), visibility 0s linear ${
            footerOpen ? 0 : FOOTER_SLIDE_MS
          }ms`,
          pointerEvents: footerOpen ? "auto" : "none",
        }}
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
          opacity: projectsComplete && !footerOpen ? 0.85 : 0,
          pointerEvents: projectsComplete && !footerOpen ? "auto" : "none",
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
