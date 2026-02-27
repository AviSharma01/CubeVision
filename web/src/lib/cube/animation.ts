import { MoveToken } from "./types";

// ---------------------------------------------------------------------------
// Per-move rotation data for Three.js animation
//
// Verified against the transformation formulas in moves.ts:
//   R CW: (x,y,z) → (x,-z, y)  = Rx(+π/2)
//   L CW: (x,y,z) → (x, z,-y)  = Rx(-π/2)
//   U CW: (x,y,z) → (z, y,-x)  = Ry(+π/2)
//   D CW: (x,y,z) → (-z,y, x)  = Ry(-π/2)
//   F CW: (x,y,z) → (y,-x, z)  = Rz(-π/2)
//   B CW: (x,y,z) → (-y,x, z)  = Rz(+π/2)
// ---------------------------------------------------------------------------

export interface MoveRotation {
  axis: "x" | "y" | "z";
  angle: number; // radians, sign encodes direction
}

const H = Math.PI / 2;

export const MOVE_ROTATION: Record<MoveToken, MoveRotation> = {
  R:   { axis: "x", angle:  H },
  "R'":{ axis: "x", angle: -H },
  R2:  { axis: "x", angle:  Math.PI },

  L:   { axis: "x", angle: -H },
  "L'":{ axis: "x", angle:  H },
  L2:  { axis: "x", angle: -Math.PI },

  U:   { axis: "y", angle:  H },
  "U'":{ axis: "y", angle: -H },
  U2:  { axis: "y", angle:  Math.PI },

  D:   { axis: "y", angle: -H },
  "D'":{ axis: "y", angle:  H },
  D2:  { axis: "y", angle: -Math.PI },

  F:   { axis: "z", angle: -H },
  "F'":{ axis: "z", angle:  H },
  F2:  { axis: "z", angle: -Math.PI },

  B:   { axis: "z", angle:  H },
  "B'":{ axis: "z", angle: -H },
  B2:  { axis: "z", angle:  Math.PI },
};

// Which axis value selects the cubies in a face's slice
export interface FaceSlice {
  axis: "x" | "y" | "z";
  value: 1 | -1;
}

export const FACE_SLICE: Record<string, FaceSlice> = {
  R: { axis: "x", value:  1 },
  L: { axis: "x", value: -1 },
  U: { axis: "y", value:  1 },
  D: { axis: "y", value: -1 },
  F: { axis: "z", value:  1 },
  B: { axis: "z", value: -1 },
};

const AXIS_IDX = { x: 0, y: 1, z: 2 } as const;

export function isInMovingFace(
  pos: [number, number, number],
  move: MoveToken
): boolean {
  const slice = FACE_SLICE[move[0]];
  return pos[AXIS_IDX[slice.axis]] === slice.value;
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export const QUARTER_TURN_DURATION = 0.25;
