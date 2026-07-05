from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)

FACES = ["U", "D", "F", "B", "L", "R"]


def png_bytes(rgb: tuple[int, int, int] = (255, 255, 255)) -> bytes:
    buf = BytesIO()
    Image.new("RGB", (30, 30), rgb).save(buf, format="PNG")
    return buf.getvalue()


def test_oversized_upload_returns_413():
    small = png_bytes()
    files = {f: (f"{f}.png", small, "image/png") for f in FACES}
    files["U"] = ("U.jpg", b"\x00" * (10 * 1024 * 1024 + 1), "image/jpeg")
    resp = client.post("/analyze", files=files)
    assert resp.status_code == 413


def test_valid_upload_returns_job_id():
    files = {f: (f"{f}.png", png_bytes(), "image/png") for f in FACES}
    resp = client.post("/analyze", files=files)
    assert resp.status_code == 200
    job_id = resp.json()["job_id"]
    assert isinstance(job_id, str) and job_id
