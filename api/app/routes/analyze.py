from fastapi import APIRouter
from app.models import AnalyzeRequest, AnalyzeResponse

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest) -> AnalyzeResponse:
    # TODO: enqueue CV job via app.jobs
    raise NotImplementedError
