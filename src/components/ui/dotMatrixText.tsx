import { DOT_FONT } from "./DotFont";

type DotMatrixTextProps = {
  text: string;
  dotSize?: number;
  gap?: number;
  color?: string;
};

export default function DotMatrixText({
  text,
  dotSize = 2,
  gap = 1,
  color = "#c9a86a",
}: DotMatrixTextProps) {
  const letters = text.toUpperCase().split("");
  const dotWidth = Math.max(1, Math.round(dotSize / 2.5));

  return (
    <div className="inline-flex" style={{ gap: gap * 2 }}>
      {letters.map((letter, letterIndex) => {
        const pattern = DOT_FONT[letter] ?? DOT_FONT[" "];

        return (
          <div key={letterIndex} className="flex flex-col" style={{ gap }}>
            {pattern.map((row, rowIndex) => (
              <div key={rowIndex} className="flex" style={{ gap }}>
                {row.split("").map((bit, colIndex) => (
                  <span
                    key={colIndex}
                    className="block rounded-full"
                    style={{
                      width: dotWidth,
                      height: dotSize,
                      background: bit === "1" ? color : "transparent",
                      boxShadow: bit === "1" ? `0 0 3px ${color}` : "none",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
