"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import AlphaVideo from "./AlphaVideo";

/* =========================================================
   SİTE AVATARI — senin videolarınla
   Sıra:
   1. climbing   : tırmanma videosu bir kez oynar (panelin arkasından çıkar)
   2. toPort     : yürüme videosu döngüde, elinde altın kabloyla porta yürür
   3. plugged    : fişi takar → kıvılcım + port parlaması
   4. descending : arkasına dönüp sol alta yürür ve söner
   5. done
========================================================= */

/* Cam panelin üst kenarı — chipLayout.ts'teki panelTop() ile AYNI olmalı.
   Avatar bu kenarın üstüne tırmanır ve kenarın üzerinde yürür. */
export const PANEL_TOP_CSS = "26px"; // panel üstten 26px'de başlar (diğer sayfalara yakın)

/** Panelin üst kenarındayken (tırmanma, porta yürüme, fiş takma) avatar
 *  UZAKTA gibi küçük görünür; böylece dar üst boşluğa sığar. İsme
 *  zıplarken normal boyuna büyür (izleyiciye yaklaşıyormuş gibi). */
const EDGE_SCALE = 0.5; // avatar ve fiş biraz daha büyük (eskiden 0.42)
/** Kenardan ayrılınca (isim, yetenek satırı, ikonlar, yer) avatarın
 *  büyütülmesi — ayak ortasından; 1 = eski boy */
const AV_SCALE = 1.3;

/** true: avatar panelin üst kenarına TIRMANMAZ; panelin içinde, üstteki
 *  fiş soketinin hemen altındaki şeritte koşar ve fişi sokete aşağıdan takar.
 *  (Üst boşluk diğer sayfalar kadar dar olduğu için kenarın üstünde yer yok.) */
const UNDER_EDGE = false; // false: kenara tırmanır, fişi sokete ÜSTTEN takar
/** ScifiBackground üst orta soketinin yüksekliği (px) */
const SOCKET_H = 28;
/** Avatar kutusunun üstü, panel kenarından bu kadar aşağıda (soketin altı) */
const UNDER_GAP = SOCKET_H + 4;
/** Fişin sokete aşağıdan girdiği yer (avatar kutusu koordinatında) */
const SOCKET_BOTTOM_Y = SOCKET_H - UNDER_GAP;

/* Yatay konumlar (%). Dikeyde hep panelin üst kenarında yürür. */
/* Tırmanma yeri: portun hemen solu — çıkınca 1-2 adımda porta varır */
const CLIMB_GAP = 64; // porttaki duruş noktasının kaç px solundan çıksın
/** UNDER_EDGE: avatar portun kaç px solundan koşmaya başlasın */
const RUN_IN_PX = 220;
/* PORT = ScifiBackground'daki "ÜST ORTA BAĞLANTI SOKETİ" (panelin üst
   kenarının ortasındaki 140×28 çıkıntı). İçindeki yuva 70×10 px ve
   kenarın 6px altında başlıyor. Avatar soketin üstüne yürür, kabloyu
   aşağı doğru bu yuvaya takar. */
const SLOT_W = 32; // ScifiBackground soket ağzıyla aynı
const SLOT_TOP = 2;
const SLOT_H = 8;
/* Fişi taktıktan sonra eskisi gibi sol alta iner */
const DESCEND_TARGET = { left: 5, top: 95 };

/* Videolar — public/videos altında. Bunlar senin videolarından üretilen
   "saydam" sürümler: kareli arka plan silindi, kişiye göre kırpıldı,
   yürüme videosu tek adım döngüsüne indirildi (AlphaVideo ile oynar). */
const CLIMB_VIDEO = "/videos/zeynep-tirmanma.mp4";
/* Yürüme yerine koşma (kosma.mp4'ten üretildi, 27 karelik döngü).
   Eski yürüme videosuna dönmek istersen: "/videos/zeynep-yurume.mp4"
   + aşağıda MOVE_ASPECT = 240 ve HAND_PATH'i eski değerlerle değiştir. */
const WALK_VIDEO = "/videos/zeynep-kosma.mp4";

/* Tırmanma videosu kutusu (px). Oran videoyla aynı: 486 × 420 */
const CLIMB_H = 62;
const CLIMB_W = Math.round((CLIMB_H * 486) / 420);
/* Tırmanma videosunda duvar kenarı (kutu yüksekliğine oran).
   Videoda eller tutunurken kenar %74'te, sonunda diz çökünce %86'da →
   başta ellerin tuttuğu yer TAM panel kenarına gelsin diye video önce
   aşağıda başlar, tırmandıkça yukarı kayar. */
const LEDGE = 0.86;
const LEDGE_GRIP = 0.74;
const CLIMB_SHIFT = Math.round(CLIMB_H * (LEDGE - LEDGE_GRIP));

/* AVATAR HIZI — 1 = eski hız; büyüdükçe tüm hareketler YAVAŞLAR
   (videolar, yürüme, fiş takma, zıplamalar aynı oranda) */
const SLOW = 2.3; // eskiden 1.85: avatar daha yavaş, hikâye okunaklı
const ms = (v: number) => Math.round(v * SLOW);

/* HIZ — kullanıcı beklemesin diye her şey hızlı ama akıcı.
   Videolar da aynı oranda hızlı oynar (adım/kol uyumu bozulmaz). */
const CLIMB_RATE = 1.9; // tırmanma videosu hızı (eskiden 2.6): tırmanış daha okunaklı
const RUN_RATE = 2.1 / SLOW; // koşma videosu oynatma hızı

/** tırmanışın ekrandaki süresi (ms) — video 5 sn */
const CLIMB_MS = Math.round(5000 / CLIMB_RATE);
/* Tırmanma videosu yüklenemezse / bitmezse en geç bu süre sonra devam et */
const CLIMB_FALLBACK_MS = CLIMB_MS + 1200;
/** tırmanış ışık halesi (kutu birimi; kenarda EDGE_SCALE ile küçülür) */
const CLIMB_HALO_W = 230;
const CLIMB_HALO_H = 120;

/* Hız izi çizgileri: [yükseklik oranı, uzunluk px, opaklık, titreşim ms] */
const TRAILS: [number, number, number, number][] = [
  [0.05, 46, 0.55, 180],
  [0.32, 64, 0.75, 140],
  [0.58, 52, 0.6, 200],
  [0.85, 38, 0.45, 160],
];
const EDGE_RGB = "222,231,243"; // hız izi / konma halkası: açık altın

/* Süreler (ms) */
const WALK_MS = ms(150); // porta 1-2 adım (eskiden ms(260))
const PLUG_MS = ms(270); // eskiden ms(380)
/** "hero:built" hiç gelmezse avatar bu kadar sonra yine başlar (ms) */
const SCENE_WAIT_FALLBACK_MS = 15000;
/** "hero:built" geldi ama "hero:plug" gelmezse portta en fazla bu kadar bekler (ms) */
const PLUG_WAIT_FALLBACK_MS = 4000;
const JUMP_MS = ms(420); // porttan isme zıplama
const NAME_RUN_MS = ms(380); // ismin üstünde koşma
const PREJUMP_MS = ms(110); // zıplamadan önce kenarda çömelme
const LAND_MS = ms(190); // isme konunca çömelip kalkma

/* SOSYAL İKONLAR — isimden aşağıdaki ikon sırasına zıplar, her birine
   basıp bir sonrakine sekerek geçer (HeroSection > SocialChip'teki
   data-avatar-hop işaretli cam gövdeler) */
const TO_SOCIAL_MS = ms(340); // isimden ilk ikona zıplama
const HOP_AIR_MS = ms(150); // ikondan ikona havada geçen süre
const HOP_SQUAT_MS = ms(45); // her ikona basma (ayak değme) süresi
const HOP_HEIGHT = 26; // ikonlar arası sekme yüksekliği (px)
const EXIT_MS = ms(450); // ekranın en solundan aşağı atlayıp çıkış
/* SONDA: en solda durur, burnunu tutar ve suya atlar gibi aşağıdaki
   roadmap sayfasına zıplar (footer'daki ile aynı görsel) */
const PINCH_IMG = "/images/zeynep-burun.webp";
const PINCH_MS = ms(260); // burnunu tutup hazırlanma
const PINCH_H = 58; // ayakta boyu (px)
const PINCH_W = Math.round((PINCH_H * 223) / 720);
/** roadmap'teki oturan kişinin boyu / buradaki burun tutma pozunun boyu:
 *  atlayış boyunca bu orana küçülür (indiği an iki görsel aynı boyda) */
const LAND_SCALE = 0.88;

/** sonraki sayfaya atlayış planı (SiteFlow verir) */
export type ExitPlan = {
  /** iniş noktası (ekranda, ayak ucu) */
  x: number;
  y: number;
  /** atlayış süresi = sayfa geçişi süresi (ms) */
  ms: number;
  /** kalkış noktası (ayak ucu) — atlayış başlarken ölçülür */
  from?: Pt;
};

/** zıplama yayı: yatay sabit hız, dikey yerçekimi (parabol). Tepe
 *  noktası iki uçtan da yukarıda; ekranın üstünden fazla taşmaz. */
function leapKeyframes(
  from: Pt,
  to: Pt,
  endScale: number,
): Keyframe[] {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const lift = Math.min(170, Math.max(70, dist * 0.22));
  const apex = Math.max(36, Math.min(from.y, to.y) - lift);
  /* ikinci derece Bezier'in kontrol noktası: en tepesi `apex` olsun */
  const yAt = (c: number, u: number) =>
    (1 - u) * (1 - u) * from.y + 2 * u * (1 - u) * c + u * u * to.y;
  const minOf = (c: number) => {
    const d = from.y - 2 * c + to.y;
    const u = d !== 0 ? (from.y - c) / d : -1;
    return u > 0 && u < 1 ? yAt(c, u) : Math.min(from.y, to.y);
  };
  let lo = apex - 4 * (lift + dist);
  let hi = Math.min(from.y, to.y);
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (minOf(mid) < apex) lo = mid;
    else hi = mid;
  }
  const c = (lo + hi) / 2;
  const N = 24;
  const frames: Keyframe[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = from.x + (to.x - from.x) * u;
    const y = yAt(c, u);
    frames.push({
      offset: u,
      translate: `${(x - to.x).toFixed(1)}px ${(y - to.y).toFixed(1)}px`,
      /* havada hafifçe öne döner, suya dik girer */
      rotate: `${(Math.sin(u * Math.PI) * -9).toFixed(2)}deg`,
      scale: `${(1 + (endScale - 1) * u * u).toFixed(3)}`,
    });
  }
  return frames;
}
/* İSİMDEN SONRA: isimden düşer, alttaki yetenek satırının BAŞINDAN
   tek eliyle (kolu yukarıda) tutunur, sallanır, sonra bırakıp ikonlara
   atlar. Görsel zeynep3.png'den üretildi: kol yukarı kaldırıldı. */
const HANG_IMG = "/images/zeynep-asilma.webp";
const HANG_H = 60; // asılı boy (px, AV_SCALE'den önce)
const HANG_W = Math.round((HANG_H * 140) / 360);
/** görselde elin satırı kavradığı nokta (genişlik / yükseklik oranı) */
const HANG_GRIP_X = 0.857;
const HANG_GRIP_Y = 0.05;
const TO_HANG_MS = ms(420); // isimden satıra düşüş
const HANG_MS = ms(900); // tutunup sallanma
/* ÇIKIŞ: son ikondan yere atlar, yerde KOŞARAK ekranın en soluna gider,
   oradan alttaki sayfaya iner (yol haritasındaki nehir de soldan başlar) */
const TO_FLOOR_MS = ms(380); // son ikondan yere atlama
/** yerde koşma hızı (px / ms) — mesafeye göre süre hesaplanır */
const FLOOR_RUN_SPEED = 0.9 / SLOW;
/** yer çizgisi: ekranın altından bu kadar yukarıda (px) */
const FLOOR_GAP = 22;
/** ekranın sol kenarından iç boşluk (px) */
const LEFT_EDGE_PAD = 10;

/* ÇÖMELME POZU — senin fotoğrafından (arka planı silindi).
   Eller kenara dayalı; resmin %95.4'ündeki çizgi = basılan yüzey. */
const CROUCH_IMG = "/images/zeynep-comelme.webp";
const CROUCH_LEDGE = 0.954;
const CROUCH_ABOVE = 34; // yüzeyin üstünde kalan boy (px)
const CROUCH_H = Math.round(CROUCH_ABOVE / CROUCH_LEDGE);
const CROUCH_W = Math.round((CROUCH_H * 242) / 240);

/* İSİM YAZISI ÇÖKMESİ — konduğu yerde harflerin üstü içe göçer.
   SVG displacement filtresi: ayak altında elips bir çukur. */
const DENT_RX = 34; // çukurun yarı genişliği (px)
const DENT_RY = 20; // yarı yüksekliği
/* harflerin ezilmesi (oran): konma anı / üstünde koşarken */
const BEND_HIT = 0.42;
const BEND_HOLD = 0.16;
const DENT_MAP =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${DENT_RX * 2}' height='${DENT_RY * 2}'>` +
      "<defs><radialGradient id='g'>" +
      "<stop offset='0' stop-color='rgb(128,40,128)'/>" +
      "<stop offset='.6' stop-color='rgb(128,92,128)'/>" +
      "<stop offset='1' stop-color='rgb(128,128,128)'/>" +
      "</radialGradient></defs>" +
      `<rect width='${DENT_RX * 2}' height='${DENT_RY * 2}' fill='url(#g)'/></svg>`,
  );
const DESCEND_MS = ms(1000); // koşarak sol alta iniş

const IS_DEV = process.env.NODE_ENV !== "production";

/* Koşan kişi kutusu (px). Oran videoyla aynı: 282 × 420 */
const H = 56;
const MOVE_ASPECT = 282; // video genişliği (yükseklik 420)
const W = Math.round((H * MOVE_ASPECT) / 420);

/* ELİN YERİ — koşma videosunun her karesinden ölçüldü (27 kare, 24 fps).
   Değerler kutu genişliği / yüksekliğine oran. Kablo her karede bu
   noktaya bağlanır, böylece kol sallandıkça kablo da elle birlikte gider. */
const WALK_FPS = 24;
const HAND_PATH: [number, number][] = [
  [0.587, 0.501],
  [0.592, 0.491],
  [0.598, 0.482],
  [0.553, 0.466],
  [0.519, 0.451],
  [0.49, 0.44],
  [0.468, 0.432],
  [0.46, 0.431],
  [0.457, 0.437],
  [0.469, 0.45],
  [0.486, 0.468],
  [0.511, 0.49],
  [0.538, 0.506],
  [0.549, 0.509],
  [0.544, 0.502],
  [0.517, 0.487],
  [0.486, 0.47],
  [0.456, 0.452],
  [0.432, 0.437],
  [0.416, 0.43],
  [0.41, 0.428],
  [0.414, 0.432],
  [0.424, 0.443],
  [0.445, 0.461],
  [0.478, 0.482],
  [0.523, 0.501],
  [0.581, 0.511],
];
function handAt(time: number): { x: number; y: number } {
  const i = Math.floor(time * WALK_FPS + 0.001) % HAND_PATH.length;
  const [fx, fy] = HAND_PATH[(i + HAND_PATH.length) % HAND_PATH.length];
  return { x: fx * W, y: fy * H };
}
/* Ortalama el konumu (sabit hesaplar için) */
const HAND_X = W * 0.5;

/* KONNEKTÖR — üstteki soketin yuvasına (70×10, ızgaralı) uyan geniş
   tarak fiş: lacivert cam gövde, çelik mavi kenar, altın pimler.
   Elinden sarkarak taşınır; portta düz aşağı inip yuvaya oturur. */
const CONN_W = 62; // gövde genişliği (yuvadan biraz dar)
const CONN_BODY = 12; // gövde yüksekliği
const CONN_PINS = 6; // yuvaya giren pim şeridi
/* Konnektör merkezi elin biraz önünde */
const CONN_X = HAND_X + 12;
const CONN_IN_Y = H - 6; // takılıyken gövde üstü (pimler kenarın 6px altında)
/* Kenarda küçültülmüşken (ayak ortasından EDGE_SCALE ile) konnektör yine
   soketin tam ortasına gelsin diye kutunun sol kenarı */
const PORT_ROOT_LEFT_EDGE = `calc(50% - ${(W / 2 + (CONN_X - W / 2) * EDGE_SCALE).toFixed(1)}px)`;

/** Sokette takılı kalan fişin kablosu (fiş ölçeğinde; y=0 panel kenarı):
 *  kovandan yukarı kalkar, portun biraz soluna kıvrılıp panelin arkasına
 *  iner. ScifiBackground > PluggedJack ile AYNI olmalı. */
const PLUG_CABLE_D = "M 0 -19 C 0 -28, -20 -30, -36 -24 S -53 -8, -54 0";

/** Fiş/kablo takılınca yanan turkuaz (poster rengi) */
const PLUG_CYAN = "79,216,255";

/* Palet — sitenin geri kalanıyla aynı */
const GOLD = "90,143,208";
const GOLD_LIGHT = "240,245,252";

/* =========================================================
   TEK AVATAR KURALI
   SiteAvatar sayfada birden fazla yerde kullanılsa bile (ör. hem
   app/page.tsx hem HeroSection) yalnızca BİRİ görünür ve çalışır.
   Öncelik: onPlugged / onSequenceComplete bağlanmış olan (sayfanın
   "güç açılma" akışını yöneten); eşitse ilk eklenen.
========================================================= */
let nextAvatarOrder = 1;
const avatarRegistry = new Map<string, { pri: number; order: number }>();
const avatarListeners = new Set<() => void>();

function notifyAvatars() {
  avatarListeners.forEach((fn) => fn());
}

function subscribeAvatars(onChange: () => void) {
  avatarListeners.add(onChange);
  return () => {
    avatarListeners.delete(onChange);
  };
}

function activeAvatarId(): string | null {
  let best: string | null = null;
  let bestPri = -1;
  let bestOrder = Infinity;
  avatarRegistry.forEach(({ pri, order }, id) => {
    if (pri > bestPri || (pri === bestPri && order < bestOrder)) {
      best = id;
      bestPri = pri;
      bestOrder = order;
    }
  });
  return best;
}

function useIsActiveAvatar(priority: number): boolean {
  const id = useId();
  const orderRef = useRef(0);

  useEffect(() => {
    if (!orderRef.current) orderRef.current = nextAvatarOrder++;
    avatarRegistry.set(id, { pri: priority, order: orderRef.current });
    notifyAvatars();
    return () => {
      avatarRegistry.delete(id);
      notifyAvatars();
    };
  }, [id, priority]);

  return useSyncExternalStore(
    subscribeAvatars,
    () => activeAvatarId() === id,
    () => false,
  );
}

const AVATAR_CSS = `
        /* Ayak altı gölgesi adımla küçülüp büyür */
        @keyframes avClimbLedge {
          0%, 48% { transform: translateY(${CLIMB_SHIFT}px); }
          88%, 100% { transform: translateY(0); }
        }
        /* tırmanırken arkada açılan ışık halesi */
        @keyframes avClimbHalo {
          0%, 12% { opacity: 0; transform: scale(.5); }
          30%     { opacity: 1; transform: scale(1.05); }
          75%     { opacity: .85; transform: scale(1); }
          100%    { opacity: 0; transform: scale(.9); }
        }
        /* eller kenara değince kenar boyunca parlayan çizgi */
        @keyframes avLedgeFlash {
          0%, 14% { opacity: 0; transform: scaleX(.2); }
          24%     { opacity: 1; transform: scaleX(1); }
          55%     { opacity: .55; transform: scaleX(1.1); }
          100%    { opacity: 0; transform: scaleX(1.2); }
        }
        @keyframes avShadow {
          0%, 50%, 100% { transform: scaleX(1);   opacity: .5; }
          25%, 75%      { transform: scaleX(.75); opacity: .3; }
        }
        /* Fiş takılınca: itme + geri tepme */
        @keyframes avPush {
          0%   { transform: translateX(0); }
          35%  { transform: translateY(3px); }
          55%  { transform: translateY(-1px); }
          100% { transform: translateX(0); }
        }
        /* İsme konunca: çömelme + toparlanma */
        @keyframes avLand {
          0%   { transform: scale(1.12, .72); }
          40%  { transform: scale(.96, 1.05); }
          100% { transform: scale(1, 1); }
        }
        /* Zıplamadan önce: çömel ve yaylan */
        /* İkona ayak basınca hafif yaylanma (eğilmeden) */
        @keyframes avSurge {
          0%   { transform: translateX(0) scaleX(.2); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translateX(calc(var(--dir) * 48vw)) scaleX(1); opacity: 0; }
        }
        @keyframes avTrail {
          0%   { transform: scaleX(.55); opacity: .5; }
          100% { transform: scaleX(1);   opacity: 1; }
        }
        /* Konunca ayak altında açılan ışık halkası */
        @keyframes avImpact {
          0%   { transform: translate(-50%, -50%) scale(.2, .2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5, 1.5); opacity: 0; }
        }
        @keyframes avStep {
          0%   { transform: scale(1, 1); }
          40%  { transform: scale(1.04, .94); }
          100% { transform: scale(1, 1); }
        }
        /* İkondan ikona sekme yayı */
        @keyframes avHopA {
          0%   { transform: translateY(0); animation-timing-function: cubic-bezier(.2,.7,.4,1); }
          50%  { transform: translateY(-${HOP_HEIGHT}px); animation-timing-function: cubic-bezier(.6,0,.8,.3); }
          100% { transform: translateY(0); }
        }
        @keyframes avHopB {
          0%   { transform: translateY(0); animation-timing-function: cubic-bezier(.2,.7,.4,1); }
          50%  { transform: translateY(-${HOP_HEIGHT}px); animation-timing-function: cubic-bezier(.6,0,.8,.3); }
          100% { transform: translateY(0); }
        }
        /* isimden düşüş: önce ayakları ismin üstündeyken kol kalkar,
           yerçekimiyle hızlanarak aşağı iner, eli satırı yakalar */
        @keyframes avFall {
          0%   { transform: translateY(-${Math.round(HANG_H * (1 - HANG_GRIP_Y))}px) rotate(-4deg); }
          100% { transform: translateY(5px) rotate(3deg); }
        }
        /* yakalayınca: hafif çekilip geri yaylanır ve sarkaç gibi sallanır */
        @keyframes avHang {
          0%   { transform: translateY(5px) rotate(3deg); }
          10%  { transform: translateY(-2px) rotate(13deg); }
          28%  { transform: translateY(0) rotate(-9deg); }
          46%  { transform: rotate(6deg); }
          64%  { transform: rotate(-3.5deg); }
          80%  { transform: rotate(1.5deg); }
          90%  { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(-${Math.round(HANG_H * 0.18)}px) rotate(0deg); }
        }
        @keyframes avPinch {
          0%   { transform: scale(1.04, .9); }
          60%  { transform: scale(.97, 1.05); }
          100% { transform: none; }
        }
        @keyframes avCrouch {
          0%   { transform: scale(1, 1); }
          70%  { transform: scale(1.08, .8); }
          100% { transform: scale(1.04, .9); }
        }
        @keyframes avSlotOn {
          0%   { opacity: 0; filter: brightness(2); }
          30%  { opacity: 1; filter: brightness(2.2); }
          100% { opacity: .9; filter: brightness(1); }
        }
        @keyframes avSpark {
          0%   { transform: translate(0,0) scale(1);   opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(.2); opacity: 0; }
        }
        @keyframes avPortGlow {
          0%   { opacity: 0; transform: scale(.4); }
          30%  { opacity: 1; transform: scale(1.2); }
          100% { opacity: .55; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .av-anim { animation: none !important; }
        }
      `;

/** Yetenek satırının SONU (avatarın tek eliyle tutunacağı nokta):
 *  isimden sağ uçtan aşağı düşer, satırın sağ ucunu yakalar, gövdesi
 *  yazının sağından sarkar; oradan sosyal ikonlara (sağdan sola) iner.
 *  Yazının gerçek harflerine bakılır (kutular tüm genişliği kaplar);
 *  ">>> unvan" satırı değil, altındaki teknolojiler satırı seçilir. */
function measureHang(belowY: number): Pt | null {
  const sk = document.querySelector("[data-avatar-skills]");
  if (!sk) return null;
  const walker = document.createTreeWalker(sk, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  type Line = {
    top: number;
    left: number;
    right: number;
    bottom: number;
    text: string;
  };
  const lines: Line[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent ?? "";
    if (!t.trim() || t.trim() === "·") continue;
    /* TerminalText'in yer tutan görünmez kopyası sayılmaz */
    const pe = n.parentElement;
    if (pe && getComputedStyle(pe).visibility === "hidden") continue;
    range.selectNodeContents(n);
    for (const q of Array.from(range.getClientRects())) {
      if (q.width < 1 || q.height < 2) continue;
      const line = lines.find((l) => Math.abs(l.top - q.top) < q.height * 0.5);
      if (line) {
        if (q.left < line.left) line.left = q.left;
        if (q.right > line.right) line.right = q.right;
        line.text += t;
      } else
        lines.push({
          top: q.top,
          left: q.left,
          right: q.right,
          bottom: q.bottom,
          text: t,
        });
    }
  }
  lines.sort((a, b) => a.top - b.top);
  const line =
    lines.find((l) => !l.text.trimStart().startsWith(">")) ?? lines[0];
  if (!line || line.top <= belowY + 8) return null;
  /* el son harfin üstünü kavrar, gövde satırın sağından sarkar */
  return { x: line.right - 3, y: line.top + 1 };
}

type Stage =
  | "climbing"
  | "toPort"
  | "plugged"
  | "prejump" // kenarda çömelir (fotoğraf pozu)
  | "jump" // porttan aşağıdaki isim yazısının üstüne zıplar
  | "land" // isme konar: çömelir, yazı içe göçer
  | "onName" // ismin üstünde koşar
  | "toHang" // isimden alttaki yetenek satırına düşer
  | "hang" // satıra asılı kalır
  | "social" // sosyal ikonların üstünde tek tek sekerek geçer
  | "toFloor" // son ikondan yere atlar
  | "toLeft" // yerde koşarak ekranın en soluna gider
  | "pinch" // burnunu tutar (suya atlar gibi)
  | "descending"
  | "done";

type Pt = { x: number; y: number };
/* İsim yazısının üstündeki iniş ve koşu noktaları (ekran px, ayak hizası) */
type NameSpots = { land: Pt; end: Pt; jumpLeft: boolean; hang: Pt | null };

type SiteAvatarProps = {
  onSequenceComplete?: () => void;
  onPlugged?: () => void;
  /** avatar aşağıdaki sayfaya dalmaya BAŞLADI (sayfa geçişi bununla
   *  aynı anda başlar: avatar yükselen roadmap'e atlar) */
  onExitStart?: () => void;
  /** atlayışın nereye / ne kadar sürede olacağı (yoksa ekrandan aşağı
   *  dalıp çıkar) — atlayış başlarken bir kez sorulur */
  exitPlan?: () => ExitPlan | null;
  hidden?: boolean;
  climbSrc?: string;
  walkSrc?: string;
  /** true: animasyon oynamaz, doğrudan bitmiş hal (fiş sokette takılı,
   *  avatar yok). Menüden ana sayfaya gelince kullanılır. */
  startDone?: boolean;
};

export default function SiteAvatar({
  onSequenceComplete,
  onPlugged,
  onExitStart,
  exitPlan,
  hidden = false,
  climbSrc = CLIMB_VIDEO,
  walkSrc = WALK_VIDEO,
  startDone = false,
}: SiteAvatarProps) {
  const [stage, setStage] = useState<Stage>(startDone ? "done" : "climbing");
  const [run, setRun] = useState(0);
  /* Yürüme videosundaki o anki kareye göre elin yeri */
  const [hand, setHand] = useState(() => handAt(0));
  const [videoStatus, setVideoStatus] = useState("bekleniyor");
  const [spots, setSpots] = useState<NameSpots | null>(null);
  /* bir sonraki sayfaya atlayış (iniş noktası + süre) */
  const [exit, setExit] = useState<ExitPlan | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dentImgRef = useRef<SVGFEImageElement>(null);
  const dentMapRef = useRef<SVGFEDisplacementMapElement>(null);
  const dentT = useRef({ hit: 0, release: 0, x: 0, released: false });
  /* Sosyal ikonların basılacak noktaları (ayak hizası) ve sıradaki ikon */
  const [hops, setHops] = useState<Pt[]>([]);
  const [hopIdx, setHopIdx] = useState(0);
  const [squat, setSquat] = useState(false);
  /* SAHNE HAZIR OLANA KADAR BEKLE: ana sayfa açılışta ışık sürüsüyle
     kurulur; bitince "hero:built" olayı gelir, avatar ancak o zaman
     tırmanıp fişi takar. Olay gelmezse (başka sayfa vb.) kısa süre sonra başlar. */
  const [sceneReady, setSceneReady] = useState(startDone);
  /* FİŞ İZNİ: avatar porta varınca bekler; açılış bitince ("hero:plug")
     fişi HEMEN takar. Olay hiç gelmezse (başka sayfa) beklemez. */
  const [plugGo, setPlugGo] = useState(startDone);
  useEffect(() => {
    if (sceneReady && plugGo) return;
    const go = () => setSceneReady(true);
    const plug = () => {
      setSceneReady(true);
      setPlugGo(true);
    };
    window.addEventListener("hero:built", go);
    window.addEventListener("hero:plug", plug);
    const fb = window.setTimeout(
      plug,
      sceneReady ? PLUG_WAIT_FALLBACK_MS : SCENE_WAIT_FALLBACK_MS,
    );
    return () => {
      window.removeEventListener("hero:built", go);
      window.removeEventListener("hero:plug", plug);
      window.clearTimeout(fb);
    };
  }, [sceneReady, plugGo]);
  /* owner: sayfadaki avatar kopyalarından görünecek olan bu mu.
     ÖNCEDEN YÜKLEME: sahne hazır olmadan da (açılış animasyonu sürerken)
     avatar gizli olarak kurulur; tırmanma ve koşma videoları şimdiden
     iner ve ilk karede bekler. Eskiden video ancak tırmanma başlarken
     inmeye başlıyordu: kimi açılışta tırmanış yarıda görünüyor ya da hiç
     görünmüyor, avatar portun yanında birden beliriyordu. */
  const owner = useIsActiveAvatar(onPlugged || onSequenceComplete ? 1 : 0);
  const isActive = owner && sceneReady;

  /* Geliştirme modunda: bileşen sayfada mı? (tarayıcı konsoluna yazar) */
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        "[SiteAvatar] sayfada, hidden =",
        hidden,
        "videolar:",
        climbSrc,
        walkSrc,
      );
    }
  }, [hidden, climbSrc, walkSrc]);

  /* Fiş takılınca isim yazısının yerini ölç (HeroSection'daki
     data-avatar-name işaretli başlık). Bulunamazsa ekranın ortası. */
  useEffect(() => {
    if (stage !== "plugged") return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const el = document.querySelector("[data-avatar-name]");
    let land: Pt;
    let end: Pt;
    if (el) {
      const r = el.getBoundingClientRect();
      /* harflerin üst hizası (satır boşluğunun altı) */
      const top = r.top + r.height * 0.2;
      /* ismin soluna konar, SAĞA koşar; sağ uçtan aşağı düşer */
      land = { x: r.left + r.width * 0.3, y: top };
      end = { x: r.left + r.width * 0.9, y: top };
    } else {
      land = { x: vw * 0.35, y: vh * 0.45 };
      end = { x: vw * 0.6, y: vh * 0.45 };
    }
    const nowX = vw / 2 - CONN_X + W / 2;
    /* asılacağı yetenek satırı (HeroSection: data-avatar-skills) */
    const hang = measureHang(end.y);
    /* ölçüm sonucu bir sonraki karede state'e yazılır */
    const raf = requestAnimationFrame(() =>
      setSpots({ land, end, jumpLeft: land.x < nowX - 8, hang }),
    );
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  /* İsmin üstünde koşarken yetenek satırını yeniden ölç: yazı artık
     tamamen yazılmış, satırın gerçek başı belli */
  useEffect(() => {
    if (stage !== "onName") return;
    const raf = requestAnimationFrame(() =>
      setSpots((sp) => (sp ? { ...sp, hang: measureHang(sp.end.y) } : sp)),
    );
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  /* İsim yazısının çökmesi (web + telefon): avatarın bastığı yerdeki
     harfler ezilir, yanlardakilerin ÜSTLERİ ayağa doğru eğilir; konunca
     sert, üstünde koşarken hafif, ayrılınca yaylanıp düzelir.
     Yalnızca harflerin transform'u değişir (SVG filtresi yok → akıcı). */
  useEffect(() => {
    const releasing =
      stage === "toHang" ||
      stage === "hang" ||
      stage === "social" ||
      stage === "toFloor" ||
      stage === "toLeft" ||
      stage === "pinch" ||
      stage === "descending";
    if (stage !== "land" && stage !== "onName" && !releasing) return;
    if (releasing && dentT.current.released) return;
    const el = document.querySelector<HTMLElement>("[data-avatar-name]");
    const root = rootRef.current;
    if (!el || !root) return;
    /* harfler (TerminalText bend): yoksa yazının tamamı ezilir */
    const chars = Array.from(el.querySelectorAll<HTMLElement>("[data-bend]"));
    const now0 = performance.now();
    if (stage === "land") {
      dentT.current.hit = now0;
      dentT.current.released = false;
      dentT.current.release = 0;
    }
    if (releasing && !dentT.current.release) dentT.current.release = now0;

    const er = el.getBoundingClientRect();
    const centers = chars.map((c) => {
      const r = c.getBoundingClientRect();
      return r.left + r.width / 2;
    });
    /* etki yarıçapı: yazı boyuna göre (~2-3 harf) */
    const R = Math.max(16, er.height * 0.85);
    if (!chars.length) el.style.transformOrigin = "50% 100%";

    const reset = () => {
      chars.forEach((c) => (c.style.transform = ""));
      el.style.transform = "";
    };

    let raf = 0;
    const tick = () => {
      const now = performance.now();
      if (!releasing) {
        const rr = root.getBoundingClientRect();
        dentT.current.x = rr.left + rr.width / 2;
      }
      let depth: number;
      if (releasing) {
        const t = now - dentT.current.release;
        if (t > 800) {
          reset();
          dentT.current.released = true;
          return;
        }
        depth = BEND_HOLD * Math.exp(-t / 120) * Math.cos(t / 45);
      } else {
        const t = now - dentT.current.hit;
        depth =
          BEND_HOLD +
          (BEND_HIT - BEND_HOLD) * Math.exp(-t / 160) * Math.cos(t / 40);
      }
      const fx = dentT.current.x;
      if (chars.length) {
        for (let i = 0; i < chars.length; i++) {
          const dx = centers[i] - fx;
          const inf = Math.exp(-(dx * dx) / (R * R));
          if (inf < 0.01) {
            if (chars[i].style.transform) chars[i].style.transform = "";
            continue;
          }
          const d = depth * inf;
          /* üstü ayağın olduğu yere doğru eğilir, kendisi ezilir */
          const skew = Math.max(-1, Math.min(1, dx / R)) * d * 55;
          chars[i].style.transform =
            `skewX(${skew.toFixed(2)}deg) scale(${(1 + d * 0.15).toFixed(3)}, ${(1 - d).toFixed(3)})`;
        }
      } else {
        el.style.transform = `scale(${(1 + depth * 0.1).toFixed(3)}, ${(1 - depth * 0.6).toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  /* Asılınca yetenek satırı ağırlıkla hafifçe aşağı esner */
  useEffect(() => {
    if (stage !== "hang") return;
    const sk = document.querySelector<HTMLElement>("[data-avatar-skills]");
    /* tutunulan baş ucu ağırlıkla aşağı eğilir, sonra yaylanır */
    /* tutulan SAĞ uç ağırlıkla aşağı eğilir (dönme noktası sol uç) */
    if (sk) sk.style.transformOrigin = "0% 50%";
    sk?.animate(
      [
        { transform: "none" },
        { transform: "translateY(3px) rotate(2.2deg)", offset: 0.14 },
        { transform: "translateY(-1px) rotate(-1deg)", offset: 0.34 },
        { transform: "translateY(1px) rotate(0.6deg)", offset: 0.55 },
        { transform: "rotate(-0.3deg)", offset: 0.75 },
        { transform: "none" },
      ],
      { duration: Math.round(HANG_MS * 0.8), easing: "ease-out" },
    );
  }, [stage]);

  /* Bileşen kaldırılırsa yazı filtresini temizle */
  useEffect(
    () => () => {
      const el = document.querySelector<HTMLElement>("[data-avatar-name]");
      if (el) el.style.filter = "";
    },
    [],
  );

  /* İsme konunca sosyal ikonların yerini ölç (sağdan sola) */
  useEffect(() => {
    if (stage !== "land") return;
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-avatar-hop]"),
    );
    const pts = els
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + 1 };
      })
      .filter((p) => p.x > 0 && p.x < window.innerWidth)
      .sort((a, b) => b.x - a.x); // sağdan sola: Instagram → LinkedIn
    const raf = requestAnimationFrame(() => {
      setHops(pts);
      setHopIdx(0);
      setSquat(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  /* İkonlar arası sekme: havada süzül → bas (ikon çöker, altın parlar)
     → bir sonrakine sek; sonuncudan sonra aşağı atlayıp çık */
  useEffect(() => {
    if (stage !== "social" || !isActive) return;
    const air = hopIdx === 0 ? TO_SOCIAL_MS : HOP_AIR_MS;
    const t1 = setTimeout(() => {
      setSquat(true);
      const el = document.querySelectorAll<HTMLElement>("[data-avatar-hop]");
      const sorted = Array.from(el).sort(
        (a, b) =>
          b.getBoundingClientRect().left - a.getBoundingClientRect().left,
      );
      pressChip(sorted[hopIdx]);
    }, air);
    const t2 = setTimeout(() => {
      setSquat(false);
      if (hopIdx < hops.length - 1) setHopIdx((i) => i + 1);
      else setStage("toFloor");
    }, air + HOP_SQUAT_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [stage, hopIdx, hops.length, isActive]);

  /* Sahne olaylarını yayınla */
  useEffect(() => {
    if (!isActive) return;
    if (stage === "plugged") emitAvatar({ type: "plugged" });
    if (stage === "done") emitAvatar({ type: "done" });
  }, [stage, isActive]);
  useEffect(() => {
    if (!isActive || stage !== "social" || !hops.length) return;
    /* sekme sağdan sola: k. sekme = soldan (n-1-k). ikon */
    emitAvatar({
      type: "hop",
      chip: hops.length - 1 - hopIdx,
      total: hops.length,
    });
  }, [stage, hopIdx, hops.length, isActive]);

  /* UNDER_EDGE: tırmanma yok → hemen koşarak porta git */
  useEffect(() => {
    if (!UNDER_EDGE || stage !== "climbing") return;
    const t = window.setTimeout(
      () => setStage((s) => (s === "climbing" ? "toPort" : s)),
      120,
    );
    return () => window.clearTimeout(t);
  }, [stage]);

  /* Tırmanma videosu bitince yürümeye geç */
  const handleClimbEnded = () =>
    setStage((s) => (s === "climbing" ? "toPort" : s));

  /* Porta varış anı: fiş izni geç gelirse yürüme süresi tekrar beklenmez */
  const portAt = useRef(0);
  const [atPort, setAtPort] = useState(false);
  const [prevStage, setPrevStage] = useState(stage);
  if (prevStage !== stage) {
    setPrevStage(stage);
    if (stage !== "toPort") setAtPort(false);
  }
  useEffect(() => {
    if (stage !== "toPort") return;
    portAt.current = performance.now() + WALK_MS + 100;
    const t = window.setTimeout(() => setAtPort(true), WALK_MS + 100);
    return () => window.clearTimeout(t);
  }, [stage]);
  /* TIRMANMA HİÇ KESİLMEZ: fiş izni tırmanırken gelse bile avatar önce
     kenara tamamen tırmanır, sonra porta yürür ve fişi ANCAK o zaman takar
     (izin yürürken/portta beklerken kullanılır — aşağıdaki zamanlayıcı) */

  /* Yerde koşma: son ikonun altından ekranın en soluna; süre mesafeye göre */
  const lastHop = hops[hops.length - 1];
  const floorStartX = lastHop ? lastHop.x - 50 : 0;
  const floorEndX = LEFT_EDGE_PAD + W / 2;
  const floorRunMs = Math.round(
    Math.max(ms(300), (floorStartX - floorEndX) / FLOOR_RUN_SPEED),
  );

  const hasHang = !!spots?.hang;

  /* Üst bileşenin geri çağrıları ref'te: üst bileşen her yeniden
     çizildiğinde (sayfa geçişinde birkaç kez) zamanlayıcı baştan
     kurulmasın — eskiden atlayış bitince avatar 2-3 sn havada kalıyordu */
  const cbs = useRef({ onPlugged, onExitStart, onSequenceComplete, exitPlan });
  useEffect(() => {
    cbs.current = { onPlugged, onExitStart, onSequenceComplete, exitPlan };
  });

  /* Aşama zamanlayıcıları (tırmanma videoyla biter; bu süre yedek) */
  useEffect(() => {
    const next: Partial<Record<Stage, [Stage, number]>> = {
      climbing: ["toPort", CLIMB_FALLBACK_MS],
      toPort: ["plugged", WALK_MS + 100],
      plugged: ["prejump", PLUG_MS],
      prejump: ["jump", PREJUMP_MS],
      jump: ["land", JUMP_MS],
      land: ["onName", LAND_MS],
      toFloor: ["toLeft", TO_FLOOR_MS],
      toLeft: [hops.length ? "pinch" : "descending", floorRunMs],
      pinch: ["descending", PINCH_MS],
      descending: [
        "done",
        exit?.ms ?? (hops.length ? EXIT_MS : DESCEND_MS),
      ],
    };
    /* İsimden sonra: ikon varsa onlara, yoksa eskisi gibi sol alta */
    const afterName: Stage = hops.length ? "social" : "descending";
    next.onName = [hasHang ? "toHang" : afterName, NAME_RUN_MS];
    next.toHang = ["hang", TO_HANG_MS];
    next.hang = [afterName, HANG_MS];
    if (!isActive) return;
    /* portta fiş iznini bekle; izin gelince kalan yürüme süresi kadar */
    if (stage === "toPort") {
      if (!plugGo) return;
      next.toPort = [
        "plugged",
        Math.max(0, portAt.current - performance.now()),
      ];
    }
    const step = next[stage];
    if (!step) return;

    const t = setTimeout(() => {
      /* iniş noktası, sayfa geçişi başlamadan (sayfa yerindeyken) ölçülür */
      const cb = cbs.current;
      if (step[0] === "descending") {
        const plan = cb.exitPlan?.() ?? null;
        const r = rootRef.current?.getBoundingClientRect();
        setExit(
          plan && r
            ? { ...plan, from: { x: r.left + r.width / 2, y: r.bottom } }
            : null,
        );
      }
      setStage(step[0]);
      if (step[0] === "plugged") cb.onPlugged?.();
      if (step[0] === "descending") cb.onExitStart?.();
      if (step[0] === "done") cb.onSequenceComplete?.();
    }, step[1]);
    return () => clearTimeout(t);
  }, [
    stage,
    exit,
    isActive,
    hasHang,
    hops.length,
    plugGo,
    floorRunMs,
  ]);

  /* ATLAYIŞ YAYI: kişi iniş noktasına yazıldığı karede, eski yerinden
     oraya parabol çizerek uçar (translate / rotate / scale — kompozitörde,
     ana iş parçacığı meşgulken de akar). Sayfa da aynı sürede yükselir:
     kişi sayfa oturduğu an nehrin girişine iner. */
  useLayoutEffect(() => {
    if (stage !== "descending" || !exit) return;
    const el = rootRef.current;
    if (!el || typeof el.animate !== "function") return;
    const from = exit.from ?? {
      x: floorEndX,
      y: window.innerHeight - FLOOR_GAP,
    };
    const a = el.animate(leapKeyframes(from, exit, LAND_SCALE), {
      /* biraz erken iner: zamanlayıcı / kare gecikmesinde bile kişi
         kaybolmadan önce tam noktaya oturmuş olur */
      duration: Math.max(300, exit.ms - 140),
      easing: "linear",
      fill: "both",
    });
    return () => a.cancel();
  }, [stage, exit, floorEndX]);

  /* İkinci kopya: hiçbir şey çizme */
  if (!owner) return null;
  /* sahne hazır değil: gizli, videolar yükleniyor (aşağıda) */
  const preloading = !sceneReady;

  /* ---- Geliştirme modunda sağ altta teşhis kutusu ---- */
  const debugBadge = IS_DEV && (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 100000,
        maxWidth: 420,
        padding: "8px 10px",
        borderRadius: 8,
        background: "rgba(12,20,34,.92)",
        border: "1px solid rgba(200,214,232,.6)",
        color: "#f4f8fd",
        font: "11px/1.45 monospace",
        pointerEvents: "auto",
      }}
    >
      <div>
        AVATAR · aşama: <b>{hidden ? "GİZLİ (hidden=true)" : stage}</b>
      </div>
      <div>video: {videoStatus}</div>
      <button
        onClick={() => {
          setVideoStatus("bekleniyor");
          setStage("climbing");
          setRun((r) => r + 1);
        }}
        style={{
          marginTop: 4,
          padding: "2px 8px",
          borderRadius: 4,
          border: "1px solid rgba(90,143,208,.8)",
          color: "#eef3fa",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        ↻ tekrar oynat
      </button>
    </div>
  );

  if (hidden) return <>{debugBadge}</>;

  /* Ayakları panelin üst kenarında */
  const edgeTop = UNDER_EDGE
    ? `calc(${PANEL_TOP_CSS} + ${UNDER_GAP}px)` // soketin altındaki şerit
    : `calc(${PANEL_TOP_CSS} - ${H}px)`;
  const at = (p: Pt) => ({ left: `${p.x - W / 2}px`, top: `${p.y - H}px` });
  const pos =
    stage === "climbing"
      ? {
          /* UNDER_EDGE: tırmanmaz, soldan koşarak gelir */
          left: UNDER_EDGE
            ? `calc(${PORT_ROOT_LEFT_EDGE} - ${RUN_IN_PX * EDGE_SCALE}px)`
            : `calc(${PORT_ROOT_LEFT_EDGE} - ${CLIMB_GAP * EDGE_SCALE}px)`,
          top: edgeTop,
        }
      : stage === "toPort" ||
          stage === "plugged" ||
          stage === "prejump" ||
          ((stage === "jump" || stage === "land") && !spots)
        ? { left: PORT_ROOT_LEFT_EDGE, top: edgeTop }
        : (stage === "jump" || stage === "land") && spots
          ? at(spots.land)
          : stage === "onName" && spots
            ? at(spots.end)
            : (stage === "toHang" || stage === "hang") && spots?.hang
              ? at(spots.hang)
            : stage === "social" && hops[hopIdx]
              ? at(hops[hopIdx])
              : stage === "toFloor" && hops.length
                ? /* son ikondan biraz sola, yere atlar */
                  at({ x: floorStartX, y: window.innerHeight - FLOOR_GAP })
                : (stage === "toLeft" || stage === "pinch") && hops.length
                  ? /* yerde koşarak ekranın en soluna */
                    at({ x: floorEndX, y: window.innerHeight - FLOOR_GAP })
                  : stage === "descending" && exit
                    ? /* yükselen roadmap'teki nehrin girişine atlar
                         (yay aşağıdaki efektte, kompozitörde) */
                      at(exit)
                  : stage === "descending" && hops.length
                    ? /* en soldan aşağı atlayıp alttaki sayfaya geçer */
                      at({
                        x: LEFT_EDGE_PAD + W / 2,
                        y: window.innerHeight + H * AV_SCALE + 20,
                      })
                    : {
                        left: `${DESCEND_TARGET.left}%`,
                        top: `${DESCEND_TARGET.top}%`,
                      };

  const onEdge =
    stage === "climbing" ||
    stage === "toPort" ||
    stage === "plugged" ||
    stage === "prejump" ||
    ((stage === "jump" || stage === "land") && !spots);

  /* Konum geçişleri: zıplamada yatay düzgün, dikey önce yukarı sonra
     aşağı (cubic-bezier'in eksi değeri yay çizdirir) */
  const move =
    stage === "climbing" ||
    stage === "plugged" ||
    stage === "prejump" ||
    stage === "land"
      ? "none"
      : stage === "jump"
        ? `left ${JUMP_MS}ms linear, top ${JUMP_MS}ms cubic-bezier(.3,-0.3,.65,1)`
        : stage === "onName"
          ? `left ${NAME_RUN_MS}ms linear, top ${NAME_RUN_MS}ms linear`
          : stage === "toHang"
            ? `left ${TO_HANG_MS}ms cubic-bezier(.3,.4,.6,1), top ${TO_HANG_MS}ms cubic-bezier(.55,0,.9,.6)`
            : stage === "hang"
              ? "none"
          : stage === "social"
            ? hopIdx === 0
              ? `left ${TO_SOCIAL_MS}ms linear, top ${TO_SOCIAL_MS}ms ${spots?.hang ? "cubic-bezier(.35,-0.25,.75,.95)" : "cubic-bezier(.3,-0.7,.7,1)"}`
              : `left ${HOP_AIR_MS}ms linear, top ${HOP_AIR_MS}ms linear`
            : stage === "toFloor"
              ? `left ${TO_FLOOR_MS}ms linear, top ${TO_FLOOR_MS}ms cubic-bezier(.3,-0.6,.7,1)`
              : stage === "toLeft"
                ? `left ${floorRunMs}ms cubic-bezier(.3,0,.7,1), top ${floorRunMs}ms linear`
                : stage === "descending" && exit
                  ? "none"
                : stage === "descending" && hops.length
                  ? /* önce hafifçe yukarı sıçrar, sonra dimdik aşağı dalar */
                    `left ${EXIT_MS}ms linear, top ${EXIT_MS}ms cubic-bezier(.35,-0.55,.75,.9)`
                  : stage === "descending"
                    ? `left ${DESCEND_MS}ms cubic-bezier(.45,.05,.4,1), top ${DESCEND_MS}ms cubic-bezier(.45,.05,.4,1)`
                    : `left ${WALK_MS}ms cubic-bezier(.45,.05,.4,1), top ${WALK_MS}ms cubic-bezier(.45,.05,.4,1)`;

  const walking =
    (stage === "toPort" && !atPort) /* portta beklerken durur */ ||
    stage === "jump" ||
    stage === "onName" ||
    stage === "social" ||
    stage === "toFloor" ||
    stage === "toLeft" ||
    (stage === "descending" && !hops.length && !exit);
  /* Sosyal ikonlarda bir önceki noktaya göre yön */
  const hopPrevX =
    hopIdx === 0
      ? spots
        ? (spots.hang ?? spots.end).x
        : 0
      : (hops[hopIdx - 1]?.x ?? 0);
  const hopLeft =
    stage === "social" && !!hops[hopIdx] && hops[hopIdx].x < hopPrevX - 4;
  /* Sola giderken görsel aynalanır */
  /* asılırken görsel aynalanır: el satırın sağ ucunda, gövde sağda */
  const facingLeft =
    (stage === "onName" && !!spots && spots.end.x < spots.land.x) ||
    ((stage === "toHang" || stage === "hang") && !!spots?.hang) ||
    hopLeft ||
    stage === "toFloor" ||
    stage === "toLeft" ||
    ((stage === "prejump" || stage === "jump" || stage === "land") &&
      !!spots?.jumpLeft);
  const plugged = stage === "plugged";
  const airborne =
    stage === "jump" ||
    stage === "toFloor" ||
    stage === "toHang" ||
    stage === "hang" ||
    (stage === "social" && !squat);
  /* Kenarda zıplamaya hazırlanırken ve isme konunca fotoğraf pozu
     (ikonlarda eğilmez, koşar adım basıp geçer) */
  const crouching = stage === "prejump" || stage === "land";
  /* Hızlı hareket anları: hız izi görünür */
  const fast =
    (stage === "toPort" && !atPort) ||
    stage === "jump" ||
    stage === "onName" ||
    (stage === "social" && !squat) ||
    stage === "toFloor" ||
    stage === "toLeft" ||
    (stage === "descending" && !hops.length && !exit);
  /* Burnunu tutup atlama (ayakta, ekrana dönük) */
  const pinching =
    (hops.length > 0 && stage === "pinch") ||
    (stage === "descending" && (hops.length > 0 || !!exit));
  /* yetenek satırına asılı (elleri satırda) */
  const hanging = stage === "hang" || (stage === "toHang" && !!spots?.hang);
  /* Konma anları: ayak altında ışık halkası */
  const impactKey =
    stage === "land"
      ? "land"
      : stage === "social" && squat
        ? `hop${hopIdx}`
        : stage === "toLeft"
          ? "floor" // yere değdiği an
          : null;
  /* İkonlar arası sekmede (aynı yükseklik) yay çizmek için iç sıçrama */
  const hopBounce = stage === "social" && !squat && hopIdx > 0;

  /* Fiş takılınca üstteki soketin yuvası altın renginde yanar
     (ScifiBackground'daki yuvanın tam üstüne çizilir) */
  /* Soketteki ışık ve fiş SABİT (fixed) çizilir: sayfa yerindeyken.
     Avatar dalmaya başlayınca (sayfa kayarken) ve bittiğinde fişi
     sayfanın KENDİSİ çizer (HeroSection → plugged): sabit fiş sayfa
     kayarken ortada asılı kalmasın */
  const onPage = stage !== "descending" && stage !== "done";
  const lit = stage !== "climbing" && stage !== "toPort" && onPage;
  const slotGlow = lit && (
    <div
      className="av-anim pointer-events-none fixed z-9998 rounded-xs"
      style={{
        left: `calc(50% - ${SLOT_W / 2}px)`,
        top: `calc(${PANEL_TOP_CSS} + ${SLOT_TOP}px)`,
        width: SLOT_W,
        height: SLOT_H,
        /* fiş takılınca soketin ağzı turkuaz yanar (içi fişin altında kalır) */
        background: "transparent",
        border: `1px solid rgba(${PLUG_CYAN},.9)`,
        boxShadow: `0 0 10px rgba(${PLUG_CYAN},.8), 0 0 22px rgba(${PLUG_CYAN},.4), inset 0 0 6px rgba(${PLUG_CYAN},.6)`,
        animation: "avSlotOn .6s ease-out both",
      }}
      aria-hidden
    />
  );

  /* Fiş takılınca enerji dalgası: soketten panelin üst kenarı boyunca
     iki yana doğru ışık koşar */
  const surge = stage === "plugged" && (
    <div
      className="pointer-events-none fixed z-9997"
      style={{
        left: 0,
        right: 0,
        top: `calc(${PANEL_TOP_CSS} - 1px)`,
        height: 3,
      }}
      aria-hidden
    >
      {[-1, 1].map((dir) => (
        <span
          key={dir}
          className="av-anim absolute top-0 h-0.75 rounded-full"
          style={
            {
              left: "50%",
              width: 220,
              marginLeft: dir < 0 ? -220 : 0,
              background: `linear-gradient(${dir < 0 ? 270 : 90}deg, rgba(${GOLD_LIGHT},1), rgba(${EDGE_RGB},.9) 35%, transparent)`,
              boxShadow: `0 0 10px rgba(${EDGE_RGB},.9), 0 0 18px rgba(${GOLD},.6)`,
              "--dir": dir,
              animation: "avSurge 520ms cubic-bezier(.2,.7,.3,1) both",
            } as CSSProperties
          }
        />
      ))}
    </div>
  );

  /* Kişi inerken ve gittikten sonra konnektör yuvada takılı kalır; kablosu kenar boyunca
     geldiği yöne (sola) uzanır */
  const leftPlug = stage !== "climbing" &&
    stage !== "toPort" &&
    stage !== "plugged" &&
    onPage && (
      <svg
        className="pointer-events-none fixed z-9999"
        width="1"
        height="1"
        style={{
          left: "50%",
          /* UNDER_EDGE: soketin alt yüzü; fiş aşağıdan takılı, kablo
           soketin altından sola uzanır (dikeyde aynalanır) */
          top: UNDER_EDGE
            ? `calc(${PANEL_TOP_CSS} + ${SOCKET_H}px)`
            : PANEL_TOP_CSS,
          overflow: "visible",
        }}
        aria-hidden
      >
        <g
          transform={
            UNDER_EDGE
              ? `scale(${EDGE_SCALE},${-EDGE_SCALE})`
              : `scale(${EDGE_SCALE})`
          }
        >
          {/* kablo portun biraz solundan panelin ARKASINA iner
              (ScifiBackground > PluggedJack ile aynı) */}
          <CableStroke d={PLUG_CABLE_D} lit cap="butt" />
          <g transform={`translate(0, -6)`}>
            <Connector lit />
          </g>
        </g>
      </svg>
    );

  /* Bittiğinde avatar gider; konnektör portta takılı kalır */
  if (stage === "done")
    return (
      <>
        {debugBadge}
        {slotGlow}
        {leftPlug}
      </>
    );

  return (
    <>
      {debugBadge}
      {slotGlow}
      {surge}
      {leftPlug}
      {/* İsim yazısını çökerten filtre (yazıya CSS filter ile uygulanır) */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter
          id="avNameDent"
          x="-5%"
          y="-40%"
          width="110%"
          height="180%"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodColor="rgb(128,128,128)" result="flat" />
          <feImage
            ref={dentImgRef}
            href={DENT_MAP}
            x="0"
            y="0"
            width={DENT_RX * 2}
            height={DENT_RY * 2}
            preserveAspectRatio="none"
            result="bump"
          />
          <feComposite in="bump" in2="flat" operator="over" result="map" />
          <feDisplacementMap
            ref={dentMapRef}
            in="SourceGraphic"
            in2="map"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <div
        ref={rootRef}
        className="pointer-events-none fixed z-9999"
        style={{
          left: pos.left,
          top: pos.top,
          width: W,
          height: H,
          /* kenardayken küçük (uzakta), isme zıplarken normal boy */
          transformOrigin: "50% 100%",
          transform: `scale(${onEdge ? EDGE_SCALE : AV_SCALE})`,
          transition:
            stage === "jump"
              ? `${move}, transform ${JUMP_MS}ms cubic-bezier(.3,.6,.4,1)`
              : move === "none"
                ? "none"
                : `${move}, transform 200ms ease`,
          /* sahne hazır olana kadar görünmez (videolar bu sırada iner).
             visibility değil opacity: tuval kendi görünürlüğünü açıkça
             "visible" yazdığı için gizli üst kutuyu deliyordu */
          opacity: preloading
            ? 0
            : stage === "descending" && !hops.length && !exit
              ? 0.9
              : 1,
        }}
        aria-hidden
      >
        <style>{AVATAR_CSS}</style>
        {/* burun tutma görseli önceden yüklensin (atlarken boş kare olmasın) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PINCH_IMG} alt="" aria-hidden style={{ display: "none" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HANG_IMG} alt="" aria-hidden style={{ display: "none" }} />

        {/* ======== TIRMANMA ======== */}
        {stage === "climbing" && !UNDER_EDGE && (
          <>
            {/* TIRMANIŞ VURGUSU: üst kenar dar olduğu için avatar büyütülemiyor;
                onun yerine elleri kenara değdiği an kenar parlar, arkasında
                yumuşak bir ışık halesi açılır, kişinin çevresinde ince ışık
                kenarı olur → koyu sahnede tırmanış net seçilir */}
            {isActive && (
              <>
                <span
                  className="av-anim pointer-events-none absolute rounded-[50%]"
                  style={{
                    left: W / 2 - CLIMB_HALO_W / 2,
                    top: H - CLIMB_HALO_H * 0.62,
                    width: CLIMB_HALO_W,
                    height: CLIMB_HALO_H,
                    background: `radial-gradient(closest-side, rgba(${GOLD_LIGHT},.55), rgba(${PLUG_CYAN},.28) 45%, rgba(${PLUG_CYAN},0) 100%)`,
                    animation: `avClimbHalo ${CLIMB_MS}ms ease-out both`,
                  }}
                />
                <span
                  className="av-anim pointer-events-none absolute rounded-full"
                  style={{
                    left: W / 2 - CLIMB_W * 0.75,
                    top: H - 2,
                    width: CLIMB_W * 1.5,
                    height: 4,
                    background: `linear-gradient(90deg, transparent, rgba(${GOLD_LIGHT},1) 30%, rgba(${GOLD_LIGHT},1) 70%, transparent)`,
                    boxShadow: `0 0 10px rgba(${PLUG_CYAN},.95), 0 0 22px rgba(${PLUG_CYAN},.6)`,
                    animation: `avLedgeFlash ${CLIMB_MS}ms ease-out both`,
                  }}
                />
              </>
            )}
            <div
              className="absolute"
              style={{
                width: CLIMB_W,
                height: CLIMB_H,
                left: (W - CLIMB_W) / 2,
                /* videodaki duvar kenarı = panelin üst kenarı; eller tutunurken
                 kenar daha aşağıda olduğu için video önce CLIMB_SHIFT kadar
                 aşağıdan başlar, diz çökerken yerine oturur */
                top: H - CLIMB_H * LEDGE,
                /* video oynamaya başlayınca başlar (önceden yüklenirken bekler) */
                animation: isActive
                  ? `avClimbLedge ${CLIMB_MS}ms linear both`
                  : "none",
                transform: isActive ? undefined : `translateY(${CLIMB_SHIFT}px)`,
                /* ince ışık kenarı: koyu saç/kazak lacivert zeminde kaybolmasın */
                filter: `drop-shadow(0 0 1.5px rgba(${GOLD_LIGHT},.95)) drop-shadow(0 0 5px rgba(${PLUG_CYAN},.75))`,
              }}
            >
              <AlphaVideo
                key={`c${run}`}
                onStatus={
                  IS_DEV ? (st) => setVideoStatus("tırmanma → " + st) : undefined
                }
                src={climbSrc}
                fallbackSrc="/images/zeynep-tirmanma-kare.webp"
                onEnded={handleClimbEnded}
                playing={isActive}
                playbackRate={CLIMB_RATE}
                className="absolute inset-0"
              />
            </div>
          </>
        )}

        {/* ======== YÜRÜME / FİŞ ========
            Tırmanırken de kurulu (gizli, durmuş): koşma videosu önceden
            iner, tırmanış bitince ilk karede hazır bekler */}
        {(
          /* ikonlar arası sekmede iç sıçrama (A/B dönüşümlü: her sekmede yeniden başlar) */
          <div
            className="absolute inset-0"
            style={{
              animation: hopBounce
                ? `${hopIdx % 2 ? "avHopA" : "avHopB"} ${HOP_AIR_MS}ms linear both`
                : "none",
              opacity: stage === "climbing" && !UNDER_EDGE ? 0 : undefined,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                transform: facingLeft ? "scaleX(-1)" : "none",
                /* asılma pozuna geçerken anında (yoksa düşerken ezilir) */
                transition:
                  stage === "toHang" || stage === "hang"
                    ? "none"
                    : "transform 250ms",
              }}
            >
              {/* Hız izi: koşarken / zıplarken arkasında buz mavisi ışık çizgileri */}
              <div
                className="pointer-events-none absolute"
                style={{
                  right: W * 0.55,
                  top: H * 0.3,
                  width: 70,
                  height: H * 0.6,
                  opacity: fast ? 1 : 0,
                  transition: "opacity 160ms",
                }}
              >
                {TRAILS.map(([y, len, op, d], i) => (
                  <span
                    key={i}
                    className="av-anim absolute right-0 rounded-full"
                    style={{
                      top: `${y * 100}%`,
                      width: len,
                      height: 2,
                      background: `linear-gradient(90deg, transparent, rgba(${EDGE_RGB},${op}) 70%, rgba(255,255,255,${op}))`,
                      boxShadow: `0 0 6px rgba(${EDGE_RGB},${op * 0.8})`,
                      transformOrigin: "100% 50%",
                      animation: `avTrail ${d}ms ease-in-out infinite alternate`,
                    }}
                  />
                ))}
              </div>

              {/* Ayak altı gölgesi */}
              <div
                className="av-anim absolute left-1/2 -translate-x-1/2 rounded-full"
                style={{
                  bottom: -4,
                  width: W * 0.9,
                  height: 8,
                  background:
                    "radial-gradient(closest-side, rgba(0,0,0,.6), transparent)",
                  animation:
                    walking && !airborne
                      ? "avShadow .56s linear infinite"
                      : "none",
                  opacity: airborne ? 0 : undefined,
                  transition: "opacity 150ms",
                }}
              />

              <div
                className="av-anim absolute inset-0 origin-bottom"
                style={{
                  animation: plugged
                    ? "avPush .5s ease-out both"
                    : stage === "social" && squat
                      ? `avStep ${HOP_SQUAT_MS}ms ease-out both`
                      : "none",
                }}
              >
                {/* Çömelme pozu (fotoğraf): eller yüzeyde, yüzey = kutunun altı */}
                {crouching && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={CROUCH_IMG}
                    alt=""
                    draggable={false}
                    className="av-anim absolute max-w-none"
                    style={{
                      width: CROUCH_W,
                      height: CROUCH_H,
                      left: (W - CROUCH_W) / 2,
                      top: H - CROUCH_ABOVE,
                      transformOrigin: `50% ${CROUCH_LEDGE * 100}%`,
                      animation:
                        stage === "land"
                          ? `avLand ${LAND_MS}ms cubic-bezier(.3,1.4,.5,1) both`
                          : `avCrouch ${PREJUMP_MS}ms ease-out both`,
                    }}
                  />
                )}
                {/* Yetenek satırına asılı: elleri satırın üstünde, başı
                    satırın arkasından görünür; hafifçe sallanır */}
                {hanging && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={HANG_IMG}
                    alt=""
                    draggable={false}
                    className="av-anim absolute max-w-none"
                    style={{
                      width: HANG_W,
                      height: HANG_H,
                      /* el kutunun ayak noktasında (= satırın başı) */
                      left: W / 2 - HANG_W * HANG_GRIP_X,
                      top: H - HANG_H * HANG_GRIP_Y,
                      transformOrigin: `${HANG_GRIP_X * 100}% ${HANG_GRIP_Y * 100}%`,
                      animation:
                        stage === "toHang"
                          ? `avFall ${TO_HANG_MS}ms cubic-bezier(.55,0,.9,.6) both`
                          : `avHang ${HANG_MS}ms ease-out both`,
                      /* koyu saç lacivert zeminde kaybolmasın: ince ışık kenarı */
                      filter: `drop-shadow(0 0 1.5px rgba(${GOLD_LIGHT},.8))`,
                    }}
                  />
                )}
                {/* Burnunu tutmuş, ayakta: suya atlar gibi aşağı dalar */}
                {pinching && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={PINCH_IMG}
                    alt=""
                    draggable={false}
                    className="av-anim absolute max-w-none"
                    style={{
                      width: PINCH_W,
                      height: PINCH_H,
                      left: (W - PINCH_W) / 2,
                      top: H - PINCH_H,
                      transformOrigin: "50% 100%",
                      animation: `avPinch ${PINCH_MS}ms ease-out both`,
                    }}
                  />
                )}
                {/* Fiş takarken yürüme durur (adım ortasında bekler) */}
                <AlphaVideo
                  key={`w${run}`}
                  /* el konumu yalnızca kablo taşınırken gerekir: koşu
                     boyunca her video karesinde avatar yeniden çizilmesin */
                  onFrame={
                    stage === "toPort" || stage === "plugged"
                      ? (t) => {
                          const h = handAt(t);
                          setHand((p) =>
                            p.x === h.x && p.y === h.y ? p : h,
                          );
                        }
                      : undefined
                  }
                  onStatus={
                    IS_DEV ? (st) => setVideoStatus("yürüme → " + st) : undefined
                  }
                  src={walkSrc}
                  fallbackSrc="/images/zeynep-kosma-kare.webp"
                  loop
                  playing={walking}
                  playbackRate={RUN_RATE}
                  className="absolute inset-0"
                  style={{ opacity: crouching || pinching || hanging ? 0 : 1 }}
                />

                {/* Elindeki kablo + fiş */}
                {(stage === "toPort" || plugged) && (
                  <Cable plugged={plugged} hand={hand} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======== KONMA HALKASI ======== */}
        {impactKey && (
          <span
            key={impactKey}
            className="av-anim pointer-events-none absolute rounded-[50%]"
            style={{
              left: W / 2,
              top: H,
              width: W * 1.9,
              height: 12,
              border: `2px solid rgba(${EDGE_RGB},.9)`,
              boxShadow: `0 0 10px rgba(${EDGE_RGB},.8), inset 0 0 6px rgba(${GOLD},.6)`,
              animation: "avImpact 380ms ease-out both",
            }}
          />
        )}

        {/* ======== FİŞ TAKILDI: kıvılcımlar + port parlaması ======== */}
        {plugged && (
          <div
            className="absolute"
            style={{ left: CONN_X, top: UNDER_EDGE ? SOCKET_BOTTOM_Y : H + 7 }}
          >
            <span
              className="av-anim absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 34,
                height: 34,
                background: `radial-gradient(circle, rgba(${GOLD_LIGHT},.95), rgba(${GOLD},.4) 45%, transparent 70%)`,
                animation: "avPortGlow .7s ease-out both",
              }}
            />
            {SPARKS.map(([dx, dy], i) => (
              <span
                key={i}
                className="av-anim absolute size-0.75 rounded-full"
                style={
                  {
                    background: `rgb(${GOLD_LIGHT})`,
                    boxShadow: `0 0 6px rgba(${GOLD},1)`,
                    "--dx": `${dx}px`,
                    "--dy": `${dy}px`,
                    animation: `avSpark ${420 + (i % 3) * 120}ms ease-out ${i * 25}ms both`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* Kıvılcım yönleri (px) */
const SPARKS: [number, number][] = [
  [18, -14],
  [24, 2],
  [16, 16],
  [-4, -20],
  [6, 22],
  [28, -6],
  [-10, 14],
  [12, -24],
];

/* =========================================================
   SAHNE OLAYLARI — HeroSection bunları dinleyip girişi avatarla
   senkron yürütür (isim fiş takılınca yazılır, ikonlar avatar
   üstlerine sekerken belirir). window olayı: "avatar:event"
========================================================= */
export type AvatarEvent =
  | { type: "plugged" }
  | { type: "hop"; chip: number; total: number }
  | { type: "done" };

function emitAvatar(detail: AvatarEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AvatarEvent>("avatar:event", { detail }),
  );
}

/* =========================================================
   İKONA BASMA — ikonun cam gövdesi aşağı çöker, altın parlar,
   yaylanıp geri gelir (Web Animations API; SocialChip'e dokunmaz)
========================================================= */
function pressChip(el: HTMLElement | undefined) {
  if (!el || typeof el.animate !== "function") return;
  const base = getComputedStyle(el).boxShadow;
  const gold = `0 0 14px rgba(${GOLD},.95), 0 0 30px rgba(${GOLD},.55), inset 0 0 10px rgba(${GOLD_LIGHT},.5)`;
  el.style.transformOrigin = "50% 100%";
  el.animate(
    [
      {
        transform: "translateY(0) scale(1, 1)",
        boxShadow: base,
        borderColor: "rgba(255,255,255,.3)",
      },
      {
        transform: "translateY(6px) scale(1.05, .9)",
        boxShadow: gold,
        borderColor: `rgba(${GOLD_LIGHT},.9)`,
        offset: 0.25,
      },
      { transform: "translateY(-1px) scale(.99, 1.02)", offset: 0.6 },
      {
        transform: "translateY(0) scale(1, 1)",
        boxShadow: base,
        borderColor: "rgba(255,255,255,.3)",
      },
    ],
    { duration: 340, easing: "ease-out" },
  );
}

/* =========================================================
   KABLO — elden sarkan altın kablo; takılınca porta uzar
========================================================= */
function Cable({
  plugged,
  hand,
}: {
  plugged: boolean;
  hand: { x: number; y: number };
}) {
  /* Kutu koordinatları (ayaklar H'de = panelin üst kenarı).
     Kablo, videodaki elin o karedeki yerinden çıkar. */
  const hx = hand.x;
  const hy = hand.y;
  /* Taşırken konnektör elden sarkar ve elle birlikte sallanır;
     takılıyken yuvada sabit durur */
  const connX = plugged ? CONN_X : hx + 4;
  /* UNDER_EDGE: takılıyken ters döner, pimleri yukarıdan sokete girer */
  const flip = plugged && UNDER_EDGE;
  const top = plugged
    ? UNDER_EDGE
      ? SOCKET_BOTTOM_Y + CONN_BODY + CONN_PINS - 2
      : CONN_IN_Y
    : hy + 7;
  /* Konnektörün kablo girişi (normalde üst orta; ters dönünce alt orta) */
  const bootY = flip ? top + 5 : top - 5;

  return (
    <svg
      className="absolute top-0 left-0 overflow-visible"
      width={W}
      height={H}
      style={{ filter: `drop-shadow(0 0 3px rgba(200,214,232,.45))` }}
    >
      {/* Arkadan gelen kablo (nereden geldiği) */}
      <CableStroke
        d={`M ${hx} ${hy} C ${hx - 30} ${hy + 30}, ${-20} ${H + 2}, ${-70} ${H - 3}`}
        lit={plugged}
      />
      {/* El → konnektör */}
      <CableStroke
        d={`M ${hx} ${hy} C ${hx + 2} ${hy + 3}, ${connX} ${bootY - 6}, ${connX} ${bootY}`}
        lit={plugged}
      />
      {/* Konnektör: portta düz aşağı inip yuvaya oturur */}
      <g
        style={{
          transform: `translate(${connX}px, ${top}px)${flip ? " scale(1,-1)" : ""}`,
          transition: plugged
            ? "transform 420ms cubic-bezier(.3,1.25,.5,1)"
            : "transform 60ms linear",
        }}
      >
        <Connector lit={plugged} />
      </g>
    </svg>
  );
}

/* GÜÇ KABLOSU — footer'daki PSU kablosu gibi: kalın koyu kılıf,
   üstünde ince ışık yansıması; takılınca içinden turkuaz akım akar */
function CableStroke({
  d,
  lit = false,
  cap = "round",
}: {
  d: string;
  lit?: boolean;
  /** "butt": uç düz kesilir (kablo panel kenarında arkaya iniyormuş gibi) */
  cap?: "round" | "butt";
}) {
  return (
    <g fill="none" strokeLinecap={cap}>
      {/* kılıf */}
      <path d={d} stroke="#020b17" strokeWidth={6.5} />
      <path d={d} stroke="#0a1a33" strokeWidth={4.2} />
      {/* kılıfın üstündeki ışık yansıması */}
      <path
        d={d}
        stroke="rgba(207,230,255,.28)"
        strokeWidth={0.9}
        transform="translate(-0.8 -1.2)"
      />
      {/* akım */}
      <path
        d={d}
        stroke={`rgb(${PLUG_CYAN})`}
        strokeWidth={1.4}
        strokeDasharray="6 12"
        style={{
          opacity: lit ? 0.95 : 0,
          filter: `drop-shadow(0 0 3px rgba(${PLUG_CYAN},1))`,
          transition: "opacity 400ms",
        }}
        className="cable-flow cable-flow-rev"
      />
    </g>
  );
}

/* GERÇEKÇİ FİŞ — orijin gövdenin üst ortası (y aşağı).
   • kablo koruması (lastik kovan, halkalı) gövdeye doğru genişler
   • koyu kalıplanmış gövde, iki yanda tutma tırtıkları,
     ortada takılınca turkuaz yanan durum LED'i
   • alttaki metal kılıf (sokete giren kısım) pahlı köşeli,
     ucunda altın kontaklar */
function Connector({ lit = false }: { lit?: boolean }) {
  const x0 = -CONN_W / 2;
  const x1 = CONN_W / 2;
  const B = CONN_BODY;
  const P = CONN_PINS;
  const contacts: number[] = [];
  for (let x = x0 + 6; x <= x1 - 6; x += 3.2) contacts.push(x);
  const ribs: number[] = [];
  for (let k = 0; k < 4; k++) ribs.push(k);
  return (
    <g>
      <defs>
        <linearGradient id="plugBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a2e52" />
          <stop offset=".45" stopColor="#0c1a33" />
          <stop offset="1" stopColor="#050c1c" />
        </linearGradient>
        <linearGradient id="plugShell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d8ea" />
          <stop offset=".5" stopColor="#8197b4" />
          <stop offset="1" stopColor="#4b5f7c" />
        </linearGradient>
        <linearGradient id="plugBoot" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#050c1c" />
          <stop offset=".5" stopColor="#1a2e52" />
          <stop offset="1" stopColor="#050c1c" />
        </linearGradient>
      </defs>

      {/* METAL KILIF — sokete giren kısım */}
      <path
        d={`M ${x0 + 2} ${B - 1} H ${x1 - 2} V ${B + P - 2} L ${x1 - 4} ${B + P} H ${x0 + 4} L ${x0 + 2} ${B + P - 2} Z`}
        fill="url(#plugShell)"
        stroke="rgba(10,20,40,.8)"
        strokeWidth={0.6}
      />
      {/* altın kontaklar */}
      {contacts.map((x) => (
        <rect
          key={x}
          x={x}
          y={B + P - 3.2}
          width={1.4}
          height={2.6}
          rx={0.3}
          fill={lit ? "#ffe39a" : "#d9b25c"}
        />
      ))}

      {/* KABLO KORUMASI (lastik kovan) */}
      <path
        d="M -4.5 -13 L 4.5 -13 L 9 0 L -9 0 Z"
        fill="url(#plugBoot)"
        stroke="rgba(207,230,255,.25)"
        strokeWidth={0.6}
      />
      {ribs.map((k) => (
        <line
          key={k}
          x1={-5 - k * 1.1}
          x2={5 + k * 1.1}
          y1={-10 + k * 3}
          y2={-10 + k * 3}
          stroke="rgba(0,0,0,.6)"
          strokeWidth={0.9}
        />
      ))}

      {/* GÖVDE */}
      <rect
        x={x0}
        y={0}
        width={CONN_W}
        height={B}
        rx={2.5}
        fill="url(#plugBody)"
        stroke="rgba(150,175,205,.9)"
        strokeWidth={1}
      />
      {/* üst kenar yansıması */}
      <rect
        x={x0 + 3}
        y={1.1}
        width={CONN_W - 6}
        height={1.2}
        rx={0.6}
        fill="rgba(207,230,255,.35)"
      />
      {/* tutma tırtıkları */}
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k}>
          <line
            x1={x0 + 4 + k * 2.4}
            x2={x0 + 4 + k * 2.4}
            y1={3.5}
            y2={B - 2.5}
            stroke="rgba(0,0,0,.55)"
            strokeWidth={1}
          />
          <line
            x1={x1 - 4 - k * 2.4}
            x2={x1 - 4 - k * 2.4}
            y1={3.5}
            y2={B - 2.5}
            stroke="rgba(0,0,0,.55)"
            strokeWidth={1}
          />
        </g>
      ))}
      {/* durum LED'i */}
      <rect
        x={-10}
        y={B / 2 - 1}
        width={20}
        height={2}
        rx={1}
        fill={lit ? `rgb(${PLUG_CYAN})` : "rgba(120,150,190,.45)"}
        style={{
          filter: lit
            ? `drop-shadow(0 0 3px rgba(${PLUG_CYAN},1)) drop-shadow(0 0 6px rgba(${PLUG_CYAN},.7))`
            : "none",
          transition: "fill 400ms",
        }}
      />
    </g>
  );
}
