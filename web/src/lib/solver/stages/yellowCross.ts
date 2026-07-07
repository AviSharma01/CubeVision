// Yellow cross stage (last-layer edge orientation).
//
// The white cross is on U, so the last layer is D and every algorithm acts
// on the D face. The textbook yellow-on-U sequence F R U R' U' F' maps to
// app tokens by the same E-mirror rule as secondLayer.ts (textbook U
// becomes D with the same modifier, side-face turns invert), giving
// F' R' D R D' F. Verified against the cycle tables in cube/moves.ts: it
// preserves the first two layers and each application advances the D-edge
// pattern one step, dot -> L-shape -> line -> cross.
//
// Case positions (verified computationally, not transcribed): the L-shape
// must sit at the back and left edges (D3/D7) and the line horizontal
// (D3/D5) before applying; a dot works from any angle. From the canonical
// L the algorithm always yields the horizontal line.
import { applyMoves } from "../../cube/moves";
import { CubeState, MoveToken } from "../../cube/types";
import { SolverSegment, SolverStage } from "../types";
import { alignD } from "../util";
import { secondLayer } from "./secondLayer";

const CROSS_ALG: MoveToken[] = ["F'", "R'", "D", "R", "D'", "F"];

const EDGE_INDICES = [1, 3, 5, 7];

// dot -> L -> line -> cross is at most 3 applications; needing a 4th means
// the cube's edge orientation is illegal.
const APPLICATION_CAP = 4;

function yellowEdges(state: CubeState): number[] {
  return EDGE_INDICES.filter((i) => state.D[i] === "Y");
}

export const yellowCross: SolverStage = {
  name: "Yellow cross",

  isDone(state: CubeState): boolean {
    return (
      secondLayer.isDone(state) &&
      state.D[1] === "Y" &&
      state.D[3] === "Y" &&
      state.D[5] === "Y" &&
      state.D[7] === "Y"
    );
  },

  solve(state: CubeState): SolverSegment[] {
    const segments: SolverSegment[] = [];
    let current = state;

    for (let i = 0; yellowEdges(current).length < 4; i++) {
      if (i >= APPLICATION_CAP) {
        throw new Error(
          `Yellow cross: not formed within ${APPLICATION_CAP} applications; edge orientation is illegal`
        );
      }
      const pattern = yellowEdges(current);
      let label: string;
      let pre: MoveToken[] = [];
      if (pattern.length === 0) {
        label = "Yellow cross: dot → L-shape";
      } else if (pattern.length === 2) {
        const opposite =
          (pattern[0] === 1 && pattern[1] === 7) ||
          (pattern[0] === 3 && pattern[1] === 5);
        const canonical = opposite ? [3, 5] : [3, 7];
        label = opposite
          ? "Yellow cross: line → cross"
          : "Yellow cross: L-shape → line";
        pre = alignD(
          current,
          (s) => canonical.every((k) => s.D[k] === "Y"),
          `set the yellow ${opposite ? "line horizontal" : "L-shape at back-left"}`
        );
      } else {
        throw new Error(
          `Yellow cross: ${pattern.length} oriented edges is not a legal case`
        );
      }
      const moves = [...pre, ...CROSS_ALG];
      current = applyMoves(current, moves);
      segments.push({ label, moves });
    }

    return segments;
  },
};
