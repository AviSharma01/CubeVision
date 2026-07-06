// White cross stage (daisy method).
//
// Phase 1 ("daisy"): park all four white edges on the D face, white facing D.
// Phase 2: turn D to line each edge's side sticker up with its center, then a
// 180 turn of that face inserts it into U.
//
// Every turn a daisy step makes touches exactly one D edge slot (`protect`);
// alignD pre-turns D so that slot holds no white sticker, so a step can never
// knock an already-parked edge off the D face. Insertions touch only their own
// face's U and D edge slots, so they cannot disturb earlier insertions or the
// remaining daisy edges.
import { applyMoves } from "../../cube/moves";
import { Color, CubeState, FaceId, MoveToken } from "../../cube/types";
import { SolverSegment, SolverStage } from "../types";
import { alignD, findEdgeSticker } from "../util";

// The four cross edges: white paired with each side color, and the face that
// color belongs to (fixed orientation: G on F, R on R, B on B, O on L).
const CROSS_EDGES: { color: Color; face: FaceId; name: string }[] = [
  { color: "G", face: "F", name: "white-green" },
  { color: "R", face: "R", name: "white-red" },
  { color: "B", face: "B", name: "white-blue" },
  { color: "O", face: "L", name: "white-orange" },
];

// The D-face edge slot adjacent to each side face (from D_CYCLES in moves.ts).
const D_SLOT: Record<string, number> = { F: 1, R: 5, B: 7, L: 3 };

// Daisy step for each white-sticker position (keyed "<face><index>"): the turn
// that makes progress toward white-on-D, and the one D edge slot that turn
// touches. Derived from the cycle tables in cube/moves.ts:
// - White on U: the adjacent face's 180 turn swaps it straight down to D.
// - White on a U-layer side or D-layer side: a quarter turn of that face moves
//   the edge into the E layer.
// - White in the E layer: one specific quarter turn drops it onto D
//   (e.g. the R cycle [F5, U5, B3, D5] gives F5 -> D5 under R').
const DAISY_STEPS: Record<string, { move: MoveToken; protect: number }> = {
  // White on the U face.
  U7: { move: "F2", protect: 1 },
  U5: { move: "R2", protect: 5 },
  U1: { move: "B2", protect: 7 },
  U3: { move: "L2", protect: 3 },
  // White on a U-layer side sticker.
  F1: { move: "F", protect: 1 },
  R1: { move: "R", protect: 5 },
  B1: { move: "B", protect: 7 },
  L1: { move: "L", protect: 3 },
  // White in the E layer.
  F5: { move: "R'", protect: 5 },
  R3: { move: "F", protect: 1 },
  F3: { move: "L", protect: 3 },
  L5: { move: "F'", protect: 1 },
  B3: { move: "R", protect: 5 },
  R5: { move: "B'", protect: 7 },
  B5: { move: "L'", protect: 3 },
  L3: { move: "B", protect: 7 },
  // White on a D-layer side sticker.
  F7: { move: "F", protect: 1 },
  R7: { move: "R", protect: 5 },
  B7: { move: "B", protect: 7 },
  L7: { move: "L", protect: 3 },
};

const DAISY_STEP_CAP = 8;

export const whiteCross: SolverStage = {
  name: "White cross",

  isDone(state: CubeState): boolean {
    return (
      state.U[1] === "W" &&
      state.U[3] === "W" &&
      state.U[5] === "W" &&
      state.U[7] === "W" &&
      state.F[1] === "G" &&
      state.R[1] === "R" &&
      state.B[1] === "B" &&
      state.L[1] === "O"
    );
  },

  solve(state: CubeState): SolverSegment[] {
    const segments: SolverSegment[] = [];
    let current = state;

    // Phase 1: daisy — every white edge onto the D face, white facing D.
    for (const { color, name } of CROSS_EDGES) {
      const moves: MoveToken[] = [];
      for (let step = 0; ; step++) {
        const [face, index] = findEdgeSticker(current, "W", color);
        if (face === "D") break;
        if (step >= DAISY_STEP_CAP) {
          throw new Error(
            `White cross: ${name} edge did not reach the bottom layer within ${DAISY_STEP_CAP} steps`
          );
        }
        const rule = DAISY_STEPS[`${face}${index}`];
        if (!rule) {
          throw new Error(
            `White cross: no daisy step for white sticker at ${face}[${index}]`
          );
        }
        const stepMoves = [
          ...alignD(
            current,
            (s) => s.D[rule.protect] !== "W",
            `clear bottom slot D[${rule.protect}] for the ${name} edge`
          ),
          rule.move,
        ];
        current = applyMoves(current, stepMoves);
        moves.push(...stepMoves);
      }
      if (moves.length > 0) {
        segments.push({
          label: `Bring ${name} edge to the bottom layer`,
          moves,
        });
      }
    }

    // Phase 2: align each daisy edge under its center and insert with a 180.
    for (const { color, face, name } of CROSS_EDGES) {
      const slot = D_SLOT[face];
      const moves: MoveToken[] = [
        ...alignD(
          current,
          (s) => s.D[slot] === "W" && s[face][7] === color,
          `bring the ${name} edge under the ${face} center`
        ),
        `${face}2` as MoveToken,
      ];
      current = applyMoves(current, moves);
      segments.push({ label: `Insert ${name} edge`, moves });
    }

    return segments;
  },
};
