"use client";

import dynamic from "next/dynamic";
import { CubeHandle, PlaybackStatus } from "./RubiksCube";

const CubeScene = dynamic(
  () => import("./CubeScene").then((m) => m.CubeScene),
  { ssr: false }
);

interface Props {
  cubeRef?: React.RefObject<CubeHandle | null>;
  onStatusChange?: (status: PlaybackStatus) => void;
}

export function CubeSceneLoader({ cubeRef, onStatusChange }: Props) {
  return <CubeScene cubeRef={cubeRef} onStatusChange={onStatusChange} />;
}
