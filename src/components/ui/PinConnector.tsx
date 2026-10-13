type PinConnectorProps = {
  /** Sütun sayısı (varsayılan: 12) */
  pins?: number;
  /** Yerleşim yönü */
  orientation?: "horizontal" | "vertical";
};

/* Gümüş/metalik dış çerçeve — çok noktalı gradyan ile "fırçalanmış metal" hissi */
const FRAME_BG =
  "linear-gradient(135deg, #d8dde3 0%, #9aa3ad 15%, #f4f6f8 30%, #7d8792 45%, #c3c9d0 60%, #6b7480 78%, #eef0f2 90%, #8b93a0 100%)";

const FRAME_SHADOW =
  "0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 1px rgba(0,0,0,0.4)";

const PIN_BG =
  "linear-gradient(to bottom, #f2e4c8 0%, #c9a86a 40%, #8a6a3a 100%)";

export default function PinConnector({
  pins = 12,
  orientation = "horizontal",
}: PinConnectorProps) {
  const isHorizontal = orientation === "horizontal";
  const pinIndexes = Array.from({ length: pins }, (_, i) => i);

  return (
    <div
      className="relative inline-flex items-center rounded-[3px]"
      style={{
        background: FRAME_BG,
        padding: isHorizontal ? "7px 9px" : "9px 7px",
        boxShadow: FRAME_SHADOW,
      }}
    >
      {/* Mavi iç yüzey (gerçek DB konnektörlerdeki plastik gövde) */}
      <div
        className={`inline-flex gap-1.75 rounded-[1px] ${isHorizontal ? "flex-col" : "flex-row"}`}
        style={{
          background: "linear-gradient(160deg, #3a6ea8, #1c3a5e)",
          padding: isHorizontal ? "8px 10px" : "10px 8px",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        {/* İki sıra pin */}
        {[0, 1].map((row) => (
          <div
            key={row}
            className={`flex gap-1 ${isHorizontal ? "flex-row" : "flex-col"}`}
          >
            {pinIndexes.map((i) => (
              <span
                key={i}
                className="block rounded-full"
                style={{
                  width: isHorizontal ? "3px" : "9px",
                  height: isHorizontal ? "9px" : "3px",
                  background: PIN_BG,
                  boxShadow:
                    "0 0 1px rgba(0,0,0,0.6), 1px 0 1px rgba(0,0,0,0.3)",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
