"use client";

import { Color, FaceId, COLOR_HEX, FACE_COLORS } from "@/lib/cube/types";

interface Props {
  faceId: FaceId;
  stickers: Color[]; // 9 stickers, index 0–8
  onStickerClick: (index: number) => void;
  /** Indices to highlight with a yellow ring (low-confidence detections) */
  highlightIndices?: Set<number>;
}

export function FaceGrid({ faceId, stickers, onStickerClick, highlightIndices }: Props) {
  const centerColor = FACE_COLORS[faceId];

  return (
    <div className="flex flex-col gap-1">
      <p className="text-center text-xs text-white/40 font-mono">{faceId}</p>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(3, 1.75rem)", gridTemplateRows: "repeat(3, 1.75rem)" }}>
        {stickers.map((color, i) => {
          const isCenter = i === 4;
          const isLowConf = !isCenter && highlightIndices?.has(i);
          return (
            <button
              key={i}
              onClick={() => !isCenter && onStickerClick(i)}
              disabled={isCenter}
              title={isCenter ? centerColor : undefined}
              style={{ backgroundColor: COLOR_HEX[color] }}
              className={[
                "w-7 h-7 rounded-sm transition-[transform,background-color] duration-200",
                isCenter
                  ? "cursor-default ring-1 ring-white/30"
                  : "hover:scale-110 active:scale-95 cursor-pointer",
                isLowConf
                  ? "ring-2 ring-yellow-400"
                  : !isCenter
                  ? "hover:ring-1 hover:ring-white/50"
                  : "",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}
