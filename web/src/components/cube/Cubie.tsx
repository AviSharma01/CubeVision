import { CubieColors } from "@/lib/cube/stickers";

const SIZE = 0.93; // leaves a visible gap between cubies

interface Props {
  position: [number, number, number];
  colors: CubieColors; // [+X, -X, +Y, -Y, +Z, -Z]
}

export function Cubie({ position, colors }: Props) {
  return (
    <mesh position={position}>
      <boxGeometry args={[SIZE, SIZE, SIZE]} />
      {colors.map((color, i) => (
        <meshStandardMaterial key={i} attach={`material-${i}`} color={color} />
      ))}
    </mesh>
  );
}
