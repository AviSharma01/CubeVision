// Last-layer corner permutation stage.
//
// Brings every D-layer corner to its correct slot up to a global D rotation,
// visible as matched "headlights": each side face's stickers 6 and 8 equal.
// Because corners are already oriented (Y facing D), a face with matched
// headlights holds a correctly ordered corner pair — piece chirality rules
// out a matched-color pair in swapped slots.
//
// The algorithm is the A-perm. The classic beginner 3-cycle
// (U R U' L' U R' U' L) was derived and rejected computationally: it cycles
// corners but twists them, which would break the orientation stage's
// predicate at this stage's boundary. The A-perm textbook form
// R' F R' B2 R F' R' B2 R2 maps to app tokens by the same E-mirror rule as
// secondLayer.ts (no U/D tokens, so side-face turns just invert), giving
// R F' R B2 R' F R B2 R2. Verified against the cycle tables in
// cube/moves.ts: it cycles three D corners preserving their orientation,
// leaves the first two layers and all D edges untouched, and cubes to the
// identity. Its canonical position (verified from the inverse-applied
// solved state): the placed pair sits on the B face.
import { applyMoves } from "../../cube/moves";
import { CubeState, FaceId, MoveToken } from "../../cube/types";
import { SolverSegment, SolverStage } from "../types";
import { alignD } from "../util";
import { orientCorners } from "./orientCorners";

const CORNER_CYCLE: MoveToken[] = ["R", "F'", "R", "B2", "R'", "F", "R", "B2", "R2"];

const SIDE_FACES: FaceId[] = ["F", "R", "B", "L"];

// A placed pair exists after at most one bootstrap application, and an
// aligned 3-cycle resolves in one or two more; needing a fourth means the
// algorithm or canonical position is wrong.
const APPLICATION_CAP = 3;

function matchedFaces(state: CubeState): FaceId[] {
  return SIDE_FACES.filter((f) => state[f][6] === state[f][8]);
}

export const permuteCorners: SolverStage = {
  name: "Corner permutation",

  isDone(state: CubeState): boolean {
    return orientCorners.isDone(state) && matchedFaces(state).length === 4;
  },

  solve(state: CubeState): SolverSegment[] {
    const segments: SolverSegment[] = [];
    let current = state;

    for (let i = 0; matchedFaces(current).length < 4; i++) {
      if (i >= APPLICATION_CAP) {
        throw new Error(
          `Corner permutation: corners not placed within ${APPLICATION_CAP} applications`
        );
      }
      const hasPlacedPair = matchedFaces(current).length > 0;
      let pre: MoveToken[] = [];
      if (hasPlacedPair) {
        pre = alignD(
          current,
          (s) => s.B[6] === s.B[8],
          "bring the placed corner pair to the back"
        );
      }
      const moves = [...pre, ...CORNER_CYCLE];
      current = applyMoves(current, moves);
      segments.push({
        label: hasPlacedPair
          ? "Cycle the three unplaced corners"
          : "Cycle corners to create a placed pair",
        moves,
      });
    }

    return segments;
  },
};
