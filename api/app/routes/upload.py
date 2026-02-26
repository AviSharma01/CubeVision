from fastapi import APIRouter
from app.models import UploadUrlRequest, UploadUrlResponse

router = APIRouter(prefix="/upload-url", tags=["upload"])


@router.post("", response_model=UploadUrlResponse)
def get_upload_urls(body: UploadUrlRequest) -> UploadUrlResponse:
    # TODO: generate presigned S3 PUT URLs via app.storage
    raise NotImplementedError
