import { CubeState, Color, FaceId, COLOR_HEX } from "./types";

const BLACK = "#111111";

// For each face, the [x, y, z] cubie position of each sticker (index 0–8, row-major).
//
// Viewing conventions:
//   U  — looking down,  F toward viewer: row 0 = back (z=-1), col 0 = left (x=-1)
//   D  — looking up,    F toward viewer: row 0 = front (z=+1), col 0 = left (x=-1)
//   F  — looking in -Z: row 0 = top (y=+1), col 0 = left (x=-1)
//   B  — looking in +Z: row 0 = top (y=+1), col 0 = right of cube (x=+1) [mirrored]
//   L  — looking in +X: row 0 = top (y=+1), col 0 = back (z=-1)
//   R  — looking in -X: row 0 = top (y=+1), col 0 = front (z=+1)

const STICKER_POSITIONS: Record<FaceId, [number, number, number][]> = {
  U: [
    [-1, 1, -1], [0, 1, -1], [1, 1, -1],
    [-1, 1,  0], [0, 1,  0], [1, 1,  0],
    [-1, 1,  1], [0, 1,  1], [1, 1,  1],
  ],
  D: [
    [-1, -1,  1], [0, -1,  1], [1, -1,  1],
    [-1, -1,  0], [0, -1,  0], [1, -1,  0],
    [-1, -1, -1], [0, -1, -1], [1, -1, -1],
  ],
  F: [
    [-1,  1, 1], [0,  1, 1], [1,  1, 1],
    [-1,  0, 1], [0,  0, 1], [1,  0, 1],
    [-1, -1, 1], [0, -1, 1], [1, -1, 1],
  ],
  B: [
    [ 1,  1, -1], [0,  1, -1], [-1,  1, -1],
    [ 1,  0, -1], [0,  0, -1], [-1,  0, -1],
    [ 1, -1, -1], [0, -1, -1], [-1, -1, -1],
  ],
  L: [
    [-1,  1, -1], [-1,  1, 0], [-1,  1,  1],
    [-1,  0, -1], [-1,  0, 0], [-1,  0,  1],
    [-1, -1, -1], [-1, -1, 0], [-1, -1,  1],
  ],
  R: [
    [1,  1,  1], [1,  1, 0], [1,  1, -1],
    [1,  0,  1], [1,  0, 0], [1,  0, -1],
    [1, -1,  1], [1, -1, 0], [1, -1, -1],
  ],
};

// Three.js BoxGeometry material slot order: +X=0, -X=1, +Y=2, -Y=3, +Z=4, -Z=5
const FACE_MATERIAL_SLOT: Record<FaceId, number> = {
  R: 0, // +X
  L: 1, // -X
  U: 2, // +Y
  D: 3, // -Y
  F: 4, // +Z
  B: 5, // -Z
};

export type CubieColors = [string, string, string, string, string, string];

const cubieKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

export function buildCubieColors(
  state: CubeState
): Map<string, CubieColors> {
  const map = new Map<string, CubieColors>();

  for (const x of [-1, 0, 1])
    for (const y of [-1, 0, 1])
      for (const z of [-1, 0, 1])
        map.set(cubieKey(x, y, z), [BLACK, BLACK, BLACK, BLACK, BLACK, BLACK]);

  for (const faceId of Object.keys(STICKER_POSITIONS) as FaceId[]) {
    const positions = STICKER_POSITIONS[faceId];
    const stickers = state[faceId];
    const slot = FACE_MATERIAL_SLOT[faceId];

    for (let i = 0; i < 9; i++) {
      const [x, y, z] = positions[i];
      const colors = map.get(cubieKey(x, y, z))!;
      colors[slot] = COLOR_HEX[stickers[i] as Color];
    }
  }

  return map;
}
