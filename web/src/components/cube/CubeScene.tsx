"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { RubiksCube, CubeHandle } from "./RubiksCube";
import { parseMoveSequence } from "@/lib/cube/moves";

export function CubeScene() {
  const cubeRef = useRef<CubeHandle>(null);

  const queue = (notation: string) =>
    cubeRef.current?.queueMoves(parseMoveSequence(notation));

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [5, 4, 5], fov: 40 }}
        style={{ background: "#111827" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1} />
        <directionalLight position={[-5, -3, -5]} intensity={0.3} />
        <RubiksCube ref={cubeRef} />
        <OrbitControls enablePan={false} dampingFactor={0.1} enableDamping />
      </Canvas>

      {}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {(
          [
            ["Sexy ×1", "R U R' U'"],
            ["Sexy ×6", "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'"],
            ["Scramble", "R U R' F' R U R' U' R' F R2 U' R'"],
          ] as [string, string][]
        ).map(([label, moves]) => (
          <button
            key={label}
            onClick={() => queue(moves)}
            className="rounded bg-white/10 px-3 py-1.5 text-sm text-white backdrop-blur hover:bg-white/20 active:scale-95 transition-all"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
