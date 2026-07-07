// Last-layer corner orientation stage (repeated corner twist).
//
// Each misoriented D corner is brought to the front-right slot (D2/F8/R6)
// with a D turn, then twisted in place with pairs of A = R U' R' U — the
// textbook R' D' R D under the same E-mirror rule as secondLayer.ts.
// Verified against the cycle tables in cube/moves.ts: A^6 is the identity,
// and A^2 twists the front-right corner in its slot while its only other
// effect is a permutation P of first-two-layer pieces with P^3 = identity.
//
// Mid-stage the first two layers look broken; that is expected. Each
// misoriented corner needs one or two A^2 pairs (twist 1 or 2), and corner
// twists on a legal cube sum to 0 mod 3, so the total pair count is a
// multiple of 3 and the accumulated damage P^(3m) cancels exactly when the
// last corner orients. The interleaved D turns move only D-layer pieces,
// disjoint from P's support, so they cannot smear the damage. A trailing D
// misalignment is harmless: this stage's predicate and every earlier one is
// invariant under D turns.
import { applyMoves } from "../../cube/moves";
import { CubeState, MoveToken } from "../../cube/types";
import { SolverSegment, SolverStage } from "../types";
import { alignD } from "../util";
import { yellowCross } from "./yellowCross";

const TWIST_PAIR: MoveToken[] = ["R", "U'", "R'", "U", "R", "U'", "R'", "U"];

const CORNER_INDICES = [0, 2, 6, 8];

// At most all four corners are misoriented; a fifth round means the tables
// or the twist sequence are wrong.
const ROUND_CAP = 4;

// A corner is twisted by 1 or 2; each pair advances the twist by one, so a
// third pair means the corner is not twisting at all.
const PAIR_CAP = 2;

export const orientCorners: SolverStage = {
  name: "Yellow corners",

  isDone(state: CubeState): boolean {
    return yellowCross.isDone(state) && state.D.every((c) => c === "Y");
  },

  solve(state: CubeState): SolverSegment[] {
    const segments: SolverSegment[] = [];
    let current = state;

    for (
      let round = 0;
      CORNER_INDICES.some((i) => current.D[i] !== "Y");
      round++
    ) {
      if (round >= ROUND_CAP) {
        throw new Error(
          `Yellow corners: corners still misoriented after ${ROUND_CAP} rounds`
        );
      }
      const align = alignD(
        current,
        (s) => s.D[2] !== "Y",
        "bring a misoriented corner to the front-right slot"
      );
      if (align.length > 0) {
        current = applyMoves(current, align);
        segments.push({
          label: "Bring a misoriented corner to the front-right slot",
          moves: align,
        });
      }
      for (let pair = 0; current.D[2] !== "Y"; pair++) {
        if (pair >= PAIR_CAP) {
          throw new Error(
            `Yellow corners: front-right corner not oriented within ${PAIR_CAP} twist pairs`
          );
        }
        current = applyMoves(current, TWIST_PAIR);
        segments.push({
          label: "Twist the front-right corner in place",
          moves: [...TWIST_PAIR],
        });
      }
    }

    return segments;
  },
};
