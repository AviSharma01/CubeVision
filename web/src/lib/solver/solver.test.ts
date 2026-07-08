// Tests for the LBL solver harness — run with: npx tsx src/lib/solver/solver.test.ts
// The harness is proven against fake stages, then the real stages in STAGES
// are fuzzed against random scrambles.
import { applyMoves, generateScramble } from "../cube/moves";
import { SOLVED_STATE, toKociembaString, CubeState, MoveSequence, MoveToken } from "../cube/types";
import { solveLBL, STAGES } from "./index";
import { flattenResult, mergeSegments } from "./merge";
import { firstCorners } from "./stages/firstCorners";
import { orientCorners } from "./stages/orientCorners";
import { permuteCorners } from "./stages/permuteCorners";
import { permuteEdges } from "./stages/permuteEdges";
import { secondLayer } from "./stages/secondLayer";
import { whiteCross } from "./stages/whiteCross";
import { yellowCross } from "./stages/yellowCross";
import { SolveResult, SolverSegment, SolverStage } from "./types";

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
assert(
  STAGES.length === 7 &&
    STAGES[0] === whiteCross &&
    STAGES[1] === firstCorners &&
    STAGES[2] === secondLayer &&
    STAGES[3] === yellowCross &&
    STAGES[4] === orientCorners &&
    STAGES[5] === permuteCorners &&
    STAGES[6] === permuteEdges,
  "STAGES contains all seven layer-by-layer stages in solve order"
);

// --- 7. Result structure carries names and segments through ---
const result = solveLBL(scrambled, [spinStage]);
assert(result.stages.length === 1, "result has one entry per stage");
assert(result.stages[0].name === "spin", "result entry carries the stage name");
assert(result.stages[0].segments[0].label === "sexy move", "result entry carries segment labels");

// --- 8. White cross: isDone on the solved state, solve leaves input unmutated ---
assert(whiteCross.isDone(SOLVED_STATE), "white cross isDone accepts the solved state");
const crossInput = applyMoves(SOLVED_STATE, generateScramble());
const crossInputBefore = JSON.stringify(crossInput);
whiteCross.solve(crossInput);
assert(JSON.stringify(crossInput) === crossInputBefore, "whiteCross.solve does not mutate its input state");

// --- 8a. White cross: already-seated edges are skipped, not reinserted ---
assert(
  whiteCross.solve(SOLVED_STATE).length === 0,
  "white cross emits no segments when all four edges are seated"
);
// R2 from solved displaces only the white-red edge (to D5/R7, white on D);
// the other three stay seated, so the solve is a single insertion.
const oneEdgeOut = applyMoves(SOLVED_STATE, ["R2"]);
const oneEdgeSegments = whiteCross.solve(oneEdgeOut);
assert(
  oneEdgeSegments.length === 1 && oneEdgeSegments[0].label === "Insert white-red edge",
  "one displaced edge yields only its own insertion segment"
);
assert(
  whiteCross.isDone(applyMoves(oneEdgeOut, oneEdgeSegments[0].moves)),
  "the single insertion segment restores the white cross"
);

// --- 8b. First-layer corners: isDone semantics and input purity ---
assert(firstCorners.isDone(SOLVED_STATE), "first corners isDone accepts the solved state");
// One sexy move from solved keeps the cross intact but swaps a D-layer corner
// into the U8/F2/R0 slot, so only the corner predicate must fail.
const cornerBroken = applyMoves(SOLVED_STATE, ["R'", "D", "R", "D'"]);
assert(whiteCross.isDone(cornerBroken), "one sexy move from solved leaves the cross intact");
assert(!firstCorners.isDone(cornerBroken), "first corners isDone rejects a swapped-out corner");
const cornersInput = applyMoves(SOLVED_STATE, generateScramble());
const cornersInputBefore = JSON.stringify(cornersInput);
firstCorners.solve(cornersInput);
assert(JSON.stringify(cornersInput) === cornersInputBefore, "firstCorners.solve does not mutate its input state");

// --- 8c. Second layer: isDone semantics and input purity ---
assert(secondLayer.isDone(SOLVED_STATE), "second layer isDone accepts the solved state");
// Inverse of the FR right insertion (D R' D' R D' F D F') pulls the green-red
// edge out to the DF slot, leaving the first layer intact: one insertion away.
const edgeOut = applyMoves(SOLVED_STATE, ["F", "D'", "F'", "D", "R'", "D", "R", "D'"]);
assert(firstCorners.isDone(edgeOut), "pulling one middle edge leaves the first layer intact");
assert(!secondLayer.isDone(edgeOut), "second layer isDone rejects a pulled-out middle edge");
const reinserted = applyMoves(edgeOut, ["D", "R'", "D'", "R", "D'", "F", "D", "F'"]);
assert(secondLayer.isDone(reinserted), "one right insertion seats the edge and isDone flips");
// Purity, on a first-layer-solved state (secondLayer.solve assumes prior stages ran).
let secondInput = applyMoves(SOLVED_STATE, generateScramble());
for (const stage of solveLBL(secondInput, [whiteCross, firstCorners]).stages) {
  for (const segment of stage.segments) {
    secondInput = applyMoves(secondInput, segment.moves);
  }
}
const secondInputBefore = JSON.stringify(secondInput);
secondLayer.solve(secondInput);
assert(JSON.stringify(secondInput) === secondInputBefore, "secondLayer.solve does not mutate its input state");

// --- 8d. Yellow cross: isDone semantics and input purity ---
assert(yellowCross.isDone(SOLVED_STATE), "yellow cross isDone accepts the solved state");
// Undoing the cross algorithm (F' R' D R D' F) from solved leaves the first
// two layers intact but breaks two D edges: one application from done.
const lineState = applyMoves(SOLVED_STATE, ["F'", "D", "R'", "D'", "R", "F"]);
assert(secondLayer.isDone(lineState), "undoing the cross algorithm leaves the first two layers intact");
assert(!yellowCross.isDone(lineState), "yellow cross isDone rejects unoriented D edges");
assert(
  yellowCross.isDone(applyMoves(lineState, ["F'", "R'", "D", "R", "D'", "F"])),
  "one cross application re-forms the yellow cross and isDone flips"
);
const lineStateBefore = JSON.stringify(lineState);
yellowCross.solve(lineState);
assert(JSON.stringify(lineState) === lineStateBefore, "yellowCross.solve does not mutate its input state");

// --- 8e. Yellow corners: isDone semantics and input purity ---
assert(orientCorners.isDone(SOLVED_STATE), "yellow corners isDone accepts the solved state");
// App-token Sune (textbook R U R' U R U2 R') twists three D corners while
// keeping the first two layers and the yellow cross intact.
const suneState = applyMoves(SOLVED_STATE, ["R'", "D", "R", "D", "R'", "D2", "R"]);
assert(yellowCross.isDone(suneState), "Sune leaves the yellow cross intact");
assert(!orientCorners.isDone(suneState), "yellow corners isDone rejects twisted corners");
let suneFixed = suneState;
for (const segment of orientCorners.solve(suneState)) {
  suneFixed = applyMoves(suneFixed, segment.moves);
}
assert(orientCorners.isDone(suneFixed), "yellow corners stage orients a Sune-twisted last layer");
const suneStateBefore = JSON.stringify(suneState);
orientCorners.solve(suneState);
assert(JSON.stringify(suneState) === suneStateBefore, "orientCorners.solve does not mutate its input state");

// --- 8f. Corner permutation: isDone semantics and input purity ---
assert(permuteCorners.isDone(SOLVED_STATE), "corner permutation isDone accepts the solved state");
// Undoing the corner 3-cycle (R F' R B2 R' F R B2 R2) from solved leaves
// orientation intact but displaces three corners: one application from done.
const cornersOut = applyMoves(SOLVED_STATE, ["R2", "B2", "R'", "F'", "R", "B2", "R'", "F", "R'"]);
assert(orientCorners.isDone(cornersOut), "undoing the corner 3-cycle keeps all corners oriented");
assert(!permuteCorners.isDone(cornersOut), "corner permutation isDone rejects displaced corners");
assert(
  permuteCorners.isDone(applyMoves(cornersOut, ["R", "F'", "R", "B2", "R'", "F", "R", "B2", "R2"])),
  "one corner 3-cycle places the corners and isDone flips"
);
const cornersOutBefore = JSON.stringify(cornersOut);
permuteCorners.solve(cornersOut);
assert(JSON.stringify(cornersOut) === cornersOutBefore, "permuteCorners.solve does not mutate its input state");

// --- 8g. Edge permutation: isDone semantics, final alignment, input purity ---
assert(permuteEdges.isDone(SOLVED_STATE), "edge permutation isDone accepts the solved state");
// Undoing the edge 3-cycle (F2 D L' R F2 L R' D F2) from solved leaves the
// corners placed but displaces three edges: one application from done.
const edgesOut = applyMoves(SOLVED_STATE, ["F2", "D'", "R", "L'", "F2", "R'", "L", "D'", "F2"]);
assert(permuteCorners.isDone(edgesOut), "undoing the edge 3-cycle keeps the corners placed");
assert(!permuteEdges.isDone(edgesOut), "edge permutation isDone rejects displaced edges");
assert(
  permuteEdges.isDone(applyMoves(edgesOut, ["F2", "D", "L'", "R", "F2", "L", "R'", "D", "F2"])),
  "one edge 3-cycle restores the solved state and isDone flips"
);
// A pure D offset passes every earlier predicate; only the final alignment
// segment brings it home.
const dOffset = applyMoves(SOLVED_STATE, ["D"]);
assert(permuteCorners.isDone(dOffset), "a lone D turn keeps every D-invariant predicate");
assert(!permuteEdges.isDone(dOffset), "edge permutation isDone rejects a rotated last layer");
const dOffsetSegments = permuteEdges.solve(dOffset);
assert(
  dOffsetSegments.length === 1 && dOffsetSegments[0].label === "Align the final layer",
  "a rotated last layer needs only the final alignment segment"
);
assert(
  permuteEdges.isDone(applyMoves(dOffset, dOffsetSegments[0].moves)),
  "the final alignment segment solves the rotated last layer"
);
const edgesOutBefore = JSON.stringify(edgesOut);
permuteEdges.solve(edgesOut);
assert(JSON.stringify(edgesOut) === edgesOutBefore, "permuteEdges.solve does not mutate its input state");

// --- 9. Milestone: 500 fuzzed scrambles fully solved ---
// Stage 7's predicate is deep equality with SOLVED_STATE, so this run
// proves 500 random scrambles solve completely with every intermediate
// stage invariant held at each boundary.
fuzzSolver(STAGES, 500);
assert(true, "all seven STAGES fully solve 500 fuzzed scrambles");

// --- 10. Sanity bound: white cross never exceeds 60 moves ---
for (let i = 0; i < 500; i++) {
  const scramble = generateScramble();
  const segments = whiteCross.solve(applyMoves(SOLVED_STATE, scramble));
  const moveCount = segments.reduce((n, seg) => n + seg.moves.length, 0);
  if (moveCount > 60) {
    throw new Error(
      `FAIL: white cross took ${moveCount} moves on scramble "${scramble.join(" ")}"`
    );
  }
}
assert(true, "white cross stays within 60 moves across 500 scrambles");

// --- 11. Sanity bound: cross + corners never exceed 120 moves ---
for (let i = 0; i < 500; i++) {
  const scramble = generateScramble();
  const result = solveLBL(applyMoves(SOLVED_STATE, scramble), [whiteCross, firstCorners]);
  const moveCount = result.stages
    .flatMap((stage) => stage.segments)
    .reduce((n, seg) => n + seg.moves.length, 0);
  if (moveCount > 120) {
    throw new Error(
      `FAIL: cross + corners took ${moveCount} moves on scramble "${scramble.join(" ")}"`
    );
  }
}
assert(true, "cross + corners stay within 120 moves across 500 scrambles");

// --- 12. Sanity bound: the first three stages never exceed 200 moves ---
for (let i = 0; i < 500; i++) {
  const scramble = generateScramble();
  const result = solveLBL(applyMoves(SOLVED_STATE, scramble), [
    whiteCross,
    firstCorners,
    secondLayer,
  ]);
  const moveCount = result.stages
    .flatMap((stage) => stage.segments)
    .reduce((n, seg) => n + seg.moves.length, 0);
  if (moveCount > 200) {
    throw new Error(
      `FAIL: three stages took ${moveCount} moves on scramble "${scramble.join(" ")}"`
    );
  }
}
assert(true, "cross + corners + second layer stay within 200 moves across 500 scrambles");

// --- 13. Sanity bound: the first five stages never exceed 320 moves ---
for (let i = 0; i < 500; i++) {
  const scramble = generateScramble();
  const result = solveLBL(applyMoves(SOLVED_STATE, scramble), [
    whiteCross,
    firstCorners,
    secondLayer,
    yellowCross,
    orientCorners,
  ]);
  const moveCount = result.stages
    .flatMap((stage) => stage.segments)
    .reduce((n, seg) => n + seg.moves.length, 0);
  if (moveCount > 320) {
    throw new Error(
      `FAIL: five stages took ${moveCount} moves on scramble "${scramble.join(" ")}"`
    );
  }
}
assert(true, "the first five stages stay within 320 moves across 500 scrambles");

// --- 14. Sanity bound: a complete solve never exceeds 420 moves ---
let solveMax = 0;
let solveSum = 0;
for (let i = 0; i < 500; i++) {
  const scramble = generateScramble();
  const result = solveLBL(applyMoves(SOLVED_STATE, scramble), STAGES);
  const moveCount = result.stages
    .flatMap((stage) => stage.segments)
    .reduce((n, seg) => n + seg.moves.length, 0);
  if (moveCount > 420) {
    throw new Error(
      `FAIL: complete solve took ${moveCount} moves on scramble "${scramble.join(" ")}"`
    );
  }
  solveMax = Math.max(solveMax, moveCount);
  solveSum += moveCount;
}
console.log(
  `  INFO: complete solve over 500 scrambles: avg ${(solveSum / 500).toFixed(1)} moves, max ${solveMax}`
);
assert(true, "a complete solve stays within 420 moves across 500 scrambles");

// --- 15. mergeSegments: pair rules, chains, boundaries, dropping, purity ---
// All nine same-face pair combinations reduce by summed quarter turns mod 4.
const PAIR_CASES: [MoveToken[], MoveToken[]][] = [
  [["R", "R"], ["R2"]],
  [["R", "R'"], []],
  [["R", "R2"], ["R'"]],
  [["R'", "R"], []],
  [["R'", "R'"], ["R2"]],
  [["R'", "R2"], ["R"]],
  [["R2", "R"], ["R'"]],
  [["R2", "R'"], ["R"]],
  [["R2", "R2"], []],
];
for (const [input, expected] of PAIR_CASES) {
  const out = mergeSegments([{ label: "pair", moves: input }]);
  const got = out.length === 0 ? [] : out[0].moves;
  if (got.join(" ") !== expected.join(" ")) {
    throw new Error(
      `FAIL: mergeSegments([${input.join(" ")}]) gave "${got.join(" ")}", expected "${expected.join(" ")}"`
    );
  }
}
assert(true, "mergeSegments applies all nine same-face pair rules");
assert(
  mergeSegments([{ label: "quad", moves: ["R", "R", "R", "R"] }]).length === 0,
  "R R R R merges to nothing and the emptied segment is dropped"
);
// Cancelling the inner pair must make the outer moves adjacent and merge too.
const cascade = mergeSegments([{ label: "cascade", moves: ["F", "R", "R'", "F"] }]);
assert(
  cascade.length === 1 && cascade[0].moves.join(" ") === "F2",
  "cancelling an inner pair cascades into merging the moves around it"
);
const different = mergeSegments([{ label: "keep", moves: ["R", "D", "R'"] }]);
assert(
  different.length === 1 && different[0].moves.join(" ") === "R D R'",
  "different-face neighbors are left alone"
);
// Same-face moves on either side of a segment boundary must both survive.
const boundary = mergeSegments([
  { label: "first", moves: ["R", "D"] },
  { label: "second", moves: ["D'", "F"] },
]);
assert(
  boundary.length === 2 &&
    boundary[0].moves.join(" ") === "R D" &&
    boundary[1].moves.join(" ") === "D' F",
  "moves are never merged across a segment boundary"
);
assert(
  mergeSegments([{ label: "empty", moves: [] }]).length === 0,
  "a segment with no moves is dropped"
);
const mergeInput: SolverSegment[] = [
  { label: "a", moves: ["R", "R"] },
  { label: "b", moves: [] },
];
const mergeInputBefore = JSON.stringify(mergeInput);
mergeSegments(mergeInput);
assert(
  JSON.stringify(mergeInput) === mergeInputBefore,
  "mergeSegments does not mutate its input segments"
);

// --- 16. flattenResult: merged moves with per-move stage/label annotations ---
const fakeResult: SolveResult = {
  stages: [
    {
      name: "stage-one",
      segments: [
        { label: "seg-a", moves: ["R", "R"] },
        { label: "seg-b", moves: ["U", "U'"] },
      ],
    },
    { name: "stage-two", segments: [{ label: "seg-c", moves: ["F", "D"] }] },
  ],
};
const flat = flattenResult(fakeResult);
assert(
  flat.moves.join(" ") === "R2 F D",
  "flattenResult merges each stage's segments before flattening"
);
assert(
  flat.moves.length === flat.annotations.length,
  "flattenResult returns equal-length moves and annotations"
);
assert(
  flat.annotations[0].stage === "stage-one" && flat.annotations[0].label === "seg-a",
  "the first move is annotated with its stage and segment label"
);
assert(
  flat.annotations[1].stage === "stage-two" &&
    flat.annotations[1].label === "seg-c" &&
    flat.annotations[2].label === "seg-c",
  "annotations switch stage and label exactly at the segment boundary"
);

// --- 17. Equivalence fuzz: merged flat moves reach the identical end state ---
// The property that makes merging safe for playback: over 200 scrambles the
// merged flattened moves and the raw segment moves land on byte-identical
// states, with the moves/annotations length invariant held throughout.
let unmergedSum = 0;
let unmergedMax = 0;
let mergedSum = 0;
let mergedMax = 0;
for (let i = 0; i < 200; i++) {
  const scramble = generateScramble();
  const start = applyMoves(SOLVED_STATE, scramble);
  const solveResult = solveLBL(start, STAGES);
  const unmerged = solveResult.stages
    .flatMap((stage) => stage.segments)
    .flatMap((segment) => segment.moves);
  const { moves, annotations } = flattenResult(solveResult);
  if (moves.length !== annotations.length) {
    throw new Error(
      `FAIL: moves/annotations length mismatch on scramble "${scramble.join(" ")}"`
    );
  }
  const unmergedEnd = JSON.stringify(applyMoves(start, unmerged));
  const mergedEnd = JSON.stringify(applyMoves(start, moves));
  if (mergedEnd !== unmergedEnd) {
    throw new Error(
      `FAIL: merged moves diverge from unmerged on scramble "${scramble.join(" ")}"`
    );
  }
  unmergedSum += unmerged.length;
  unmergedMax = Math.max(unmergedMax, unmerged.length);
  mergedSum += moves.length;
  mergedMax = Math.max(mergedMax, moves.length);
}
console.log(
  `  INFO: solve length over 200 scrambles: unmerged avg ${(unmergedSum / 200).toFixed(1)} max ${unmergedMax}, merged avg ${(mergedSum / 200).toFixed(1)} max ${mergedMax}`
);
assert(true, "merged flattened moves match unmerged end states across 200 scrambles");

console.log("\nAll tests passed ✓");
