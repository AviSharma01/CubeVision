from PIL import Image

from app.cv.detector import detect_face

# Standard cube sticker RGBs; each classifies to its letter with confidence
# well above 0.65 against REFERENCE_LAB.
RGB = {
    "W": (255, 255, 255),
    "Y": (255, 213, 0),
    "G": (0, 155, 72),
    "B": (0, 70, 173),
    "O": (255, 88, 0),
    "R": (183, 18, 52),
}

CELL = 60
MARGIN = 5


def draw_face(colors: list[tuple[int, int, int]], path: str) -> None:
    """3x3 grid of solid stickers with margins on a black background."""
    img = Image.new("RGB", (CELL * 3, CELL * 3), (0, 0, 0))
    for i, rgb in enumerate(colors):
        row, col = divmod(i, 3)
        x0, y0 = col * CELL + MARGIN, row * CELL + MARGIN
        img.paste(rgb, (x0, y0, x0 + CELL - 2 * MARGIN, y0 + CELL - 2 * MARGIN))
    img.save(path, format="PNG")


def test_detects_known_colors_with_high_confidence(tmp_path):
    letters = ["W", "Y", "G", "B", "O", "R", "G", "W", "R"]
    path = str(tmp_path / "face.png")
    draw_face([RGB[c] for c in letters], path)

    results = detect_face(path)

    assert [r["color"] for r in results] == letters
    assert all(r["confidence"] >= 0.65 for r in results)


# Mixed grid with a white center (index 4) for the white-balance tests.
WB_LETTERS = ["W", "Y", "G", "W", "W", "B", "O", "R", "W"]


def cast(rgb: tuple[int, int, int], factors: tuple[float, float, float]) -> tuple[int, int, int]:
    """Simulate a lighting color cast by scaling channels."""
    return tuple(min(255, round(c * f)) for c, f in zip(rgb, factors))


def test_expected_center_is_noop_under_neutral_light(tmp_path):
    path = str(tmp_path / "neutral.png")
    draw_face([RGB[c] for c in WB_LETTERS], path)

    assert detect_face(path) == detect_face(path, expected_center="W")


def test_warm_cast_recovered_by_center_correction(tmp_path):
    # Cast calibrated so that uncorrected white confidence drops markedly
    # (0.722 vs 1.0 neutral) while the center stays within TRUST_THRESHOLD
    # (deviation 22.3 < 45.0).
    path = str(tmp_path / "warm.png")
    draw_face([cast(RGB[c], (1.0, 0.94, 0.78)) for c in WB_LETTERS], path)

    uncorrected = detect_face(path)
    corrected = detect_face(path, expected_center="W")

    white_cells = [i for i, c in enumerate(WB_LETTERS) if c == "W"]
    assert all(uncorrected[i]["confidence"] < 0.75 for i in white_cells)
    assert [r["color"] for r in corrected] == WB_LETTERS
    assert all(corrected[i]["confidence"] >= 0.9 for i in white_cells if i != 4)
    # The center itself is never corrected, so a suspect center stays visible
    assert corrected[4] == uncorrected[4]


def test_extreme_cast_skips_correction(tmp_path):
    # Center deviation 62.8 exceeds TRUST_THRESHOLD (45.0), so the correction
    # is skipped and results match the uncorrected call.
    path = str(tmp_path / "extreme.png")
    draw_face([cast(RGB[c], (1.0, 0.7, 0.35)) for c in WB_LETTERS], path)

    assert detect_face(path, expected_center="W") == detect_face(path)


def test_ambiguous_color_is_flagged_low_confidence(tmp_path):
    # Purple sits between the R and B references in LAB space; assert only
    # that the detector reports low confidence, not which color it picks.
    colors = [RGB["W"]] * 9
    colors[4] = (140, 60, 120)
    path = str(tmp_path / "ambiguous.png")
    draw_face(colors, path)

    results = detect_face(path)

    assert results[4]["confidence"] < 0.6
