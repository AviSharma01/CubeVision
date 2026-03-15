from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile

from app.cv.detector import detect_face
from app.jobs import store

router = APIRouter(prefix="/analyze", tags=["analyze"])


def _run_analysis(job_id: str, image_paths: dict[str, str]) -> None:
    store.set_running(job_id)
    try:
        faces: dict[str, dict] = {}
        for face_id, path in image_paths.items():
            stickers = detect_face(path)
            faces[face_id] = {
                "stickers": stickers,
                "face_confidence": round(
                    sum(s["confidence"] for s in stickers) / len(stickers), 3
                ),
            }
        store.set_done(job_id, faces)
    except Exception as exc:
        store.set_failed(job_id, str(exc))
    finally:
        for path in image_paths.values():
            try:
                os.remove(path)
            except OSError:
                pass
        try:
            os.rmdir(os.path.dirname(next(iter(image_paths.values()))))
        except OSError:
            pass


@router.post("")
async def analyze(
    background_tasks: BackgroundTasks,
    U: UploadFile,
    D: UploadFile,
    F: UploadFile,
    B: UploadFile,
    L: UploadFile,
    R: UploadFile,
) -> dict:
    files = {"U": U, "D": D, "F": F, "B": B, "L": L, "R": R}

    for face_id, file in files.items():
        if file.content_type and not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=422,
                detail=f"File for face {face_id} is not an image (got {file.content_type})",
            )

    job_id = store.create_job()
    tmp_dir = os.path.join(tempfile.gettempdir(), "cubevision", job_id)
    os.makedirs(tmp_dir, exist_ok=True)

    image_paths: dict[str, str] = {}
    for face_id, file in files.items():
        suffix = os.path.splitext(file.filename or "")[1] or ".jpg"
        dest = os.path.join(tmp_dir, f"{face_id}{suffix}")
        content = await file.read()
        with open(dest, "wb") as f:
            f.write(content)
        image_paths[face_id] = dest

    background_tasks.add_task(_run_analysis, job_id, image_paths)
    return {"job_id": job_id}
