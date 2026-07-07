// Last-layer edge permutation stage — the final stage.
//
// isDone is full solvedness: the state deep-equals SOLVED_STATE. Earlier
// stages legitimately left D rotated because their predicates were
// D-invariant; this one has no such freedom, so it ends with a final D
// alignment turn in its own segment.
//
// The algorithm is the U-perm. The textbook yellow-on-U form
// F2 U L R' F2 L' R U F2 maps to app tokens by the same E-mirror rule as
// secondLayer.ts (textbook U becomes D with the same modifier, side-face
// turns invert), giving F2 D L' R F2 L R' D F2. Verified against the cycle
// tables in cube/moves.ts: it cycles three D edges preserving their
// orientation, leaves the first two layers and all D corners untouched,
// and cubes to the identity. Its canonical position (verified from the
// inverse-applied solved state): the placed edge sits on the B face.
//
// With corners placed, a face's headlights carry that face's color, so an
// edge is correctly placed relative to the corners exactly when it matches
// its face's headlights (sticker 7 equals sticker 6). A double-swap of
// edges shows zero placed edges; one bootstrap application always leaves a
// 3-cycle, which one or two aligned applications resolve.
import { applyMoves } from "../../cube/moves";
import { CubeState, FaceId, MoveToken, SOLVED_STATE } from "../../cube/types";
import { SolverSegment, SolverStage } from "../types";
import { alignD } from "../util";

const EDGE_CYCLE: MoveToken[] = ["F2", "D", "L'", "R", "F2", "L", "R'", "D", "F2"];

const SIDE_FACES: FaceId[] = ["F", "R", "B", "L"];
const FACE_IDS: FaceId[] = ["U", "D", "F", "B", "L", "R"];

// Bootstrap plus at most two aligned applications resolves every legal
// case; needing a fourth means the algorithm or canonical position is
// wrong.
const APPLICATION_CAP = 3;

function placedEdgeFaces(state: CubeState): FaceId[] {
  return SIDE_FACES.filter((f) => state[f][7] === state[f][6]);
}

function isSolved(state: CubeState): boolean {
  return FACE_IDS.every((f) =>
    state[f].every((color, i) => color === SOLVED_STATE[f][i])
  );
}

export const permuteEdges: SolverStage = {
  name: "Edge permutation",

  isDone(state: CubeState): boolean {
    return isSolved(state);
  },

  solve(state: CubeState): SolverSegment[] {
    const segments: SolverSegment[] = [];
    let current = state;

    for (let i = 0; placedEdgeFaces(current).length < 4; i++) {
      if (i >= APPLICATION_CAP) {
        throw new Error(
          `Edge permutation: edges not placed within ${APPLICATION_CAP} applications`
        );
      }
      const hasPlacedEdge = placedEdgeFaces(current).length > 0;
      let pre: MoveToken[] = [];
      if (hasPlacedEdge) {
        pre = alignD(
          current,
          (s) => s.B[7] === s.B[6],
          "bring the placed edge to the back"
        );
      }
      const moves = [...pre, ...EDGE_CYCLE];
      current = applyMoves(current, moves);
      segments.push({
        label: hasPlacedEdge
          ? "Cycle the three unplaced edges"
          : "Cycle edges to create a placed edge",
        moves,
      });
    }

    const align = alignD(current, isSolved, "align the last layer with the centers");
    if (align.length > 0) {
      segments.push({ label: "Align the final layer", moves: align });
    }

    return segments;
  },
};
