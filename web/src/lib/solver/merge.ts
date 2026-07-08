// Prepares solver output for UI consumption: merges redundant adjacent moves
// within each segment and flattens a SolveResult into parallel move/annotation
// arrays for playback.
import { FaceId, MoveToken } from "../cube/types";
import { SolveResult, SolverSegment } from "./types";

// Quarter-turn count (clockwise, mod 4) for each token suffix.
const SUFFIX_TURNS: Record<string, number> = { "": 1, "2": 2, "'": 3 };
const TURNS_SUFFIX: Record<number, string> = { 1: "", 2: "2", 3: "'" };

// Merges adjacent same-face moves within each segment to fixpoint
// (X X -> X2, X X' -> nothing, X2 X -> X', ...). A stack reaches the fixpoint
// in one pass: cancelling a pair can make the moves around it adjacent, and
// those meet at the stack top next. Never merges across segment boundaries,
// so labels keep meaning exactly the moves they cover. Segments left with no
// moves are dropped. Pure: input segments and their arrays are not mutated.
export function mergeSegments(segments: SolverSegment[]): SolverSegment[] {
  const merged: SolverSegment[] = [];
  for (const segment of segments) {
    const stack: { face: FaceId; turns: number }[] = [];
    for (const move of segment.moves) {
      const face = move[0] as FaceId;
      const turns = SUFFIX_TURNS[move.slice(1)];
      const top = stack[stack.length - 1];
      if (top && top.face === face) {
        top.turns = (top.turns + turns) % 4;
        if (top.turns === 0) stack.pop();
      } else {
        stack.push({ face, turns });
      }
    }
    if (stack.length > 0) {
      merged.push({
        label: segment.label,
        moves: stack.map(
          ({ face, turns }) => `${face}${TURNS_SUFFIX[turns]}` as MoveToken
        ),
      });
    }
  }
  return merged;
}

// Flattens a SolveResult into a single move list plus a parallel annotation
// list (annotations[i] describes moves[i]), merging each stage's segments
// first. The two arrays always have equal length.
export function flattenResult(result: SolveResult): {
  moves: MoveToken[];
  annotations: { stage: string; label: string }[];
} {
  const moves: MoveToken[] = [];
  const annotations: { stage: string; label: string }[] = [];
  for (const stage of result.stages) {
    for (const segment of mergeSegments(stage.segments)) {
      for (const move of segment.moves) {
        moves.push(move);
        annotations.push({ stage: stage.name, label: segment.label });
      }
    }
  }
  return { moves, annotations };
}
