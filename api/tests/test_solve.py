from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

SOLVED = {
    "U": ["W"] * 9,
    "D": ["Y"] * 9,
    "F": ["G"] * 9,
    "B": ["B"] * 9,
    "L": ["O"] * 9,
    "R": ["R"] * 9,
}


def test_solved_state_returns_valid_solution():
    resp = client.post("/solve", json={"cube_state": SOLVED})
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body["moves"], list)
    assert all(isinstance(m, str) for m in body["moves"])
    assert body["move_count"] == len(body["moves"])


def test_invalid_sticker_count_returns_422():
    state = {**SOLVED, "U": ["W"] * 8}
    resp = client.post("/solve", json={"cube_state": state})
    assert resp.status_code == 422


def test_impossible_state_returns_clean_4xx():
    # Two white centers: physically impossible, but passes shape validation.
    faces = {k: list(v) for k, v in SOLVED.items()}
    faces["F"][4] = "W"
    resp = client.post("/solve", json={"cube_state": faces})
    assert resp.status_code == 422
    assert "detail" in resp.json()
