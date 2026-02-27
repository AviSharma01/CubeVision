// Smoke tests for move logic — run with: npx tsx src/lib/cube/moves.test.ts
import { applyMove, applyMoves, parseMoveSequence } from "./moves";
import { SOLVED_STATE, toKociembaString, CubeState } from "./types";

const SOLVED_KOC = toKociembaString(SOLVED_STATE);

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`  PASS: ${msg}`);
}

function koc(state: CubeState) {
  return toKociembaString(state);
}

// --- 1. Identity: 4× any single move = solved ---
const SINGLE_MOVES = ["U", "D", "F", "B", "L", "R"] as const;
for (const m of SINGLE_MOVES) {
  const after4 = applyMoves(SOLVED_STATE, [m, m, m, m]);
  assert(koc(after4) === SOLVED_KOC, `4× ${m} = solved`);
}

// --- 2. CCW = inverse of CW ---
for (const m of SINGLE_MOVES) {
  const ccw = `${m}'` as const;
  const afterCW_CCW = applyMoves(SOLVED_STATE, [m, ccw]);
  assert(koc(afterCW_CCW) === SOLVED_KOC, `${m} then ${ccw} = solved`);
}

// --- 3. Half-turn: 2× half = solved ---
for (const m of SINGLE_MOVES) {
  const h = `${m}2` as const;
  const after2 = applyMoves(SOLVED_STATE, [h, h]);
  assert(koc(after2) === SOLVED_KOC, `2× ${m}2 = solved`);
}

// --- 4. Sexy move (R U R' U') × 6 = solved ---
const sexy = parseMoveSequence("R U R' U'");
const after6sexy = applyMoves(SOLVED_STATE, [...sexy, ...sexy, ...sexy, ...sexy, ...sexy, ...sexy]);
assert(koc(after6sexy) === SOLVED_KOC, "(R U R' U') × 6 = solved");

// --- 5. Sune then its inverse = solved ---
// Sune: R U R' U R U2 R'  |  Inverse: R U2' R' U' R U' R'
const sune    = parseMoveSequence("R U R' U R U2 R'");
const suneInv = parseMoveSequence("R U2 R' U' R U' R'");
const afterSunePair = applyMoves(SOLVED_STATE, [...sune, ...suneInv]);
assert(koc(afterSunePair) === SOLVED_KOC, "Sune then inverse Sune = solved");

// --- 6. Single R move: F top-right (F[2]) should be white ---
const afterR = applyMove(SOLVED_STATE, "R");
assert(afterR.F[2] === "W", "After R: F[2] is white (came from U[8])");
assert(afterR.U[2] === "B", "After R: U[2] is blue (came from B[0])");
assert(afterR.D[2] === "G", "After R: D[2] is green (came from F[2])");
assert(afterR.B[0] === "Y", "After R: B[0] is yellow (came from D[8])");

// --- 7. parseMoveSequence ---
const seq = parseMoveSequence("R U R' U'");
assert(seq.length === 4, "parseMoveSequence length");
assert(seq[0] === "R" && seq[2] === "R'", "parseMoveSequence tokens");

console.log("\nAll tests passed ✓");
