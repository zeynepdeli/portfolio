"use client";

import type { ReactNode } from "react";

/**
 * BİTMİŞ HAL SARMALAYICISI
 * İçindeki her şeyin CSS animasyon ve geçişlerini anında bitirir:
 * sayfa açıldığında hiçbir şey oynamaz, her öğe animasyonunun SON
 * karesinde sabit durur. Header menüsüyle gidilen sayfalarda kullanılır.
 */
export default function FinalState({ children }: { children: ReactNode }) {
  return (
    <div className="final-state h-full w-full">
      <style>{`
        .final-state *,
        .final-state *::before,
        .final-state *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `}</style>
      {children}
    </div>
  );
}
