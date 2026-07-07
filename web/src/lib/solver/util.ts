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

// The 8 corner slots as sticker triples, derived from the same cycles: each
// side face's index 0/2 borders U and 6/8 borders D (U_CYCLES/D_CYCLES row 0
// and 2); which side stickers meet at a corner comes from the per-face cycle
// rows that share a U or D sticker (e.g. R_CYCLES [F2, U2, B6, D2] and
// B_CYCLES [U2, L0, D6, R8] both touch U2, so U2 meets B0 and R2).
export const CORNER_SLOTS: readonly [StickerPos, StickerPos, StickerPos][] = [
  [["U", 0], ["B", 2], ["L", 0]],
  [["U", 2], ["B", 0], ["R", 2]],
  [["U", 6], ["F", 0], ["L", 2]],
  [["U", 8], ["F", 2], ["R", 0]],
  [["D", 0], ["F", 6], ["L", 8]],
  [["D", 2], ["F", 8], ["R", 6]],
  [["D", 6], ["B", 8], ["L", 6]],
  [["D", 8], ["B", 6], ["R", 8]],
];

// The D-face edge slot adjacent to each side face (from D_CYCLES in moves.ts).
export const D_SLOT: Record<string, number> = { F: 1, R: 5, B: 7, L: 3 };

export function getSticker(state: CubeState, [face, index]: StickerPos): Color {
  return state[face][index];
}

// Locates the corner colored {a, b, c} and returns its slot's sticker
// positions (in CORNER_SLOTS order, not color order).
export function findCornerSlot(
  state: CubeState,
  [a, b, c]: readonly [Color, Color, Color]
): readonly [StickerPos, StickerPos, StickerPos] {
  const wanted = [a, b, c].sort().join("");
  for (const slot of CORNER_SLOTS) {
    const colors = slot.map((pos) => getSticker(state, pos)).sort().join("");
    if (colors === wanted) return slot;
  }
  throw new Error(`No ${a}/${b}/${c} corner found; invalid cube state`);
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
