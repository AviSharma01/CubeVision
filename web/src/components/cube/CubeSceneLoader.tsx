"use client";

import dynamic from "next/dynamic";
import { CubeState } from "@/lib/cube/types";

const CubeScene = dynamic(
  () => import("./CubeScene").then((m) => m.CubeScene),
  { ssr: false }
);

interface Props {
  state?: CubeState;
}

export function CubeSceneLoader({ state }: Props) {
  return <CubeScene state={state} />;
}
