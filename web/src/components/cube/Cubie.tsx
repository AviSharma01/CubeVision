import { RoundedBox } from "@react-three/drei";
import { CubieColors, BLACK } from "@/lib/cube/stickers";

const SIZE = 0.96;          // cubie body; small gap between neighbours
const STICKER = 0.80;       // sticker plane edge length
const STICKER_LIFT = 0.003; // sit just above the plastic to avoid z-fighting

// Placement of a sticker plane for each material slot.
// Slot order matches BoxGeometry / stickers.ts: +X, -X, +Y, -Y, +Z, -Z
// A plane faces +Z by default, so each entry rotates it to face outward.
const H = SIZE / 2 + STICKER_LIFT;
const Q = Math.PI / 2;

const STICKER_TRANSFORMS: {
  position: [number, number, number];
  rotation: [number, number, number];
}[] = [
  { position: [ H, 0, 0], rotation: [0,  Q, 0] }, // +X
  { position: [-H, 0, 0], rotation: [0, -Q, 0] }, // -X
  { position: [0,  H, 0], rotation: [-Q, 0, 0] }, // +Y
  { position: [0, -H, 0], rotation: [ Q, 0, 0] }, // -Y
  { position: [0, 0,  H], rotation: [0, 0, 0] },  // +Z
  { position: [0, 0, -H], rotation: [0, Math.PI, 0] }, // -Z
];

interface Props {
  position: [number, number, number];
  colors: CubieColors; // [+X, -X, +Y, -Y, +Z, -Z]
}

export function Cubie({ position, colors }: Props) {
  return (
    <group position={position}>
      {/* Black plastic body */}
      <RoundedBox args={[SIZE, SIZE, SIZE]} radius={0.07} smoothness={4}>
        <meshStandardMaterial color="#151517" roughness={0.45} metalness={0.05} />
      </RoundedBox>

      {/* Stickers — only on faces that actually have one */}
      {colors.map((color, i) =>
        color === BLACK ? null : (
          <mesh
            key={i}
            position={STICKER_TRANSFORMS[i].position}
            rotation={STICKER_TRANSFORMS[i].rotation}
          >
            <planeGeometry args={[STICKER, STICKER]} />
            <meshStandardMaterial color={color} roughness={0.28} metalness={0} />
          </mesh>
        )
      )}
    </group>
  );
}
