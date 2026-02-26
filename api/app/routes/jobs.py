from fastapi import APIRouter, HTTPException
from app.models import JobResult

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobResult)
def get_job(job_id: str) -> JobResult:
    # TODO: fetch job status from app.db / Redis
    raise NotImplementedError
