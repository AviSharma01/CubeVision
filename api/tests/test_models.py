from app.models import Color, CubeState

SOLVED = {
    "U": ["W"] * 9,
    "D": ["Y"] * 9,
    "F": ["G"] * 9,
    "B": ["B"] * 9,
    "L": ["O"] * 9,
    "R": ["R"] * 9,
}


def test_solved_state_encodes_urfdlb():
    state = CubeState(**SOLVED)
    assert state.to_kociemba() == "U" * 9 + "R" * 9 + "F" * 9 + "D" * 9 + "L" * 9 + "B" * 9


def test_encoding_maps_by_face_membership_not_color_letter():
    # Swap a corner sticker between U and F; centers stay intact.
    faces = {k: list(v) for k, v in SOLVED.items()}
    faces["U"][0], faces["F"][0] = "G", "W"
    encoded = CubeState(**faces).to_kociemba()

    # URFDLB order: U occupies chars 0-8, F occupies chars 18-26.
    # Green belongs to face F (green center), white to face U — the encoding
    # must use the face letter, not the color letter ("G"/"W").
    assert encoded[0] == "F"
    assert encoded[18] == "U"
    # Centers (index 4 of each face) are unchanged.
    assert encoded[4] == "U"
    assert encoded[22] == "F"
