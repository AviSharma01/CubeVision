"use client";

import dynamic from "next/dynamic";
import { CubeHandle } from "./RubiksCube";

const CubeScene = dynamic(
  () => import("./CubeScene").then((m) => m.CubeScene),
  { ssr: false }
);

interface Props {
  cubeRef?: React.RefObject<CubeHandle | null>;
}

export function CubeSceneLoader({ cubeRef }: Props) {
  return <CubeScene cubeRef={cubeRef} />;
}
