"use client";

import { useState } from "react";
import {
  CubeState,
  Face,
  Color,
  FaceId,
  FACE_IDS,
  COLOR_HEX,
  MoveToken,
  SOLVED_STATE,
} from "@/lib/cube/types";
import { CubeHandle } from "../RubiksCube";
import { FaceGrid } from "../FaceGrid";
import { JobFaces } from "./ProcessingStep";

const COLORS: Color[] = ["W", "Y", "G", "B", "O", "R"];

const COLOR_LABELS: Record<Color, string> = {
  W: "White", Y: "Yellow", G: "Green", B: "Blue", O: "Orange", R: "Red",
};

const LOW_CONFIDENCE_THRESHOLD = 0.7;

const FACE_LAYOUT: Record<FaceId, [number, number]> = {
  U: [1, 0], L: [0, 1], F: [1, 1], R: [2, 1], B: [3, 1], D: [1, 2],
};

function jobFacesToCubeState(faces: JobFaces): CubeState {
  const state = { ...SOLVED_STATE };
  for (const faceId of FACE_IDS) {
    const face = faces[faceId];
    if (!face) continue;
    state[faceId] = face.stickers.map((s) => s.color as Color) as Face;
  }
  return state;
}

function lowConfidenceIndices(faces: JobFaces, faceId: FaceId): Set<number> {
  const result = new Set<number>();
  const face = faces[faceId];
  if (!face) return result;
  face.stickers.forEach((s, i) => {
    if (s.confidence < LOW_CONFIDENCE_THRESHOLD) result.add(i);
  });
  return result;
}

interface Props {
  faces: JobFaces;
  cubeRef: React.RefObject<CubeHandle | null>;
  onStartOver: () => void;
}

export function ReviewStep({ faces, cubeRef, onStartOver }: Props) {
  const [state, setState] = useState<CubeState>(() => jobFacesToCubeState(faces));
  const [selected, setSelected] = useState<Color>("W");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paint = (faceId: FaceId, index: number) => {
    setState((prev) => {
      const face = [...prev[faceId]] as Face;
      face[index] = selected;
      return { ...prev, [faceId]: face };
    });
    setError(null);
  };

  const counts = COLORS.reduce((acc, c) => {
    acc[c] = FACE_IDS.flatMap((f) => state[f]).filter((s) => s === c).length;
    return acc;
  }, {} as Record<Color, number>);

  const isValid = COLORS.every((c) => counts[c] === 9);

  // Count total low-confidence stickers (centers are fixed so skip index 4)
  const totalLowConf = FACE_IDS.reduce((sum, faceId) => {
    const low = lowConfidenceIndices(faces, faceId);
    low.delete(4); // center can't be wrong
    return sum + low.size;
  }, 0);

  const handleSolve = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiBase}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cube_state: state }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail ?? `Server error ${res.status}`);
      }
      const { moves } = (await res.json()) as { moves: MoveToken[]; move_count: number };
      cubeRef.current?.loadState(state);
      cubeRef.current?.queueMoves(moves);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {totalLowConf > 0 && (
        <p className="text-xs text-yellow-400 bg-yellow-400/10 rounded p-2 leading-relaxed">
          {totalLowConf} sticker{totalLowConf !== 1 ? "s" : ""} flagged as low confidence.
          Yellow-bordered cells may be wrong — click to correct.
        </p>
      )}

      {/* Color palette */}
      <div className="flex gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setSelected(c)}
            title={COLOR_LABELS[c]}
            style={{ backgroundColor: COLOR_HEX[c] }}
            className={[
              "w-8 h-8 rounded-full transition-transform active:scale-95",
              selected === c
                ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110"
                : "opacity-60 hover:opacity-90",
            ].join(" ")}
          />
        ))}
      </div>

      {/* Sticker counts */}
      <div className="flex gap-1.5 flex-wrap">
        {COLORS.map((c) => (
          <span
            key={c}
            className={[
              "text-xs px-1.5 py-0.5 rounded font-mono",
              counts[c] === 9 ? "text-white/30" : counts[c] > 9 ? "text-red-400" : "text-yellow-400",
            ].join(" ")}
          >
            {c}:{counts[c]}
          </span>
        ))}
      </div>

      {/* Face net */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(4, auto)", gridTemplateRows: "repeat(3, auto)" }}
      >
        {FACE_IDS.map((faceId) => {
          const [col, row] = FACE_LAYOUT[faceId];
          const lowConf = lowConfidenceIndices(faces, faceId);
          return (
            <div key={faceId} style={{ gridColumn: col + 1, gridRow: row + 1 }}>
              <FaceGrid
                faceId={faceId}
                stickers={state[faceId]}
                onStickerClick={(i) => paint(faceId, i)}
                highlightIndices={lowConf}
              />
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-400/10 rounded p-2 leading-relaxed">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSolve}
          disabled={loading || !isValid}
          className="flex-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 text-sm text-white transition-colors active:scale-95"
        >
          {loading ? "Solving…" : "Solve & Play →"}
        </button>
        <button
          onClick={onStartOver}
          className="rounded bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm text-white transition-colors active:scale-95"
        >
          Retake
        </button>
      </div>
    </div>
  );
}
