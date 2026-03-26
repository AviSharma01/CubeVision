# CubeVision

I wanted a way to visually follow along with a Rubik's Cube solution - not just read a move sequence, but actually watch each turn happen and start recognising patterns I could internalise while solving. CubeVision lets you scan your cube, generates a solution, and plays it back move by move in 3D.

---

![Demo](demo.gif)

---

## How it works

1. **Scan** - upload a photo of each face. The CV pipeline divides each image into a 3×3 grid, samples the centre of each cell in LAB colour space, and matches it to the nearest reference colour. Each sticker gets a confidence score; low-confidence detections are flagged for manual correction before solving.

2. **Solve** - the cube state is encoded as a 54-character string in URFDLB face order and passed to Kociemba's two-phase algorithm, which returns an optimal move sequence.

3. **Playback** - 27 individual cubies are rendered in Three.js. Each move rotates a pivot group of 9 cubies with eased animation. A move indicator shows the current turn and progress through the sequence.

---

## Features

- Photo scan with per-sticker confidence scoring and inline correction for low-confidence detections
- Manual entry with a sticker painter and per-colour validation (exactly 9 of each)
- Animated 3D playback with play / pause / step / speed controls

---

## Stack

- **Frontend** - Next.js, TypeScript, Tailwind, react-three-fiber
- **Backend** - FastAPI, kociemba (Python), Pillow + numpy for CV
- **Infra** - Docker Compose (web + api)

---

## Running locally

```bash
docker-compose up
```

Frontend at `http://localhost:3000`, API at `http://localhost:8000`.

Or run separately:

```bash
# API
cd api && pip install -r requirements.txt
uvicorn app.main:app --reload

# Web
cd web && npm install
npm run dev
```
