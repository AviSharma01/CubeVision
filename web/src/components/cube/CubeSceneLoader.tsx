"use client";

import dynamic from "next/dynamic";

const CubeScene = dynamic(
  () => import("./CubeScene").then((m) => m.CubeScene),
  { ssr: false }
);

export function CubeSceneLoader() {
  return <CubeScene />;
}
