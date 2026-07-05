"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Group } from "three";
import { useFrame } from "@react-three/fiber";
import { CubeState, MoveToken, MoveSequence, SOLVED_STATE } from "@/lib/cube/types";
import { buildCubieColors } from "@/lib/cube/stickers";
import { applyMove } from "@/lib/cube/moves";
import {
  MOVE_ROTATION,
  isInMovingFace,
  easeInOut,
  QUARTER_TURN_DURATION,
} from "@/lib/cube/animation";
import { Cubie } from "./Cubie";

const POSITIONS: [number, number, number][] = [];
for (const x of [-1, 0, 1])
  for (const y of [-1, 0, 1])
    for (const z of [-1, 0, 1])
      POSITIONS.push([x, y, z]);

interface AnimData {
  move: MoveToken;
  axis: "x" | "y" | "z";
  targetAngle: number;
  elapsed: number;
  duration: number;
  isUndo?: boolean;
}

function invertMove(move: MoveToken): MoveToken {
  if (move.endsWith("2")) return move;
  if (move.endsWith("'")) return move.slice(0, -1) as MoveToken;
  return (`${move}'`) as MoveToken;
}

export interface PlaybackStatus {
  paused: boolean;
  isAnimating: boolean;
  queueLength: number;
  currentMove: MoveToken | null;
  /** True while the in-flight animation is a stepBack() undo, not a forward move */
  isUndo: boolean;
  /** Moves applied since the last loadState / reset (in order) */
  history: MoveToken[];
  /** Moves still waiting in the queue (in order) */
  pending: MoveToken[];
}

export interface CubeHandle {
  // Queue management
  queueMove(move: MoveToken): void;
  queueMoves(moves: MoveSequence): void;
  clearQueue(): void;
  // Playback control
  pause(): void;
  resume(): void;
  step(): void;          // execute next queued move then re-pause
  stepBack(): void;      // undo the last history move then re-pause
  setSpeed(n: number): void; // speed multiplier (0.5, 1, 2, …)
  reset(): void;         // clear queue + revert to initial state
  loadState(state: CubeState): void; // set cube to a new state, clear queue
  getState(): CubeState;             // read current display state
}

interface Props {
  initialState?: CubeState;
  onStatusChange?: (status: PlaybackStatus) => void;
}

export const RubiksCube = forwardRef<CubeHandle, Props>(
  function RubiksCube({ initialState = SOLVED_STATE, onStatusChange }, ref) {
    // React state — only changes at move boundaries, never mid-animation
    const [displayState, setDisplayState] = useState(initialState);
    const [animMove, setAnimMove] = useState<MoveToken | null>(null);

    // Refs — mutated in useFrame without triggering re-renders
    const displayStateRef = useRef<CubeState>(initialState);
    const initialStateRef = useRef<CubeState>(initialState);
    const animRef = useRef<AnimData | null>(null);
    const queueRef = useRef<MoveToken[]>([]);
    const pivotRef = useRef<Group>(null);
    const pausedRef = useRef(false);
    const speedRef = useRef(1);
    const stepModeRef = useRef(false); // execute one move then re-pause
    const historyRef = useRef<MoveToken[]>([]);
    const onStatusChangeRef = useRef(onStatusChange);
    useEffect(() => {
      onStatusChangeRef.current = onStatusChange; // stay current without re-subscribing
    }, [onStatusChange]);

    const notify = () =>
      onStatusChangeRef.current?.({
        paused: pausedRef.current,
        isAnimating: !!animRef.current,
        queueLength: queueRef.current.length,
        currentMove: animRef.current?.move ?? null,
        isUndo: !!animRef.current?.isUndo,
        history: [...historyRef.current],
        pending: [...queueRef.current],
      });


    useImperativeHandle(ref, () => ({
      queueMove(move) {
        queueRef.current.push(move);
        notify();
      },
      queueMoves(moves) {
        queueRef.current.push(...moves);
        notify();
      },
      clearQueue() {
        queueRef.current = [];
        animRef.current = null;
        notify();
      },
      pause() {
        pausedRef.current = true;
        notify();
      },
      resume() {
        pausedRef.current = false;
        notify();
      },
      step() {
        stepModeRef.current = true;
        // If somehow paused mid-animation, let it finish first
      },
      stepBack() {
        if (animRef.current || historyRef.current.length === 0) return;

        const move = historyRef.current[historyRef.current.length - 1];
        const inverse = invertMove(move);
        queueRef.current.unshift(move);

        const { axis, angle } = MOVE_ROTATION[inverse];
        const baseDuration = inverse.endsWith("2")
          ? QUARTER_TURN_DURATION * 2
          : QUARTER_TURN_DURATION;
        const duration = baseDuration / speedRef.current;

        if (pivotRef.current) pivotRef.current.rotation.set(0, 0, 0);
        animRef.current = {
          move: inverse,
          axis,
          targetAngle: angle,
          elapsed: 0,
          duration,
          isUndo: true,
        };
        setAnimMove(inverse);
        notify();
      },
      setSpeed(n) {
        speedRef.current = n;
      },
      reset() {
        queueRef.current = [];
        animRef.current = null;
        stepModeRef.current = false;
        historyRef.current = [];
        displayStateRef.current = initialStateRef.current;
        if (pivotRef.current) pivotRef.current.rotation.set(0, 0, 0);
        setDisplayState(initialStateRef.current);
        setAnimMove(null);
        notify();
      },
      loadState(state) {
        queueRef.current = [];
        animRef.current = null;
        stepModeRef.current = false;
        pausedRef.current = false;
        historyRef.current = [];
        displayStateRef.current = state;
        initialStateRef.current = state;
        if (pivotRef.current) pivotRef.current.rotation.set(0, 0, 0);
        setDisplayState(state);
        setAnimMove(null);
        notify();
      },
      getState() {
        return displayStateRef.current;
      },
    }));

    useFrame((_, delta) => {
      // --- Start next queued move ---
      if (!animRef.current && queueRef.current.length > 0) {
        // Respect pause unless a step was explicitly requested
        if (pausedRef.current && !stepModeRef.current) return;
        stepModeRef.current = false; // consume the step token

        const move = queueRef.current.shift()!;
        const { axis, angle } = MOVE_ROTATION[move];
        const baseDuration = move.endsWith("2")
          ? QUARTER_TURN_DURATION * 2
          : QUARTER_TURN_DURATION;
        const duration = baseDuration / speedRef.current;

        // Reset pivot rotation before new cubies mount to avoid a 1-frame snap
        if (pivotRef.current) pivotRef.current.rotation.set(0, 0, 0);
        animRef.current = { move, axis, targetAngle: angle, elapsed: 0, duration };
        setAnimMove(move); // one re-render: splits cubies into pivot group
        notify();
        return; // let pivot mount before we start advancing rotation
      }

      if (!animRef.current || !pivotRef.current) return;

      const anim = animRef.current;
      anim.elapsed = Math.min(anim.elapsed + delta, anim.duration);
      const t = easeInOut(anim.elapsed / anim.duration);
      pivotRef.current.rotation[anim.axis] = anim.targetAngle * t;

      if (anim.elapsed >= anim.duration) {
        const newState = applyMove(displayStateRef.current, anim.move);
        displayStateRef.current = newState;
        if (anim.isUndo) {
          historyRef.current.pop();
        } else {
          historyRef.current.push(anim.move);
        }

        animRef.current = null;

        // React 18 batches into a single re-render.
        // Do NOT reset pivot rotation here — it holds its final angle until React
        // empties the pivot group, preventing a 1-frame snap back to position 0.
        setDisplayState(newState);
        setAnimMove(null);
        notify();
      }
    });


    const cubieColors = buildCubieColors(displayState);

    return (
      <group>
        {/* Pivot group — rotates the 9 cubies of the moving face */}
        <group ref={pivotRef}>
          {animMove &&
            POSITIONS.filter((pos) => isInMovingFace(pos, animMove)).map(
              ([x, y, z]) => (
                <Cubie
                  key={`p-${x},${y},${z}`}
                  position={[x, y, z]}
                  colors={cubieColors.get(`${x},${y},${z}`)!}
                />
              )
            )}
        </group>

        {/* Static group — all cubies not currently rotating */}
        {POSITIONS.filter(
          (pos) => !animMove || !isInMovingFace(pos, animMove)
        ).map(([x, y, z]) => (
          <Cubie
            key={`s-${x},${y},${z}`}
            position={[x, y, z]}
            colors={cubieColors.get(`${x},${y},${z}`)!}
          />
        ))}
      </group>
    );
  }
);
