// Second-layer (middle) edges stage.
//
// Each middle edge (no W or Y sticker) is brought to the D layer, turned
// under the center matching its sideways sticker, then inserted with the
// slot's right or left sequence. An edge stuck in an E slot (wrong slot, or
// flipped in place) is first ejected by running that slot's insertion, which
// swaps whatever waits below into the slot and drops the occupant onto D.
//
// The sequences are the D-layer mirror of the textbook cross-on-bottom
// inserts: the E-plane mirror swaps U and D and flips every turn's
// handedness, and this app's D token is itself standard D' (see
// _MOVE_TRANSLATION in the API), so the two inversions cancel on D. Net:
// textbook U becomes D with the same modifier, side-face turns invert —
// textbook U R U' R' U' F' U F becomes D R' D' R D' F D F'.
//
// Derivation from the cycle tables in cube/moves.ts, for the FR slot
// (green-red), right insertion D R' D' R D' F D F': with the edge aligned at
// F7/D1 (green under the F center), the closing F' seats it — the F face
// rotation carries F7 -> F5 and F_CYCLES row [U7, R3, D1, L5] reversed
// carries D1 -> R3, the slot's two stickers. The earlier moves swap the
// slot's old occupant out to D (R' sends F5 -> D5) while D turns keep the
// aligned edge clear, so every first-layer sticker the R/F turns touch is
// restored before the sequence ends. The other three slots are the same
// shape rotated about the U axis; the left variant D' F D F' D R' D' R is
// the same insert approached from the R side (red aligned at R7/D5).
import { applyMoves } from "../../cube/moves";
import { Color, CubeState, FaceId, MoveToken } from "../../cube/types";
import { SolverSegment, SolverStage } from "../types";
import { alignD, D_SLOT, findEdgeSticker, getSticker } from "../util";
import { firstCorners } from "./firstCorners";

// The four middle edges. Each slot pairs aFace's index-5 sticker with its
// clockwise neighbor bFace's index-3 sticker (see EDGE_SLOTS). `right`
// inserts with aColor aligned under aFace; `left` with bColor under bFace.
const MIDDLE_EDGES: {
  name: string;
  aFace: FaceId;
  bFace: FaceId;
  aColor: Color;
  bColor: Color;
  right: MoveToken[];
  left: MoveToken[];
}[] = [
  {
    name: "green-red",
    aFace: "F",
    bFace: "R",
    aColor: "G",
    bColor: "R",
    right: ["D", "R'", "D'", "R", "D'", "F", "D", "F'"],
    left: ["D'", "F", "D", "F'", "D", "R'", "D'", "R"],
  },
  {
    name: "red-blue",
    aFace: "R",
    bFace: "B",
    aColor: "R",
    bColor: "B",
    right: ["D", "B'", "D'", "B", "D'", "R", "D", "R'"],
    left: ["D'", "R", "D", "R'", "D", "B'", "D'", "B"],
  },
  {
    name: "blue-orange",
    aFace: "B",
    bFace: "L",
    aColor: "B",
    bColor: "O",
    right: ["D", "L'", "D'", "L", "D'", "B", "D", "B'"],
    left: ["D'", "B", "D", "B'", "D", "L'", "D'", "L"],
  },
  {
    name: "orange-green",
    aFace: "L",
    bFace: "F",
    aColor: "O",
    bColor: "G",
    right: ["D", "F'", "D'", "F", "D'", "L", "D", "L'"],
    left: ["D'", "L", "D", "L'", "D", "F'", "D'", "F"],
  },
];

// An edge needs at most an eject pass and then an align-and-insert pass;
// needing more means the tables above are wrong.
const PASS_CAP = 3;

export const secondLayer: SolverStage = {
  name: "Second-layer edges",

  isDone(state: CubeState): boolean {
    return (
      firstCorners.isDone(state) &&
      state.F[3] === "G" &&
      state.F[5] === "G" &&
      state.R[3] === "R" &&
      state.R[5] === "R" &&
      state.B[3] === "B" &&
      state.B[5] === "B" &&
      state.L[3] === "O" &&
      state.L[5] === "O"
    );
  },

  solve(state: CubeState): SolverSegment[] {
    const segments: SolverSegment[] = [];
    let current = state;

    for (const edge of MIDDLE_EDGES) {
      const seated = (s: CubeState) =>
        getSticker(s, [edge.aFace, 5]) === edge.aColor &&
        getSticker(s, [edge.bFace, 3]) === edge.bColor;

      for (let pass = 0; !seated(current); pass++) {
        if (pass >= PASS_CAP) {
          throw new Error(
            `Second layer: ${edge.name} edge did not seat within ${PASS_CAP} passes`
          );
        }
        const [face, index] = findEdgeSticker(current, edge.aColor, edge.bColor);

        // Stuck in an E slot: insert into that slot to eject it onto D.
        if (face !== "D" && index !== 7) {
          if (index !== 3 && index !== 5) {
            throw new Error(
              `Second layer: ${edge.name} edge is in the top layer; earlier stages are incomplete`
            );
          }
          const slot = MIDDLE_EDGES.find((e) =>
            index === 5 ? e.aFace === face : e.bFace === face
          )!;
          current = applyMoves(current, slot.right);
          segments.push({
            label: `Eject ${edge.name} edge from the wrong slot`,
            moves: [...slot.right],
          });
          continue;
        }

        // In the D layer: the sideways sticker picks the insertion variant.
        const rightVariant = face !== "D"; // aColor faces sideways
        const alignFace = rightVariant ? edge.aFace : edge.bFace;
        const sideColor = rightVariant ? edge.aColor : edge.bColor;
        const downColor = rightVariant ? edge.bColor : edge.aColor;
        const alignMoves = alignD(
          current,
          (s) =>
            s[alignFace][7] === sideColor &&
            s.D[D_SLOT[alignFace]] === downColor,
          `bring the ${edge.name} edge under the ${alignFace} center`
        );
        if (alignMoves.length > 0) {
          current = applyMoves(current, alignMoves);
          segments.push({
            label: `Align ${edge.name} edge under its slot`,
            moves: alignMoves,
          });
        }

        const insert = rightVariant ? edge.right : edge.left;
        current = applyMoves(current, insert);
        segments.push({
          label: `Insert ${edge.name} edge (${rightVariant ? "right" : "left"} insertion)`,
          moves: [...insert],
        });
      }
    }

    return segments;
  },
};
