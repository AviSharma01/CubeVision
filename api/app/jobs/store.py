from __future__ import annotations

import threading
import uuid
from typing import Any

_lock = threading.Lock()
_jobs: dict[str, dict[str, Any]] = {}


def create_job() -> str:
    job_id = str(uuid.uuid4())
    with _lock:
        _jobs[job_id] = {"status": "pending", "faces": None, "error": None}
    return job_id


def set_running(job_id: str) -> None:
    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["status"] = "running"


def set_done(job_id: str, faces: dict) -> None:
    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["status"] = "done"
            _jobs[job_id]["faces"] = faces


def set_failed(job_id: str, error: str) -> None:
    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["status"] = "failed"
            _jobs[job_id]["error"] = error


def get_job(job_id: str) -> dict[str, Any] | None:
    with _lock:
        return dict(_jobs.get(job_id, {})) if job_id in _jobs else None
