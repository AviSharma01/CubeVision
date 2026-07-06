// Beginner (layer-by-layer) solver interfaces.
// Stages are implemented one per session; see index.ts for the runner.
import { CubeState, MoveToken } from "../cube/types";

export interface SolverSegment {
  label: string; // human reason, e.g. "Insert white-red edge"
  moves: MoveToken[];
}

export interface SolverStage {
  name: string; // e.g. "White cross"
  isDone(state: CubeState): boolean;
  // Returns annotated segments that take `state` to a state where
  // isDone(result) is true. Must be a pure function of state.
  solve(state: CubeState): SolverSegment[];
}

export interface SolveResult {
  stages: { name: string; segments: SolverSegment[] }[];
}
