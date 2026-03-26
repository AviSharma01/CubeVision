import { CubeState, Face, FaceId, MoveToken, MoveSequence } from "./types";


function rotateFaceCW(f: Face): Face {
  return [f[6], f[3], f[0], f[7], f[4], f[1], f[8], f[5], f[2]];
}

function rotateFaceCCW(f: Face): Face {
  return [f[2], f[5], f[8], f[1], f[4], f[7], f[0], f[3], f[6]];
}

function rotateFace180(f: Face): Face {
  return [f[8], f[7], f[6], f[5], f[4], f[3], f[2], f[1], f[0]];
}


type Ref = [FaceId, number];

function applyCycleCW(s: CubeState, [a, b, c, d]: Ref[]): void {
  const tmp = s[d[0]][d[1]];
  s[d[0]][d[1]] = s[c[0]][c[1]];
  s[c[0]][c[1]] = s[b[0]][b[1]];
  s[b[0]][b[1]] = s[a[0]][a[1]];
  s[a[0]][a[1]] = tmp;
}

function applyCycleCCW(s: CubeState, cycle: Ref[]): void {
  applyCycleCW(s, [cycle[3], cycle[2], cycle[1], cycle[0]]);
}

function applyCycle180(s: CubeState, [a, b, c, d]: Ref[]): void {
  let tmp = s[a[0]][a[1]];
  s[a[0]][a[1]] = s[c[0]][c[1]];
  s[c[0]][c[1]] = tmp;
  tmp = s[b[0]][b[1]];
  s[b[0]][b[1]] = s[d[0]][d[1]];
  s[d[0]][d[1]] = tmp;
}

// ---------------------------------------------------------------------------
// Adjacent sticker cycles for each CW face turn
//
// Each entry is 3 cycles. Direction: a → b → c → d → a
//
// Derived from the rotation transformation per axis:
//   R CW: (x,y,z) → (x,  z, -y)   [Rx(-π/2)]
//   L CW: (x,y,z) → (x, -z,  y)   [Rx(+π/2)]
//   U CW: (x,y,z) → (z,  y, -x)   [around +Y]
//   D CW: (x,y,z) → (-z, y,  x)   [around -Y]
//   F CW: (x,y,z) → (y, -x,  z)   [around +Z]
//   B CW: (x,y,z) → (-y, x,  z)   [around -Z]
// ---------------------------------------------------------------------------

const R_CYCLES: Ref[][] = [
  [["F", 2], ["U", 2], ["B", 6], ["D", 2]],
  [["F", 5], ["U", 5], ["B", 3], ["D", 5]],
  [["F", 8], ["U", 8], ["B", 0], ["D", 8]],
];

const L_CYCLES: Ref[][] = [
  [["U", 0], ["F", 0], ["D", 0], ["B", 8]],
  [["U", 3], ["F", 3], ["D", 3], ["B", 5]],
  [["U", 6], ["F", 6], ["D", 6], ["B", 2]],
];

const U_CYCLES: Ref[][] = [
  [["F", 0], ["R", 0], ["B", 0], ["L", 0]],
  [["F", 1], ["R", 1], ["B", 1], ["L", 1]],
  [["F", 2], ["R", 2], ["B", 2], ["L", 2]],
];

const D_CYCLES: Ref[][] = [
  [["F", 6], ["L", 6], ["B", 6], ["R", 6]],
  [["F", 7], ["L", 7], ["B", 7], ["R", 7]],
  [["F", 8], ["L", 8], ["B", 8], ["R", 8]],
];

const F_CYCLES: Ref[][] = [
  [["U", 6], ["R", 0], ["D", 2], ["L", 8]],
  [["U", 7], ["R", 3], ["D", 1], ["L", 5]],
  [["U", 8], ["R", 6], ["D", 0], ["L", 2]],
];

const B_CYCLES: Ref[][] = [
  [["U", 0], ["L", 6], ["D", 8], ["R", 2]],
  [["U", 1], ["L", 3], ["D", 7], ["R", 5]],
  [["U", 2], ["L", 0], ["D", 6], ["R", 8]],
];


function cloneState(s: CubeState): CubeState {
  return {
    U: [...s.U] as Face,
    D: [...s.D] as Face,
    F: [...s.F] as Face,
    B: [...s.B] as Face,
    L: [...s.L] as Face,
    R: [...s.R] as Face,
  };
}

export function applyMove(state: CubeState, move: MoveToken): CubeState {
  const next = cloneState(state);

  const ccw = move.endsWith("'");
  const half = move.endsWith("2");
  const applyFn = ccw
    ? applyCycleCCW
    : half
    ? applyCycle180
    : applyCycleCW;

  switch (move) {
    case "R":
    case "R'":
    case "R2":
      next.R = ccw ? rotateFaceCCW(state.R) : half ? rotateFace180(state.R) : rotateFaceCW(state.R);
      R_CYCLES.forEach((c) => applyFn(next, c));
      break;
    case "L":
    case "L'":
    case "L2":
      next.L = ccw ? rotateFaceCCW(state.L) : half ? rotateFace180(state.L) : rotateFaceCW(state.L);
      L_CYCLES.forEach((c) => applyFn(next, c));
      break;
    case "U":
    case "U'":
    case "U2":
      next.U = ccw ? rotateFaceCW(state.U) : half ? rotateFace180(state.U) : rotateFaceCCW(state.U);
      U_CYCLES.forEach((c) => applyFn(next, c));
      break;
    case "D":
    case "D'":
    case "D2":
      next.D = ccw ? rotateFaceCW(state.D) : half ? rotateFace180(state.D) : rotateFaceCCW(state.D);
      D_CYCLES.forEach((c) => applyFn(next, c));
      break;
    case "F":
    case "F'":
    case "F2":
      next.F = ccw ? rotateFaceCCW(state.F) : half ? rotateFace180(state.F) : rotateFaceCW(state.F);
      F_CYCLES.forEach((c) => applyFn(next, c));
      break;
    case "B":
    case "B'":
    case "B2":
      next.B = ccw ? rotateFaceCCW(state.B) : half ? rotateFace180(state.B) : rotateFaceCW(state.B);
      B_CYCLES.forEach((c) => applyFn(next, c));
      break;
  }

  return next;
}

export function applyMoves(state: CubeState, moves: MoveSequence): CubeState {
  return moves.reduce((s, m) => applyMove(s, m), state);
}

const VALID_MOVES = new Set<string>([
  "U", "U'", "U2",
  "D", "D'", "D2",
  "F", "F'", "F2",
  "B", "B'", "B2",
  "L", "L'", "L2",
  "R", "R'", "R2",
]);

export function parseMoveSequence(notation: string): MoveSequence {
  return notation
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (!VALID_MOVES.has(token)) {
        throw new Error(`Unknown move token: "${token}"`);
      }
      return token as MoveToken;
    });
}
