// Shared sticker/edge lookup helpers for solver stages.
import { applyMove } from "../cube/moves";
import { Color, CubeState, FaceId, MoveToken } from "../cube/types";

export type StickerPos = readonly [FaceId, number];

// The 12 edge slots as sticker pairs, derived from the adjacency cycles in
// cube/moves.ts (each side face's index-1 sticker borders U, index-7 borders D;
// E-layer pairs come from the per-face cycle tables).
export const EDGE_SLOTS: readonly [StickerPos, StickerPos][] = [
  [["U", 1], ["B", 1]],
  [["U", 3], ["L", 1]],
  [["U", 5], ["R", 1]],
  [["U", 7], ["F", 1]],
  [["F", 5], ["R", 3]],
  [["F", 3], ["L", 5]],
  [["B", 3], ["R", 5]],
  [["B", 5], ["L", 3]],
  [["D", 1], ["F", 7]],
  [["D", 3], ["L", 7]],
  [["D", 5], ["R", 7]],
  [["D", 7], ["B", 7]],
];

export function getSticker(state: CubeState, [face, index]: StickerPos): Color {
  return state[face][index];
}

// Locates the edge colored {first, second} and returns the position of its
// `first`-colored sticker.
export function findEdgeSticker(
  state: CubeState,
  first: Color,
  second: Color
): StickerPos {
  for (const [a, b] of EDGE_SLOTS) {
    const colorA = getSticker(state, a);
    const colorB = getSticker(state, b);
    if (colorA === first && colorB === second) return a;
    if (colorB === first && colorA === second) return b;
  }
  throw new Error(`No ${first}/${second} edge found; invalid cube state`);
}

// Returns the shortest D-layer turn (zero or one move) after which `predicate`
// holds. `goal` describes the intent for the error when no turn works.
export function alignD(
  state: CubeState,
  predicate: (s: CubeState) => boolean,
  goal: string
): MoveToken[] {
  if (predicate(state)) return [];
  for (const move of ["D", "D'", "D2"] as MoveToken[]) {
    if (predicate(applyMove(state, move))) return [move];
  }
  throw new Error(`No D-layer turn can ${goal}`);
}
