from enum import Enum
from typing import Annotated
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Cube state
# ---------------------------------------------------------------------------

class FaceId(str, Enum):
    U = "U"  # Up    / White
    D = "D"  # Down  / Yellow
    F = "F"  # Front / Green
    B = "B"  # Back  / Blue
    L = "L"  # Left  / Orange
    R = "R"  # Right / Red


class Color(str, Enum):
    W = "W"  # White
    Y = "Y"  # Yellow
    G = "G"  # Green
    B = "B"  # Blue
    O = "O"  # Orange
    R = "R"  # Red


# 9 stickers per face, row-major (top-left → bottom-right)
Stickers = Annotated[list[Color], Field(min_length=9, max_length=9)]

class CubeState(BaseModel):
    U: Stickers
    D: Stickers
    F: Stickers
    B: Stickers
    L: Stickers
    R: Stickers

    def to_kociemba(self) -> str:
        """Encode as kociemba string: URFDLB order, 54 chars."""
        color_to_face = {"W": "U", "Y": "D", "G": "F", "B": "B", "O": "L", "R": "R"}
        face_order = ["U", "R", "F", "D", "L", "B"]
        stickers = []
        for face in face_order:
            stickers.extend(getattr(self, face))
        return "".join(color_to_face[s.value] for s in stickers)


# ---------------------------------------------------------------------------
# API request / response shapes
# ---------------------------------------------------------------------------

class UploadUrlRequest(BaseModel):
    face_count: int = 6


class UploadUrlResponse(BaseModel):
    upload_urls: dict[str, str]   # face_id → presigned PUT url
    image_keys: dict[str, str]    # face_id → storage key


class AnalyzeRequest(BaseModel):
    image_keys: dict[str, str]    # face_id → storage key


class AnalyzeResponse(BaseModel):
    job_id: str


class StickerResult(BaseModel):
    color: Color
    confidence: float             # 0.0–1.0


class FaceResult(BaseModel):
    stickers: list[StickerResult] # 9 items
    face_confidence: float        # overall face confidence


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    done = "done"
    failed = "failed"


class JobResult(BaseModel):
    job_id: str
    status: JobStatus
    faces: dict[str, FaceResult] | None = None   # populated when done
    error: str | None = None


class SolveRequest(BaseModel):
    cube_state: CubeState
    method: str = "kociemba"


class SolveResponse(BaseModel):
    moves: list[str]              # e.g. ["R", "U", "R'", "U'"]
    move_count: int
