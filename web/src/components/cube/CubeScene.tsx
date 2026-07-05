"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Info, X } from "lucide-react";
import { RubiksCube, CubeHandle, PlaybackStatus } from "./RubiksCube";
import { Button } from "@/components/ui/Button";
import { parseMoveSequence } from "@/lib/cube/moves";
import { MoveToken } from "@/lib/cube/types";

interface CubeSceneProps {
  cubeRef?: React.RefObject<CubeHandle | null>;
  onStatusChange?: (status: PlaybackStatus) => void;
}

const SPEEDS = [0.5, 1, 2] as const;
type Speed = (typeof SPEEDS)[number];

const DEMO_SEQUENCES: [string, string][] = [
  ["Sexy ×1", "R U R' U'"],
  ["Sexy ×6", "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'"],
];

const MOVE_NAMES: Record<string, [string, string]> = {
  "R":  ["Right",  "↻"], "R'": ["Right",  "↺"], "R2": ["Right",  "180°"],
  "L":  ["Left",   "↻"], "L'": ["Left",   "↺"], "L2": ["Left",   "180°"],
  "U":  ["Top",    "↻"], "U'": ["Top",    "↺"], "U2": ["Top",    "180°"],
  "D":  ["Bottom", "↻"], "D'": ["Bottom", "↺"], "D2": ["Bottom", "180°"],
  "F":  ["Front",  "↻"], "F'": ["Front",  "↺"], "F2": ["Front",  "180°"],
  "B":  ["Back",   "↻"], "B'": ["Back",   "↺"], "B2": ["Back",   "180°"],
};

function MoveIndicator({ move }: { move: MoveToken }) {
  const [face, dir] = MOVE_NAMES[move] ?? [move, ""];
  return (
    <div className="animate-in fade-in slide-in-from-top-3 duration-150 flex flex-col items-center">
      <div className="bg-panel/80 backdrop-blur-sm border border-hairline rounded-2xl px-6 py-3 text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-4xl font-mono font-bold tracking-tight">{move}</span>
          <span className="text-2xl text-white/50">{dir}</span>
        </div>
        <p className="text-white/40 text-xs mt-0.5 tracking-wide">{face}</p>
      </div>
    </div>
  );
}

/**
 * Solution tape — the full move sequence as a horizontal strip.
 * Completed moves dim, the current move is highlighted, upcoming moves wait
 * to the right. Auto-scrolls to keep the current move centred.
 */
function MoveTape({ status }: { status: PlaybackStatus }) {
  const activeRef = useRef<HTMLSpanElement>(null);
  const doneCount = status.history.length;

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [doneCount, status.currentMove]);

  // While undoing, history's last token and pending's first token are the
  // same move mid-flight (stepBack() unshifts it before the reverse
  // animation completes) — collapse that pair into a single "current" token
  // instead of showing it twice.
  const tokens: { move: MoveToken; state: "done" | "current" | "pending" }[] =
    status.isUndo
      ? [
          ...status.history.slice(0, -1).map((m) => ({ move: m, state: "done" as const })),
          ...status.history.slice(-1).map((m) => ({ move: m, state: "current" as const })),
          ...status.pending.slice(1).map((m) => ({ move: m, state: "pending" as const })),
        ]
      : [
          ...status.history.map((m) => ({ move: m, state: "done" as const })),
          ...(status.currentMove
            ? [{ move: status.currentMove, state: "current" as const }]
            : []),
          ...status.pending.map((m) => ({ move: m, state: "pending" as const })),
        ];

  if (tokens.length === 0) return null;

  return (
    <div className="no-scrollbar max-w-[min(90vw,42rem)] overflow-x-auto rounded-xl border border-hairline bg-panel/80 px-3 py-2 backdrop-blur-sm">
      <div className="flex w-max items-center gap-1 font-mono text-sm">
        {tokens.map(({ move, state }, i) => (
          <span
            key={i}
            ref={state === "current" ? activeRef : undefined}
            className={[
              "rounded-md px-1.5 py-0.5 tabular-nums transition-colors duration-200",
              state === "done" && "text-white/30",
              state === "current" && "bg-white font-bold text-black",
              state === "pending" && "text-white/70",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {move}
          </span>
        ))}
      </div>
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
        className="animate-in fade-in zoom-in-95 duration-150 bg-panel border border-hairline rounded-2xl p-6 max-w-xs w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Move notation</h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={16} />
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
                  <span className="font-mono w-4 shrink-0">{k}</span>
                  <span className="text-white/50">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-hairline pt-4">
            <p className="text-white/30 uppercase tracking-widest text-[10px] mb-2">Modifiers</p>
            <div className="space-y-1.5">
              {([
                ["R",  "Clockwise ↻"],
                ["R'", "Counter-clockwise ↺"],
                ["R2", "Half turn 180°"],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex gap-2.5 items-center">
                  <span className="font-mono w-6 shrink-0">{k}</span>
                  <span className="text-white/50">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-hairline pt-4 space-y-1.5">
            <p className="text-white/30 uppercase tracking-widest text-[10px] mb-2">Demo sequences</p>
            <div className="flex gap-2.5 items-start">
              <span className="font-mono shrink-0 text-[11px]">Sexy ×6</span>
              <span className="text-white/50">The &quot;sexy move&quot; (R U R&apos; U&apos;) is classic cube slang for this satisfying 4-move sequence. Repeated 6 times it cycles back to solved.</span>
            </div>
          </div>

          <p className="border-t border-hairline pt-4 text-white/20 text-[10px] leading-relaxed">
            Kociemba&apos;s algorithm solves any cube position in ≤ 20 moves.
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
    isUndo: false,
    history: [],
    pending: [],
  });
  const [showInfo, setShowInfo] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);

  const handleStatusChange = (s: PlaybackStatus) => {
    setStatus(s);
    onStatusChangeProp?.(s);
  };

  const queue = (notation: string) =>
    cubeRef.current?.queueMoves(parseMoveSequence(notation));

  const handleSpeed = (n: Speed) => {
    setSpeed(n);
    cubeRef.current?.setSpeed(n);
  };

  const isActive = status.isAnimating || status.queueLength > 0;
  const done = status.history.length;
  const total = done + (status.currentMove ? 1 : 0) + status.queueLength;
  const moveNumber = done + (status.currentMove ? 1 : 0);
  const progress = total > 0 ? (moveNumber / total) * 100 : 0;

  return (
    <div
      className="relative w-full h-full"
      style={{
        background:
          "radial-gradient(ellipse 80% 70% at 50% 40%, #1b1b20 0%, #0b0b0c 70%)",
      }}
    >
      <Canvas camera={{ position: [5, 4, 5], fov: 40 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 8, 4]} intensity={1.1} />
        <directionalLight position={[-6, -2, -5]} intensity={0.3} />
        <RubiksCube ref={cubeRef} onStatusChange={handleStatusChange} />
        <ContactShadows position={[0, -2.4, 0]} opacity={0.4} scale={12} blur={2.4} far={4} />
        <OrbitControls enablePan={false} dampingFactor={0.1} enableDamping />
      </Canvas>

      {/* Progress bar */}
      {isActive && total > 0 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-10">
          <div
            className="h-full bg-white/70 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Current move indicator */}
      {status.currentMove && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <MoveIndicator key={`${total}-${moveNumber}`} move={status.currentMove} />
        </div>
      )}

      {/* Info button */}
      <button
        onClick={() => setShowInfo(true)}
        title="Move notation reference"
        aria-label="Move notation reference"
        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/50 hover:text-white flex items-center justify-center transition-colors"
      >
        <Info size={15} />
      </button>

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

      {/* Bottom cluster: tape + transport controls */}
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2.5">
        <MoveTape status={status} />

        {isActive && (
          <p className="text-xs text-white/40 tabular-nums">
            {status.isAnimating ? "playing" : "paused"} · move {moveNumber} of {total}
          </p>
        )}

        <div className="flex items-center gap-2">
          {DEMO_SEQUENCES.map(([label, moves]) => (
            <Button key={label} onClick={() => queue(moves)}>
              {label}
            </Button>
          ))}

          <div className="h-5 w-px bg-hairline" />

          {status.paused ? (
            <Button onClick={() => cubeRef.current?.resume()}>
              <Play size={14} /> Play
            </Button>
          ) : (
            <Button onClick={() => cubeRef.current?.pause()} disabled={!isActive}>
              <Pause size={14} /> Pause
            </Button>
          )}

          <Button
            onClick={() => cubeRef.current?.stepBack()}
            disabled={!status.paused || status.isAnimating || status.history.length === 0}
            title="Undo the last move, then pause"
          >
            <SkipBack size={14} /> Back
          </Button>

          <Button
            onClick={() => cubeRef.current?.step()}
            disabled={!status.paused || status.queueLength === 0}
            title="Play the next move, then pause"
          >
            <SkipForward size={14} /> Step
          </Button>

          <Button onClick={() => cubeRef.current?.reset()} title="Back to the starting position">
            <RotateCcw size={14} /> Reset
          </Button>

          <div className="h-5 w-px bg-hairline" />

          {SPEEDS.map((n) => (
            <Button key={n} onClick={() => handleSpeed(n)} active={speed === n} className="tabular-nums">
              {n}×
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
