"use client";

import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { RubiksCube, CubeHandle, PlaybackStatus } from "./RubiksCube";
import { parseMoveSequence } from "@/lib/cube/moves";
import { MoveToken } from "@/lib/cube/types";

interface CubeSceneProps {
  cubeRef?: React.RefObject<CubeHandle | null>;
  onStatusChange?: (status: PlaybackStatus) => void;
}

const SPEEDS = [0.5, 1, 2] as const;
type Speed = (typeof SPEEDS)[number];

const DEMO_SEQUENCES: [string, string][] = [
  ["Sexy ×1",  "R U R' U'"],
  ["Sexy ×6",  "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'"],
];

const MOVE_NAMES: Record<string, [string, string]> = {
  "R":  ["Right",  "↻"], "R'": ["Right",  "↺"], "R2": ["Right",  "180°"],
  "L":  ["Left",   "↻"], "L'": ["Left",   "↺"], "L2": ["Left",   "180°"],
  "U":  ["Top",    "↻"], "U'": ["Top",    "↺"], "U2": ["Top",    "180°"],
  "D":  ["Bottom", "↻"], "D'": ["Bottom", "↺"], "D2": ["Bottom", "180°"],
  "F":  ["Front",  "↻"], "F'": ["Front",  "↺"], "F2": ["Front",  "180°"],
  "B":  ["Back",   "↻"], "B'": ["Back",   "↺"], "B2": ["Back",   "180°"],
};

function MoveIndicator({ move, moveNumber, total }: {
  move: MoveToken;
  moveNumber: number;
  total: number;
}) {
  const [face, dir] = MOVE_NAMES[move] ?? [move, ""];
  return (
    <div className="animate-in fade-in slide-in-from-top-3 duration-150 flex flex-col items-center gap-1.5">
      <div className="bg-black/70 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-3 text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-4xl font-mono font-bold text-white tracking-tight">{move}</span>
          <span className="text-2xl text-white/50">{dir}</span>
        </div>
        <p className="text-white/40 text-xs mt-0.5 tracking-wide">{face}</p>
      </div>
      {total > 0 && (
        <p className="text-white/30 text-xs tabular-nums">
          {moveNumber} / {total}
        </p>
      )}
    </div>
  );
}

function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20"
      onClick={onClose}
    >
      <div
        className="animate-in fade-in zoom-in-95 duration-150 bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-xs w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-sm">Move Notation</h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <p className="text-white/30 uppercase tracking-widest text-[10px] mb-2">Faces</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {([
                ["U", "Top (White)"],
                ["D", "Bottom (Yellow)"],
                ["F", "Front (Green)"],
                ["B", "Back (Blue)"],
                ["L", "Left (Orange)"],
                ["R", "Right (Red)"],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex gap-2.5 items-center">
                  <span className="font-mono text-white w-4 shrink-0">{k}</span>
                  <span className="text-white/50">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-white/30 uppercase tracking-widest text-[10px] mb-2">Modifiers</p>
            <div className="space-y-1.5">
              {([
                ["R",  "Clockwise ↻"],
                ["R'", "Counter-clockwise ↺"],
                ["R2", "Half turn 180°"],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex gap-2.5 items-center">
                  <span className="font-mono text-white w-6 shrink-0">{k}</span>
                  <span className="text-white/50">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-1.5">
            <p className="text-white/30 uppercase tracking-widest text-[10px] mb-2">Demo sequences</p>
            <div className="flex gap-2.5 items-start">
              <span className="font-mono text-white shrink-0 text-[11px]">Sexy ×6</span>
              <span className="text-white/50">The "sexy move" (R U R' U') is classic cube slang for this satisfying 4-move sequence. Repeated 6 times it cycles back to solved.</span>
            </div>
          </div>

          <p className="border-t border-white/10 pt-4 text-white/20 text-[10px] leading-relaxed">
            Kociemba's algorithm solves any cube position in ≤ 20 moves.
          </p>
        </div>
      </div>
    </div>
  );
}

export function CubeScene({ cubeRef: externalRef, onStatusChange: onStatusChangeProp }: CubeSceneProps) {
  const internalRef = useRef<CubeHandle>(null);
  const cubeRef = externalRef ?? internalRef;
  const [status, setStatus] = useState<PlaybackStatus>({
    paused: false,
    isAnimating: false,
    queueLength: 0,
    currentMove: null,
  });

  const totalRef = useRef(0);
  const [total, setTotal] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const handleStatusChange = (s: PlaybackStatus) => {
    setStatus(s);
    onStatusChangeProp?.(s);

    const count = s.queueLength + (s.isAnimating ? 1 : 0);
    if (count > 0) {
      if (count > totalRef.current) {
        totalRef.current = count;
        setTotal(count);
      }
    } else {
      totalRef.current = 0;
      setTotal(0);
    }
  };

  const [speed, setSpeed] = useState<Speed>(1);

  const queue = (notation: string) =>
    cubeRef.current?.queueMoves(parseMoveSequence(notation));

  const handleSpeed = (n: Speed) => {
    setSpeed(n);
    cubeRef.current?.setSpeed(n);
  };

  const isActive = status.isAnimating || status.queueLength > 0;
  const moveNumber = total > 0 && status.currentMove ? total - status.queueLength : 0;
  const progress = total > 0 ? (moveNumber / total) * 100 : 0;

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [5, 4, 5], fov: 40 }}
        style={{ background: "#111827" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1} />
        <directionalLight position={[-5, -3, -5]} intensity={0.3} />
        <RubiksCube ref={cubeRef} onStatusChange={handleStatusChange} />
        <OrbitControls enablePan={false} dampingFactor={0.1} enableDamping />
      </Canvas>

      {/* Progress bar */}
      {total > 0 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-10">
          <div
            className="h-full bg-blue-500 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Move indicator */}
      {status.currentMove && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <MoveIndicator
            key={`${total}-${moveNumber}`}
            move={status.currentMove}
            moveNumber={moveNumber}
            total={total}
          />
        </div>
      )}

      {/* Info button */}
      <button
        onClick={() => setShowInfo(true)}
        title="Move notation reference"
        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white text-sm flex items-center justify-center transition-colors"
      >
        ⓘ
      </button>

      {/* Info modal */}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        {/* Queue indicator */}
        {isActive && (
          <p className="text-xs text-white/50">
            {status.isAnimating ? "animating" : "paused"} · {status.queueLength} move
            {status.queueLength !== 1 ? "s" : ""} remaining
          </p>
        )}

        <div className="flex gap-2">
          {/* Demo sequences */}
          {DEMO_SEQUENCES.map(([label, moves]) => (
            <Btn key={label} onClick={() => queue(moves)}>
              {label}
            </Btn>
          ))}

          <div className="w-px bg-white/20" />

          {/* Play / Pause */}
          {status.paused ? (
            <Btn onClick={() => cubeRef.current?.resume()}>▶ Play</Btn>
          ) : (
            <Btn onClick={() => cubeRef.current?.pause()} disabled={!isActive}>
              ⏸ Pause
            </Btn>
          )}

          {/* Step */}
          <Btn
            onClick={() => cubeRef.current?.step()}
            disabled={!status.paused || status.queueLength === 0}
          >
            ⏭ Step
          </Btn>

          {/* Reset */}
          <Btn onClick={() => cubeRef.current?.reset()}>↺ Reset</Btn>

          <div className="w-px bg-white/20" />

          {/* Speed */}
          {SPEEDS.map((n) => (
            <Btn key={n} onClick={() => handleSpeed(n)} active={speed === n}>
              {n}×
            </Btn>
          ))}
        </div>
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded px-3 py-1.5 text-sm text-white backdrop-blur transition-all",
        "disabled:cursor-not-allowed disabled:opacity-30",
        "active:scale-95",
        active
          ? "bg-white/30 ring-1 ring-white/50"
          : "bg-white/10 hover:bg-white/20",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
