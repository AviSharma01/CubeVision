// First-layer corners stage.
//
// Each white corner is brought into the D layer, turned under its target slot,
// then seated by repeating that slot's "sexy move". In this app's tokens the
// sequence is X' D X D' (X = the slot's side face): the frontend's D turn is
// the mirror of standard notation (see _MOVE_TRANSLATION in the API), so the
// standard cross-on-top insertion X' D' X D mirrors to X' D X D'.
//
// Derivation from the cycle tables in cube/moves.ts, for the U8/F2/R0 slot:
// R' sends U8 -> F8, F2 -> D2, R0 -> R6 (the D2/F8/R6 slot directly beneath),
// so one rep lifts whatever waits below into the slot. A rep touches only the
// slot's side face and D: the cross edge it moves (R' sends U5 -> F5) and the
// neighboring U corner (R' sends U2/B0/R2 to U8/F2/R0) are put back by the
// closing R before either D turn can reach them, so seated work survives.
// The other three slots are the same shape rotated about the U axis.
import { applyMoves } from "../../cube/moves";
import { Color, CubeState, MoveToken } from "../../cube/types";
import { SolverSegment, SolverStage } from "../types";
import { alignD, findCornerSlot, getSticker, StickerPos } from "../util";
import { whiteCross } from "./whiteCross";

// The four white corners: colors[i] belongs at slot[i]; belowD is the D-face
// sticker index of the corner slot directly beneath the target.
const FIRST_CORNERS: {
  name: string;
  colors: readonly [Color, Color, Color];
  slot: readonly [StickerPos, StickerPos, StickerPos];
  belowD: number;
  sexy: MoveToken[];
}[] = [
  {
    name: "white-green-red",
    colors: ["W", "G", "R"],
    slot: [["U", 8], ["F", 2], ["R", 0]],
    belowD: 2,
    sexy: ["R'", "D", "R", "D'"],
  },
  {
    name: "white-green-orange",
    colors: ["W", "G", "O"],
    slot: [["U", 6], ["F", 0], ["L", 2]],
    belowD: 0,
    sexy: ["F'", "D", "F", "D'"],
  },
  {
    name: "white-blue-red",
    colors: ["W", "B", "R"],
    slot: [["U", 2], ["B", 0], ["R", 2]],
    belowD: 8,
    sexy: ["B'", "D", "B", "D'"],
  },
  {
    name: "white-blue-orange",
    colors: ["W", "B", "O"],
    slot: [["U", 0], ["B", 2], ["L", 0]],
    belowD: 6,
    sexy: ["L'", "D", "L", "D'"],
  },
];

// Eject sequence for a corner stuck in a U slot, keyed by the slot's U sticker
// index: one rep of that slot's own sexy move drops its occupant into D.
const EJECT_SEXY = new Map(FIRST_CORNERS.map((c) => [c.slot[0][1], c.sexy]));

// A corner below its slot seats on rep 1, 3, or 5 (even reps return it to the
// D layer twisted); needing more means the tables above are wrong.
const SEXY_REP_CAP = 6;

export const firstCorners: SolverStage = {
  name: "First-layer corners",

  isDone(state: CubeState): boolean {
    return (
      whiteCross.isDone(state) &&
      state.U[0] === "W" &&
      state.U[2] === "W" &&
      state.U[6] === "W" &&
      state.U[8] === "W" &&
      state.F[0] === "G" &&
      state.F[2] === "G" &&
      state.R[0] === "R" &&
      state.R[2] === "R" &&
      state.B[0] === "B" &&
      state.B[2] === "B" &&
      state.L[0] === "O" &&
      state.L[2] === "O"
    );
  },

  solve(state: CubeState): SolverSegment[] {
    const segments: SolverSegment[] = [];
    let current = state;

    for (const corner of FIRST_CORNERS) {
      const seated = (s: CubeState) =>
        corner.slot.every((pos, i) => getSticker(s, pos) === corner.colors[i]);
      if (seated(current)) continue;

      // Stuck in the U layer (wrong slot, or right slot misoriented): one
      // sexy move of the occupied slot ejects it into the D layer.
      const [face, index] = findCornerSlot(current, corner.colors)[0];
      if (face === "U") {
        const eject = EJECT_SEXY.get(index)!;
        current = applyMoves(current, eject);
        segments.push({
          label: `Eject ${corner.name} corner from the top layer`,
          moves: [...eject],
        });
      }

      // Turn D until the corner sits directly below its target slot.
      const alignMoves = alignD(
        current,
        (s) => {
          const [f, i] = findCornerSlot(s, corner.colors)[0];
          return f === "D" && i === corner.belowD;
        },
        `bring the ${corner.name} corner under its slot`
      );
      if (alignMoves.length > 0) {
        current = applyMoves(current, alignMoves);
        segments.push({
          label: `Move ${corner.name} corner under its slot`,
          moves: alignMoves,
        });
      }

      // Repeat the slot's sexy move until the corner seats.
      const insertMoves: MoveToken[] = [];
      let reps = 0;
      while (!seated(current)) {
        if (reps >= SEXY_REP_CAP) {
          throw new Error(
            `First-layer corners: ${corner.name} corner did not seat within ${SEXY_REP_CAP} sexy-move repetitions`
          );
        }
        current = applyMoves(current, corner.sexy);
        insertMoves.push(...corner.sexy);
        reps++;
      }
      segments.push({
        label: `Insert ${corner.name} corner (sexy move ×${reps})`,
        moves: insertMoves,
      });
    }

    return segments;
  },
};
