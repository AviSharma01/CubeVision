"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { RubiksCube } from "./RubiksCube";
import { CubeState } from "@/lib/cube/types";

interface Props {
  state?: CubeState;
}

export function CubeScene({ state }: Props) {
  return (
    <Canvas
      camera={{ position: [5, 4, 5], fov: 40 }}
      style={{ background: "#111827" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1} />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} />
      <RubiksCube state={state} />
      <OrbitControls enablePan={false} dampingFactor={0.1} enableDamping />
    </Canvas>
  );
}
