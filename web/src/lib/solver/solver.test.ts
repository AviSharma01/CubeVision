// Tests for the LBL solver harness — run with: npx tsx src/lib/solver/solver.test.ts
// No real stages exist yet; the harness is proven against fake stages.
import { applyMoves, generateScramble } from "../cube/moves";
import { SOLVED_STATE, toKociembaString, CubeState, MoveSequence } from "../cube/types";
import { solveLBL, STAGES } from "./index";
import { SolverStage } from "./types";

const SOLVED_KOC = toKociembaString(SOLVED_STATE);

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`  PASS: ${msg}`);
}

function assertThrows(fn: () => void, msg: string, contains?: string) {
  let message: string | null = null;
  try {
    fn();
  } catch (err) {
    message = (err as Error).message;
  }
  if (message === null) throw new Error(`FAIL: ${msg} (did not throw)`);
  if (contains !== undefined && !message.includes(contains)) {
    throw new Error(`FAIL: ${msg} (message "${message}" lacks "${contains}")`);
  }
  console.log(`  PASS: ${msg}`);
}

// Runs solveLBL against n random scrambles, then independently replays the
// returned segments (not trusting solveLBL's internal check): at each stage
// boundary, the just-finished stage and every earlier stage must report done.
// On any failure the scramble string is included so the run can be replayed.
function fuzzSolver(
  stages: SolverStage[],
  n: number,
  scrambleSource: () => MoveSequence = generateScramble
) {
  for (let i = 0; i < n; i++) {
    const scramble = scrambleSource();
    const scrambled = applyMoves(SOLVED_STATE, scramble);
    try {
      const result = solveLBL(scrambled, stages);
      let current = scrambled;
      for (let k = 0; k < result.stages.length; k++) {
        for (const segment of result.stages[k].segments) {
          current = applyMoves(current, segment.moves);
        }
        for (let j = 0; j <= k; j++) {
          if (!stages[j].isDone(current)) {
            throw new Error(
              `stage "${stages[j].name}" not done after stage "${stages[k].name}" completed`
            );
          }
        }
      }
    } catch (err) {
      throw new Error(
        `fuzzSolver failed on scramble "${scramble.join(" ")}": ${(err as Error).message}`
      );
    }
  }
}

// --- 1. Trivial passing fake survives 100 scrambles ---
const trivialStage: SolverStage = {
  name: "trivial",
  isDone: () => true,
  solve: () => [],
};
fuzzSolver([trivialStage], 100);
assert(true, "trivial passing fake survives fuzzSolver over 100 scrambles");

// --- 2. Broken fake: isDone always false must make fuzzSolver throw ---
const neverDoneStage: SolverStage = {
  name: "never-done",
  isDone: () => false,
  solve: () => [],
};
assertThrows(
  () => fuzzSolver([neverDoneStage], 1),
  "isDone-always-false fake makes fuzzSolver throw, naming the stage",
  'Stage "never-done"'
);

// --- 3. Broken fake: solve returning wrong moves must make fuzzSolver throw ---
// isDone requires a solved cube; R U after a 22-move random scramble is not it.
const wrongMovesStage: SolverStage = {
  name: "wrong-moves",
  isDone: (s) => toKociembaString(s) === SOLVED_KOC,
  solve: () => [{ label: "bogus insertion", moves: ["R", "U"] }],
};
assertThrows(
  () => fuzzSolver([wrongMovesStage], 1),
  "wrong-moves fake makes fuzzSolver throw",
  'Stage "wrong-moves"'
);

// --- 4. Later stage destroying earlier work must make fuzzSolver throw ---
// Deterministic: empty scramble (solved start). Stage 1 checks U[2], which is
// white when solved; stage 2 passes its own check but its R turn moves F[2]
// (green) into U[2], breaking stage 1 at stage 2's completion boundary.
const noScramble = (): MoveSequence => [];
const cornerWatcher: SolverStage = {
  name: "corner-watcher",
  isDone: (s: CubeState) => s.U[2] === "W",
  solve: () => [],
};
const destroyer: SolverStage = {
  name: "destroyer",
  isDone: () => true,
  solve: () => [{ label: "reckless turn", moves: ["R"] }],
};
fuzzSolver([cornerWatcher], 1, noScramble);
assert(true, "corner-watcher alone passes from a solved start");
assertThrows(
  () => fuzzSolver([cornerWatcher, destroyer], 1, noScramble),
  "stage that destroys earlier work makes fuzzSolver throw",
  '"corner-watcher" not done after stage "destroyer"'
);

// --- 5. solveLBL leaves its input state unmutated ---
const scrambled = applyMoves(SOLVED_STATE, generateScramble());
const before = JSON.stringify(scrambled);
const spinStage: SolverStage = {
  name: "spin",
  isDone: () => true,
  solve: () => [{ label: "sexy move", moves: ["R", "U", "R'", "U'"] }],
};
solveLBL(scrambled, [spinStage]);
assert(JSON.stringify(scrambled) === before, "solveLBL does not mutate its input state");

// --- 6. Empty stage list is a no-op ---
const emptyResult = solveLBL(scrambled, []);
assert(emptyResult.stages.length === 0, "solveLBL with no stages returns empty result");
assert(STAGES.length === 0, "STAGES starts empty (later sessions append)");

// --- 7. Result structure carries names and segments through ---
const result = solveLBL(scrambled, [spinStage]);
assert(result.stages.length === 1, "result has one entry per stage");
assert(result.stages[0].name === "spin", "result entry carries the stage name");
assert(result.stages[0].segments[0].label === "sexy move", "result entry carries segment labels");

console.log("\nAll tests passed ✓");
