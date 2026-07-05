from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile

from app.cv.detector import detect_face
from app.jobs import store

router = APIRouter(prefix="/analyze", tags=["analyze"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# True color of each face's center sticker, used to anchor white balance
_FACE_COLOR = {"U": "W", "D": "Y", "F": "G", "B": "B", "L": "O", "R": "R"}


def _run_analysis(job_id: str, image_paths: dict[str, str]) -> None:
    store.set_running(job_id)
    try:
        faces: dict[str, dict] = {}
        for face_id, path in image_paths.items():
            stickers = detect_face(path, expected_center=_FACE_COLOR[face_id])
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

    # Validate all sizes before creating the job and temp dir so an oversized
    # upload leaves no state behind
    contents: dict[str, bytes] = {}
    for face_id, file in files.items():
        if file.size is not None and file.size > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File for face {face_id} exceeds the 10MB size limit",
            )

        content = await file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File for face {face_id} exceeds the 10MB size limit",
            )
        contents[face_id] = content

    job_id = store.create_job()
    tmp_dir = os.path.join(tempfile.gettempdir(), "cubevision", job_id)
    os.makedirs(tmp_dir, exist_ok=True)

    image_paths: dict[str, str] = {}
    for face_id, content in contents.items():
        suffix = os.path.splitext(files[face_id].filename or "")[1] or ".jpg"
        dest = os.path.join(tmp_dir, f"{face_id}{suffix}")
        with open(dest, "wb") as f:
            f.write(content)
        image_paths[face_id] = dest

    background_tasks.add_task(_run_analysis, job_id, image_paths)
    return {"job_id": job_id}
