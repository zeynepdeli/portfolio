"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import { PERF_LITE_CSS, startPerfTier } from "@/components/ui/perfTier";
import {
  ALL_AVATAR_IMAGES,
  IMG,
  fontsReady,
  preloadImages,
} from "@/components/ui/assets";

/* =========================================================
   SİTE AKIŞI — Hero → Roadmap → Projects → Footer
   İki kullanım:
   - "story" (ana adres "/"): hikâye kendiliğinden oynar — avatar fişi
     takar, roadmap'e atlar, yetenekleri toplar, projelere geçer, footer
     açılır. Hikâye bitince kaydırarak bölümler arasında gezilebilir.
   - "hero" | "roadmap" | "projects" (menüden gidilen adresler): o bölüm
     BİTMİŞ haliyle açılır; aşağı / yukarı kaydırarak (tekerlek, parmak,
     klavye) diğer bölümlere aynı geçişlerle gidilir.

   PERFORMANS: sayfa geçişi tarayıcının KOMPOZİTÖRÜNDE oynar (Web
   Animations API, yalnızca transform / opacity). Eskiden her kare
   JavaScript'le yazılıyordu; aynı anda avatar, nehir ya da fan bir
   işlem yaptığında geçiş donuyordu. Artık ana iş parçacığı meşgul
   olsa bile kayma akıcı kalır. Bölümlerin katmanı sabittir (açılıp
   kapanmaz) → "fotoğraf çeker gibi" kırpışma olmaz. Gelecek bölüm,
   harekete başlamadan iki kare önce görünür yapılır.

   HAZIRLIK: sahne, yazı tipleri ve o bölümün avatar görselleri hazır
   olunca kurulur (en fazla ~1.5 sn beklenir). Böylece sayfa ile avatar
   aynı anda görünür; ilk karede yanlış (masaüstü) yerleşim görünüp
   sonra kaymaz.
========================================================= */

/** açılış sahnesi ışık yanık hali (site yüklenirken görünür):
 *  karanlık zemin + yukarıdan inen hüzme + ortada portre ışığı */
const STAGE_LIT = {
  background: [
    /* portrenin duracağı yerde sıcak ışık havuzu */
    "radial-gradient(ellipse min(46vw, 36vh) min(40vw, 34vh) at 50% 50%, rgba(255,236,210,.16), rgba(255,236,210,.06) 55%, transparent 78%)",
    "rgb(3,5,12)",
  ].join(", "),
} as const;
/* yukarıdan inen fener hüzmesi (sahnedeki hüzmeyle aynı biçim; kenarları
   yumuşak: bulanıklık dıştaki kutuda, kesim içtekinde) */
const STAGE_BEAM_SOFT = { filter: "blur(14px)" } as const;
const STAGE_BEAM = {
  clipPath: "polygon(46% 0, 54% 0, 80% 100%, 20% 100%)",
  background:
    "linear-gradient(to bottom, rgba(255,238,212,.2), rgba(255,238,212,.08) 45%, transparent 75%)",
} as const;

export type FlowStart = "story" | "hero" | "roadmap" | "projects" | "footer";

/* ---------------- TEMPO (yavaş = hikâye daha belirgin) ---------------- */
const TRANSITION_MS = 2200;
/** telefonda / dar ekranda geçişler biraz daha kısa (ms) */
const MOBILE_TRANSITION_MS = 1500;
/** footer'ın yükselme süresi (ms) */
const FOOTER_MS = 1400;
/** yeni bölümün animasyonu geçiş BİTİNCE ve kısa bir nefesten sonra
 *  başlar. Avatar gelen sayfada zaten görünür (girişte hazır bekler),
 *  bu yüzden bekleme kısa: sayfa oturur oturmaz yola çıkar */
const ARRIVE_PAUSE_MS = 140;
/** projelerde kişi, geçişin bu oranında akmaya başlar */
const PROJECTS_ENTER_AT = 0.5;
/** sahne kurulmadan önce yazı tipi / görsel için en fazla bekleme (ms) */
const READY_MAX_MS = 700;
/** yazı tipi için en fazla bekleme (ms) */
const FONT_WAIT_MS = 300;
/** her bölümün açılışta HAZIR olması gereken görselleri */
const CRITICAL_IMAGES: Record<FlowStart, string[]> = {
  story: [IMG.waveStart, IMG.climbStill],
  hero: [IMG.waveEnd],
  roadmap: [IMG.sit, IMG.ride, IMG.rideFront],
  projects: [IMG.sit, IMG.ride],
  footer: [IMG.sit, IMG.pinch],
};
/** geçiş eğrisi: hemen kımıldar, yumuşakça oturur. (Eskiden
 *  easeInOutQuart'tı: ilk üçte birde neredeyse hiç kıpırdamıyor, sayfa
 *  "takıldı mı?" dedirtiyordu.) */
const EASE_CSS = "cubic-bezier(.45,.05,.15,1)";
/** kompozitör animasyonu için ara kare sayısı (gölge yayı için) */
const SAMPLES = 8;
/** hikâyede projeler bitince footer bu kadar sonra kendiliğinden açılır */
const FOOTER_AUTO_MS = 3500;
/** bir geçiş bittikten sonra tekerlek bu süre yok sayılır (dokunmatik
 *  yüzeylerin kayma ataleti art arda iki sayfa geçirmesin) */
const WHEEL_COOLDOWN_MS = 700;

const isNarrow = () =>
  typeof window !== "undefined" && window.innerWidth < 768;

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
/** gelen kart hafif arkaya yatık yükselir, otururken düzleşir (derinlik) */
const IN_TILT = 9;
const inTransform = (t: number) =>
  `perspective(1600px) translate3d(0, ${((1 - t) * 100).toFixed(3)}%, 0) rotateX(${(IN_TILT * (1 - t)).toFixed(3)}deg) scale(${(IN_SCALE + (1 - IN_SCALE) * t).toFixed(4)})`;
const riseShadowOpacity = (t: number) =>
  t > 0 && t < 1 ? Math.sin(Math.PI * t) : 0;
const dimOpacity = (t: number) => (t > 0 && t < 1 ? OUT_DIM * t : 0);

/* yedek (kare kare) geçişin eğrisi: EASE_CSS'e yakın */
const easeInOut = (v: number) =>
  v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;

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
  /* görünmeyen bölümün sonsuz döngülü süs animasyonları (akan çizgiler,
     yanıp sönen ışıklar) durur: gizliyken de her kare hesaplanıyordu */
  el.classList.toggle("flow-off", !on);
};

type Prog = { hero: number; projects: number; footer: number };
/** geçişte hareket eden katmanlar */
type Layer =
  | "hero"
  | "heroDim"
  | "road"
  | "roadShadow"
  | "roadDim"
  | "proj"
  | "projShadow"
  | "recede"
  | "foot";
type LayerStyle = { transform?: string; opacity?: number };

/** verilen ilerlemede her katmanın transform / opacity değeri */
function layerStyles(
  { hero: h, projects: p, footer: f }: Prog,
): Record<Layer, LayerStyle> {
  return {
    hero: { transform: h > 0 ? outTransform(h) : REST },
    heroDim: { opacity: dimOpacity(h) },
    road: {
      transform: p > 0 ? outTransform(p) : h < 1 ? inTransform(h) : REST,
    },
    roadShadow: { opacity: riseShadowOpacity(h) },
    roadDim: { opacity: dimOpacity(p) },
    proj: { transform: p < 1 ? inTransform(p) : REST },
    projShadow: { opacity: riseShadowOpacity(p) },
    recede: { opacity: f },
    foot: { transform: `translate3d(0, ${((1 - f) * 105).toFixed(3)}%, 0)` },
  };
}

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

  /* HAZIRLIK: yazı tipleri + bu bölümün avatar görselleri (en fazla
     READY_MAX_MS). Sonra sahne kurulur; kalan görseller arkadan iner. */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    /* yazı tipini kısa bekle (isim sonra ölçülüyor), portre görselini biraz
       daha: ışık yandığında fotoğraf orada olsun. Yükleniyor yazısı yok. */
    Promise.all([
      fontsReady(FONT_WAIT_MS),
      preloadImages(CRITICAL_IMAGES[start], READY_MAX_MS),
    ]).then(() => {
      if (!alive) return;
      setReady(true);
      /* diğer bölümlerin avatar görselleri: sahne kurulduktan sonra */
      void preloadImages(ALL_AVATAR_IMAGES, 20000);
    });
    return () => {
      alive = false;
    };
  }, [start]);

  /* hikâye durumu */
  const [heroTransitioning, setHeroTransitioning] = useState(!story);
  const [heroAvatarGone, setHeroAvatarGone] = useState(!story);
  const [roadmapArrived, setRoadmapArrived] = useState(false);
  const [projectsArrived, setProjectsArrived] = useState(false);
  /** roadmap avatarı yükselen sayfaya düşmeye başladı */
  const [roadmapEntering, setRoadmapEntering] = useState(false);
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

  /** katman adı → DOM öğesi */
  const layerEl = useCallback(
    (name: Layer): HTMLElement | null =>
      ({
        hero: heroRef.current,
        heroDim: heroDimRef.current,
        road: roadmapRef.current,
        roadShadow: roadShadowRef.current,
        roadDim: roadDimRef.current,
        proj: projectsRef.current,
        projShadow: projShadowRef.current,
        recede: recedeRef.current,
        foot: footerRef.current,
      })[name],
    [],
  );

  /* tüm bölümlerin stilini mevcut ilerlemeye göre yazar */
  const paint = useCallback(() => {
    const { hero: h, projects: p, footer: f } = prog.current;
    const styles = layerStyles(prog.current);
    (Object.keys(styles) as Layer[]).forEach((name) => {
      const el = layerEl(name);
      if (!el) return;
      const s = styles[name];
      if (s.transform !== undefined) el.style.transform = s.transform;
      if (s.opacity !== undefined) el.style.opacity = String(s.opacity);
    });
    const hero = heroRef.current;
    const road = roadmapRef.current;
    const proj = projectsRef.current;
    const foot = footerRef.current;
    if (hero) {
      hero.style.pointerEvents = h < 0.5 ? "auto" : "none";
      show(hero, h < 1);
    }
    if (road) {
      road.style.pointerEvents = h > 0.5 && p < 0.5 ? "auto" : "none";
      show(road, h > 0 && p < 1);
    }
    if (proj) {
      proj.style.pointerEvents = p > 0.5 && f < 0.5 ? "auto" : "none";
      show(proj, p > 0);
    }
    if (foot) {
      foot.style.pointerEvents = f > 0.5 ? "auto" : "none";
      show(foot, f > 0);
    }
  }, [layerEl]);

  /** KOMPOZİTÖR GEÇİŞİ: `key` ilerlemesi from → to giderken değişen
   *  katmanlar Web Animations API ile oynatılır (ana iş parçacığından
   *  bağımsız). Desteklenmiyorsa null döner (eski JS yöntemi). */
  const animateLayers = useCallback(
    (key: Key, from: number, to: number, dur: number, done: () => void) => {
      const hero = heroRef.current;
      if (!hero || typeof hero.animate !== "function") return null;
      /* ara kareler: ilerleme (eğri uygulanmış) uzayında eşit aralıklı;
         uçlarda bir tık içeriden örnekle (kararma / gölge uçta sıfırlanır,
         son değeri paint() yazar) */
      const frames = new Map<Layer, Keyframe[]>();
      for (let i = 0; i <= SAMPLES; i++) {
        const v = from + ((to - from) * i) / SAMPLES;
        const vv = Math.min(0.9999, Math.max(0.0001, v));
        const styles = layerStyles({ ...prog.current, [key]: vv });
        const exact = layerStyles({ ...prog.current, [key]: v });
        (Object.keys(styles) as Layer[]).forEach((name) => {
          const s = styles[name];
          /* transform uçta tam değer (kayma payı kalmasın) */
          const kf: Keyframe = {};
          if (s.transform !== undefined) kf.transform = exact[name].transform;
          if (s.opacity !== undefined) kf.opacity = s.opacity;
          const list = frames.get(name) ?? [];
          list.push(kf);
          frames.set(name, list);
        });
      }
      const anims: Animation[] = [];
      frames.forEach((list, name) => {
        const el = layerEl(name);
        if (!el) return;
        /* değişmeyen katmana animasyon ekleme */
        const first = JSON.stringify(list[0]);
        if (list.every((k) => JSON.stringify(k) === first)) return;
        anims.push(
          el.animate(list, { duration: dur, easing: EASE_CSS, fill: "forwards" }),
        );
      });
      if (!anims.length) return null;
      let over = false;
      const finish = () => {
        if (over) return;
        over = true;
        done();
        /* son değerler satır içi stile yazıldı → animasyon kaldırılır */
        anims.forEach((a) => a.cancel());
      };
      anims[0].onfinish = finish;
      return () => {
        over = true;
        anims.forEach((a) => a.cancel());
      };
    },
    [layerEl],
  );

  /* cihaz gücü: zayıf cihazda ağır süs animasyonları durur */
  useEffect(() => startPerfTier(), []);

  /* ilk kare (sahne kurulunca) */
  useEffect(() => {
    if (ready) paint();
  }, [paint, ready]);
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

      /* geçiş bitti: son hal yazılır, gelen bölümün animasyonu başlar */
      const arrive = () => {
        prog.current[key] = to;
        paint();
        if (dir > 0 && key === "hero")
          window.setTimeout(() => setRoadmapArrived(true), ARRIVE_PAUSE_MS);
        busy.current = false;
        lastNavEnd.current = performance.now();
        indexRef.current = dir > 0 ? target : step;
        setIndex(indexRef.current);
        setChapterKey((k) => k + 1);
        if (key === "footer" && dir > 0) setFooterArrived(true);
      };

      /* AVATAR BİR ÖNCEKİ SAYFADAN GELİR:
         - roadmap: hero'daki kişi aşağı dalar, geçiş biterken ekranın
           üstünden nehrin başına düşer (SiteAvatar exitTarget); indiği an
           roadmapEntering. Bu zamanlayıcı yalnızca yedek.
         - projects: kişi suyla birlikte ekranın üstünden akarak girer */
      if (dir > 0 && key === "hero")
        window.setTimeout(() => setRoadmapEntering(true), dur + 1500);
      if (dir > 0 && key === "projects")
        window.setTimeout(() => setProjectsArrived(true), dur * PROJECTS_ENTER_AT);

      let r1 = 0;
      let r2 = 0;
      let stop: (() => void) | null = null;
      r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => {
          const from = prog.current[key];
          /* önce kompozitör; desteklenmezse eski kare kare yöntem */
          stop = animateLayers(key, from, to, dur, arrive);
          if (stop) return;
          stop = tweenTo(from, to, dur, (v) => {
            prog.current[key] = v;
            paint();
            if (v === to) arrive();
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
    [paint, animateLayers],
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
  /* hero'daki kişinin ineceği yer: roadmap'teki nehrin başı (ekranda,
     sayfa yükselirken her karede canlı) */
  const roadmapEntry = useCallback(() => {
    const mark = roadmapRef.current?.querySelector("[data-rm-entry]");
    if (!mark) return null;
    const r = mark.getBoundingClientRect();
    return { x: r.left, y: r.top };
  }, []);
  const onHeroLand = useCallback(() => setRoadmapEntering(true), []);
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
  const navEnabled = ready && (!story || projectsComplete);
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
  const roadmapActive = story && heroTransitioning && roadmapArrived;
  const projectsActive = story && roadmapComplete && projectsArrived;
  /* sayfa yükselirken sahne hazır (fan kartı / nehir görünür); avatar
     bir önceki sayfadan gelir (yukarıda: roadmapEntering, projectsArrived) */
  const roadmapStaged = story && heroTransitioning;
  const projectsStaged = story && roadmapComplete;

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
        <RoadmapSection
          active={roadmapActive}
          staged={roadmapStaged}
          entering={roadmapEntering}
          onComplete={onRoadmapDone}
        />
      ) : (
        <FinalState>
          <RoadmapSection finished />
        </FinalState>
      ),
    [story, roadmapActive, roadmapStaged, roadmapEntering, onRoadmapDone],
  );
  const projects = useMemo(
    () =>
      story ? (
        <ProjectsSection
          active={projectsActive}
          staged={projectsStaged}
          onComplete={onProjectsDone}
          /* oturan avatar footer TAMAMEN gelince kaybolur */
          riderHidden={footerArrived}
        />
      ) : (
        <FinalState>
          <ProjectsSection finished riderHidden={footerArrived} />
        </FinalState>
      ),
    [story, projectsActive, projectsStaged, onProjectsDone, footerArrived],
  );
  const footer = useMemo(
    /* avatar footer'la BİRLİKTE tırmanır: sayfa yükselmeye başlar
       başlamaz (eskiden sayfa tamamen oturduktan sonra başlıyordu) */
    () => (
      <FooterSection
        open={footerOpen}
        reveal={footerOpen}
        /* tırmanma videosu projelere gelince hazırlanır (açılışta değil) */
        prepare={index >= 2}
      />
    ),
    [footerOpen, index],
  );

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
        .flow-off, .flow-off * { animation-play-state: paused !important; }
        ${PERF_LITE_CSS}
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
        .scroll-hint { animation: scrollHint 1.6s ease-in-out infinite; }
        /* kısa ekranda (yatay telefon, küçük telefon) ipucu içeriğin
           üstüne biniyordu: gösterilmez */
        @media (max-height: 600px) { .flow-hint { display: none; } }
        @keyframes scrollHint {
          0%, 100% { transform: translateY(0) rotate(45deg); opacity: .5; }
          50% { transform: translateY(5px) rotate(45deg); opacity: 1; }
        }
        /* sahne hazır olunca bütün halinde yumuşakça belirir */
        .flow-stage { animation: flowIn .38s ease-out; }
        @keyframes flowIn { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .scroll-hint, .flow-stage { animation: none; }
        }
      `}</style>
      <ThemeStyles />

      {!ready ? (
        /* hazırlanırken (site daha yükleniyorken, sunucudan gelen ilk
           görüntü): karanlık + "yükleniyor" yazısı YOK. Sahnenin ışığı
           zaten yanık: yukarıdan inen fener hüzmesi ve portrenin duracağı
           yerde sıcak bir ışık. Sahne kurulunca aynı yerde, aynı ışıkla
           devam eder. */
        <div
          aria-hidden
          className="absolute inset-0"
          style={story ? STAGE_LIT : undefined}
        >
          {story && (
            <div className="absolute inset-0" style={STAGE_BEAM_SOFT}>
              <div className="absolute inset-0" style={STAGE_BEAM} />
            </div>
          )}
        </div>
      ) : (
      /* hikâyede sahne zaten karanlıktan açılır: ayrıca solarak gelmez */
      <div className={`${story ? "" : "flow-stage "}absolute inset-0`}>
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

      {/* MENÜ — hero'nun kendi menüsü var; diğer bölümlerde sağ üstte
          (bilgisayarda butonlar, telefonda çekmeceli menü) */}
      {index > 0 && index < 3 && (
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
        className="flow-hint absolute left-1/2 z-40 flex -translate-x-1/2 cursor-pointer flex-col items-center gap-1 font-mono text-[10px] tracking-[.24em] text-[#a8eef6]"
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
          exitTarget={roadmapEntry}
          exitMs={isNarrow() ? MOBILE_TRANSITION_MS : TRANSITION_MS}
          onExitLand={onHeroLand}
          onSequenceComplete={() => {
            onHeroExit();
            setHeroAvatarGone(true);
          }}
          hidden={heroAvatarGone}
        />
      )}
      </div>
      )}
    </main>
  );
}
