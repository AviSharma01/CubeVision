from __future__ import annotations

import numpy as np
from PIL import Image

# Reference LAB values for the 6 standard Rubik's cube colors
REFERENCE_LAB: dict[str, np.ndarray] = {
    "W": np.array([100.0,   0.0,   0.0]),
    "Y": np.array([ 97.0,  -8.0,  86.0]),
    "G": np.array([ 36.0, -44.0,  38.0]),
    "B": np.array([ 29.0,  14.0, -50.0]),
    "O": np.array([ 60.0,  38.0,  60.0]),
    "R": np.array([ 41.0,  57.0,  40.0]),
}

# Distance at which confidence reaches 0 (calibrated experimentally)
MAX_DIST = 80.0


def _srgb_to_lab(rgb_u8: np.ndarray) -> np.ndarray:
    """Convert an RGB pixel (uint8, shape (3,)) to CIE-LAB."""
    rgb = rgb_u8.astype(np.float64) / 255.0

    # Gamma expansion (sRGB → linear)
    linear = np.where(
        rgb > 0.04045,
        ((rgb + 0.055) / 1.055) ** 2.4,
        rgb / 12.92,
    )

    # Linear RGB → XYZ (D65 white point)
    M = np.array([
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041],
    ])
    xyz = M @ linear
    xyz /= np.array([0.95047, 1.00000, 1.08883])

    # XYZ → LAB
    eps, kappa = 0.008856, 903.3

    def f(t: np.ndarray) -> np.ndarray:
        return np.where(t > eps, t ** (1.0 / 3.0), (kappa * t + 16.0) / 116.0)

    fx, fy, fz = f(xyz)
    return np.array([116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)])


def _nearest_color(lab: np.ndarray) -> tuple[str, float]:
    best_color = "W"
    best_dist = float("inf")
    for color, ref in REFERENCE_LAB.items():
        dist = float(np.linalg.norm(lab - ref))
        if dist < best_dist:
            best_dist = dist
            best_color = color
    return best_color, round(max(0.0, 1.0 - best_dist / MAX_DIST), 3)


def detect_face(image_path: str) -> list[dict]:
    img = Image.open(image_path).convert("RGB")
    w, h = img.size
    results: list[dict] = []

    for row in range(3):
        for col in range(3):
            x0, x1 = col * w // 3, (col + 1) * w // 3
            y0, y1 = row * h // 3, (row + 1) * h // 3
            # Sample centre 60% of each cell to avoid edge reflections
            pad_x, pad_y = (x1 - x0) // 5, (y1 - y0) // 5
            cell = img.crop((x0 + pad_x, y0 + pad_y, x1 - pad_x, y1 - pad_y))
            median_rgb = np.median(np.array(cell).reshape(-1, 3), axis=0)
            color, confidence = _nearest_color(_srgb_to_lab(median_rgb))
            results.append({"color": color, "confidence": confidence})

    return results
