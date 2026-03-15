"use client";

import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { RubiksCube, CubeHandle, PlaybackStatus } from "./RubiksCube";
import { parseMoveSequence } from "@/lib/cube/moves";

interface CubeSceneProps {
  cubeRef?: React.RefObject<CubeHandle | null>;
}

const SPEEDS = [0.5, 1, 2] as const;
type Speed = (typeof SPEEDS)[number];

const DEMO_SEQUENCES: [string, string][] = [
  ["Sexy ×1",  "R U R' U'"],
  ["Sexy ×6",  "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'"],
  ["Scramble", "R U R' F' R U R' U' R' F R2 U' R'"],
];

export function CubeScene({ cubeRef: externalRef }: CubeSceneProps) {
  const internalRef = useRef<CubeHandle>(null);
  const cubeRef = externalRef ?? internalRef;
  const [status, setStatus] = useState<PlaybackStatus>({
    paused: false,
    isAnimating: false,
    queueLength: 0,
  });
  const [speed, setSpeed] = useState<Speed>(1);

  const queue = (notation: string) =>
    cubeRef.current?.queueMoves(parseMoveSequence(notation));

  const handleSpeed = (n: Speed) => {
    setSpeed(n);
    cubeRef.current?.setSpeed(n);
  };

  const isActive = status.isAnimating || status.queueLength > 0;

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [5, 4, 5], fov: 40 }}
        style={{ background: "#111827" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1} />
        <directionalLight position={[-5, -3, -5]} intensity={0.3} />
        <RubiksCube ref={cubeRef} onStatusChange={setStatus} />
        <OrbitControls enablePan={false} dampingFactor={0.1} enableDamping />
      </Canvas>

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

          {/* Step — only useful when paused and moves remain */}
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
