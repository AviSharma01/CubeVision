"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import {
  CubeState,
  Face,
  Color,
  FaceId,
  FACE_IDS,
  SOLVED_STATE,
  COLOR_HEX,
} from "@/lib/cube/types";
import { CubeHandle } from "./RubiksCube";
import { FaceGrid } from "./FaceGrid";
import { Button } from "@/components/ui/Button";
import { ArrowDownToLine, RotateCcw } from "lucide-react";

const COLORS: Color[] = ["W", "Y", "G", "B", "O", "R"];

const COLOR_LABELS: Record<Color, string> = {
  W: "White", Y: "Yellow", G: "Green", B: "Blue", O: "Orange", R: "Red",
};

// Position in the 4-col × 3-row cross grid [col, row] (0-indexed)
const FACE_LAYOUT: Record<FaceId, [number, number]> = {
  U: [1, 0],
  L: [0, 1],
  F: [1, 1],
  R: [2, 1],
  B: [3, 1],
  D: [1, 2],
};

export interface CubeEntryHandle {
  syncFromCube(): void;
}

export type SolveMethod = "kociemba" | "beginner";

const METHODS: { id: SolveMethod; name: string; caption: string }[] = [
  { id: "kociemba", name: "Kociemba", caption: "~20 moves · computer method" },
  {
    id: "beginner",
    name: "Beginner",
    caption: "~175 moves · ~35 explained steps · human method",
  },
];

interface Props {
  cubeRef: React.RefObject<CubeHandle | null>;
  solveCube: (state: CubeState) => Promise<string | null>;
  loadCube: (state: CubeState) => void;
  method: SolveMethod;
  onMethodChange: (method: SolveMethod) => void;
}

export const CubeEntry = forwardRef<CubeEntryHandle, Props>(
function CubeEntry({ cubeRef, solveCube, loadCube, method, onMethodChange }, ref) {
  const [state, setState] = useState<CubeState>(SOLVED_STATE);
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

  // Count how many stickers of each color are set
  const counts = COLORS.reduce((acc, c) => {
    acc[c] = FACE_IDS.flatMap((f) => state[f]).filter((s) => s === c).length;
    return acc;
  }, {} as Record<Color, number>);

  const isValid = COLORS.every((c) => counts[c] === 9);

  const syncFromCube = () => {
    const current = cubeRef.current?.getState();
    if (current) {
      setState(current);
      setError(null);
    }
  };

  useImperativeHandle(ref, () => ({ syncFromCube }));

  const handleSolve = async () => {
    setLoading(true);
    setError(null);
    const err = await solveCube(state);
    if (err) setError(err);
    setLoading(false);
  };

  const handleReset = () => {
    setState(SOLVED_STATE);
    setError(null);
    loadCube(SOLVED_STATE);
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Color palette */}
      <div className="flex gap-2 justify-center">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setSelected(c)}
            title={COLOR_LABELS[c]}
            style={{ backgroundColor: COLOR_HEX[c] }}
            className={[
              "w-8 h-8 rounded-full transition-transform active:scale-95",
              selected === c
                ? "ring-2 ring-white ring-offset-2 ring-offset-panel scale-110"
                : "opacity-60 hover:opacity-90",
            ].join(" ")}
          />
        ))}
      </div>

      {/* Sticker counts per color */}
      <div className="flex gap-1.5 flex-wrap justify-center">
        {COLORS.map((c) => (
          <span
            key={c}
            className={[
              "text-xs px-1.5 py-0.5 rounded font-mono",
              counts[c] === 9
                ? "text-white/30"
                : counts[c] > 9
                ? "text-red-400"
                : "text-yellow-400",
            ].join(" ")}
          >
            {c}:{counts[c]}
          </span>
        ))}
      </div>

      {/* Face net — 4-col × 3-row cross */}
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: "repeat(4, auto)",
          gridTemplateRows: "repeat(3, auto)",
        }}
      >
        {FACE_IDS.map((faceId) => {
          const [col, row] = FACE_LAYOUT[faceId];
          return (
            <div key={faceId} style={{ gridColumn: col + 1, gridRow: row + 1 }}>
              <FaceGrid
                faceId={faceId}
                stickers={state[faceId]}
                onStickerClick={(i) => paint(faceId, i)}
              />
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 bg-red-400/10 rounded p-2 leading-relaxed">
          {error}
        </p>
      )}

      {/* Solve method — choice applies at Solve time */}
      <div className="flex gap-2">
        {METHODS.map((m) => (
          <Button
            key={m.id}
            active={method === m.id}
            onClick={() => onMethodChange(m.id)}
            className="flex-1"
          >
            <span className="flex flex-col items-center py-0.5">
              <span>{m.name}</span>
              <span className="text-[10px] font-normal leading-tight text-white/40">
                {m.caption}
              </span>
            </span>
          </Button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={handleSolve}
          disabled={loading || !isValid}
          className="flex-1"
        >
          {loading ? "Solving…" : "Solve"}
        </Button>
        <Button onClick={syncFromCube} title="Copy the current 3D cube state into this panel">
          <ArrowDownToLine size={14} /> Cube
        </Button>
        <Button onClick={handleReset}>
          <RotateCcw size={14} /> Reset
        </Button>
      </div>
    </div>
  );
});
