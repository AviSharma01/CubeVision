import { applyMoves } from "../cube/moves";
import { CubeState } from "../cube/types";
import { firstCorners } from "./stages/firstCorners";
import { orientCorners } from "./stages/orientCorners";
import { secondLayer } from "./stages/secondLayer";
import { whiteCross } from "./stages/whiteCross";
import { yellowCross } from "./stages/yellowCross";
import { SolverStage, SolveResult } from "./types";

// Runs stages in order, applying each stage's segment moves.
// Throws if a stage's isDone is false after its own segments run.
export function solveLBL(state: CubeState, stages: SolverStage[]): SolveResult {
  let current = state;
  const result: SolveResult = { stages: [] };

  for (const stage of stages) {
    const segments = stage.solve(current);
    for (const segment of segments) {
      current = applyMoves(current, segment.moves);
    }
    if (!stage.isDone(current)) {
      throw new Error(
        `Stage "${stage.name}" is not done after applying its own segments`
      );
    }
    result.stages.push({ name: stage.name, segments });
  }

  return result;
}

// Layer-by-layer stages in solve order. Later sessions append to this.
export const STAGES: SolverStage[] = [
  whiteCross,
  firstCorners,
  secondLayer,
  yellowCross,
  orientCorners,
];
