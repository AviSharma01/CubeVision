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

export interface CubeHandle {
  queueMove(move: MoveToken): void;
  queueMoves(moves: MoveSequence): void;
  clearQueue(): void;
}

interface Props {
  initialState?: CubeState;
}

export const RubiksCube = forwardRef<CubeHandle, Props>(
  function RubiksCube({ initialState = SOLVED_STATE }, ref) {
    // React state — only changes at move start/end, never during animation
    const [displayState, setDisplayState] = useState(initialState);
    const [animMove, setAnimMove] = useState<MoveToken | null>(null);

    const displayStateRef = useRef<CubeState>(initialState);
    const animRef = useRef<AnimData | null>(null);
    const queueRef = useRef<MoveToken[]>([]);
    const pivotRef = useRef<Group>(null);



    useImperativeHandle(ref, () => ({
      queueMove(move) {
        queueRef.current.push(move);
      },
      queueMoves(moves) {
        queueRef.current.push(...moves);
      },
      clearQueue() {
        queueRef.current = [];
        animRef.current = null;
      },
    }));

  
    useFrame((_, delta) => {
      if (!animRef.current && queueRef.current.length > 0) {
        const move = queueRef.current.shift()!;
        const { axis, angle } = MOVE_ROTATION[move];
        const isHalf = move.endsWith("2");
        const duration = isHalf
          ? QUARTER_TURN_DURATION * 2
          : QUARTER_TURN_DURATION;
        animRef.current = { move, axis, targetAngle: angle, elapsed: 0, duration };
        setAnimMove(move); // one re-render: splits cubies into pivot group
        return; // advance on the next frame once pivot group is mounted
      }

      // --- Advance current animation ---
      if (!animRef.current || !pivotRef.current) return;

      const anim = animRef.current;
      anim.elapsed = Math.min(anim.elapsed + delta, anim.duration);
      const t = easeInOut(anim.elapsed / anim.duration);
      pivotRef.current.rotation[anim.axis] = anim.targetAngle * t;

      // --- Complete animation ---
      if (anim.elapsed >= anim.duration) {
        const newState = applyMove(displayStateRef.current, anim.move);
        displayStateRef.current = newState;

        pivotRef.current.rotation.set(0, 0, 0); // reset before re-render
        animRef.current = null;

        // React 18 batches these into a single re-render:
        // new colors + all cubies back in the static group
        setDisplayState(newState);
        setAnimMove(null);
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
