"use client";

import { useMemo } from "react";
import { CubeState, SOLVED_STATE } from "@/lib/cube/types";
import { buildCubieColors } from "@/lib/cube/stickers";
import { Cubie } from "./Cubie";

interface Props {
  state?: CubeState;
}

const POSITIONS: [number, number, number][] = [];
for (const x of [-1, 0, 1])
  for (const y of [-1, 0, 1])
    for (const z of [-1, 0, 1])
      POSITIONS.push([x, y, z]);

export function RubiksCube({ state = SOLVED_STATE }: Props) {
  const cubieColors = useMemo(() => buildCubieColors(state), [state]);

  return (
    <group>
      {POSITIONS.map(([x, y, z]) => (
        <Cubie
          key={`${x},${y},${z}`}
          position={[x, y, z]}
          colors={cubieColors.get(`${x},${y},${z}`)!}
        />
      ))}
    </group>
  );
}
