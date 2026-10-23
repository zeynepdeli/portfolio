/* =========================================================
   TUVAL UYUMLULUĞU
   ctx.roundRect yalnızca Safari 16+ / Firefox 112+ / Chrome 99+'da var.
   Eski iPhone'larda (iOS 15) açılış animasyonu bu satırda hata verip
   tamamen duruyordu. Yoksa basit bir eşdeğeri eklenir.
========================================================= */

type RR = (
  x: number,
  y: number,
  w: number,
  h: number,
  r?: number | DOMPointInit | (number | DOMPointInit)[],
) => void;

if (typeof window !== "undefined") {
  const proto = CanvasRenderingContext2D.prototype as CanvasRenderingContext2D & {
    roundRect?: RR;
  };
  if (typeof proto.roundRect !== "function") {
    proto.roundRect = function (this: CanvasRenderingContext2D, x, y, w, h, r = 0) {
      const rad = typeof r === "number" ? r : 0;
      const k = Math.max(0, Math.min(rad, Math.abs(w) / 2, Math.abs(h) / 2));
      this.moveTo(x + k, y);
      this.arcTo(x + w, y, x + w, y + h, k);
      this.arcTo(x + w, y + h, x, y + h, k);
      this.arcTo(x, y + h, x, y, k);
      this.arcTo(x, y, x + w, y, k);
      this.closePath();
    } as RR;
  }
}

export {};
