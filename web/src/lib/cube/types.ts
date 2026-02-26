// Rubik's cube state model
// Face order: U (up/white), D (down/yellow), F (front/green),
//             B (back/blue), L (left/orange), R (right/red)
// Stickers: 9 per face, row-major, top-left → bottom-right

export type FaceId = "U" | "D" | "F" | "B" | "L" | "R";

// Colors represented by their standard center color
export type Color = "W" | "Y" | "G" | "B" | "O" | "R";

// 9 stickers per face [0..8], index layout:
// 0 1 2
// 3 4 5
// 6 7 8
export type Face = [Color, Color, Color, Color, Color, Color, Color, Color, Color];

export type CubeState = Record<FaceId, Face>;

// Which face each center sticker belongs to (never changes)
export const FACE_COLORS: Record<FaceId, Color> = {
  U: "W",
  D: "Y",
  F: "G",
  B: "B",
  L: "O",
  R: "R",
};

export const FACE_IDS: FaceId[] = ["U", "D", "F", "B", "L", "R"];

export const COLOR_HEX: Record<Color, string> = {
  W: "#FFFFFF",
  Y: "#FFD500",
  G: "#009B48",
  B: "#0045AD",
  O: "#FF5800",
  R: "#B90000",
};

// Standard Rubik's move notation
export type MoveToken =
  | "U" | "U'" | "U2"
  | "D" | "D'" | "D2"
  | "F" | "F'" | "F2"
  | "B" | "B'" | "B2"
  | "L" | "L'" | "L2"
  | "R" | "R'" | "R2";

export type MoveSequence = MoveToken[];

// Solved state (standard color scheme)
export const SOLVED_STATE: CubeState = {
  U: ["W", "W", "W", "W", "W", "W", "W", "W", "W"],
  D: ["Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y"],
  F: ["G", "G", "G", "G", "G", "G", "G", "G", "G"],
  B: ["B", "B", "B", "B", "B", "B", "B", "B", "B"],
  L: ["O", "O", "O", "O", "O", "O", "O", "O", "O"],
  R: ["R", "R", "R", "R", "R", "R", "R", "R", "R"],
};

// Convert CubeState to kociemba string format: URFDLB, 54 chars
// kociemba encodes colors by which face they belong to (U/R/F/D/L/B)
export function toKociembaString(state: CubeState): string {
  // Map from color → face id (center color → face)
  const colorToFace: Record<Color, FaceId> = {
    W: "U", Y: "D", G: "F", B: "B", O: "L", R: "R",
  };
  const faceOrder: FaceId[] = ["U", "R", "F", "D", "L", "B"];
  return faceOrder
    .flatMap((face) => state[face])
    .map((color) => colorToFace[color])
    .join("");
}
