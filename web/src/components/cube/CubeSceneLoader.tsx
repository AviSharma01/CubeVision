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
  annotations?: { stage: string; label: string }[] | null;
}

export function CubeSceneLoader({ cubeRef, onStatusChange, annotations }: Props) {
  return (
    <CubeScene
      cubeRef={cubeRef}
      onStatusChange={onStatusChange}
      annotations={annotations}
    />
  );
}
