"use client";

import {
  forwardRef,
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
}

export interface PlaybackStatus {
  paused: boolean;
  isAnimating: boolean;
  queueLength: number;
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
  setSpeed(n: number): void; // speed multiplier (0.5, 1, 2, …)
  reset(): void;         // clear queue + revert to initial state
  loadState(state: CubeState): void; // set cube to a new state, clear queue
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
    const onStatusChangeRef = useRef(onStatusChange);
    onStatusChangeRef.current = onStatusChange; // stay current without re-subscribing

    const notify = () =>
      onStatusChangeRef.current?.({
        paused: pausedRef.current,
        isAnimating: !!animRef.current,
        queueLength: queueRef.current.length,
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
      setSpeed(n) {
        speedRef.current = n;
      },
      reset() {
        queueRef.current = [];
        animRef.current = null;
        stepModeRef.current = false;
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
        displayStateRef.current = state;
        initialStateRef.current = state;
        if (pivotRef.current) pivotRef.current.rotation.set(0, 0, 0);
        setDisplayState(state);
        setAnimMove(null);
        notify();
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
