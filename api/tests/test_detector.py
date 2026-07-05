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


def test_ambiguous_color_is_flagged_low_confidence(tmp_path):
    # Purple sits between the R and B references in LAB space; assert only
    # that the detector reports low confidence, not which color it picks.
    colors = [RGB["W"]] * 9
    colors[4] = (140, 60, 120)
    path = str(tmp_path / "ambiguous.png")
    draw_face(colors, path)

    results = detect_face(path)

    assert results[4]["confidence"] < 0.6
