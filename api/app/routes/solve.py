import kociemba
from fastapi import APIRouter, HTTPException
from app.models import SolveRequest, SolveResponse

router = APIRouter(prefix="/solve", tags=["solve"])


@router.post("", response_model=SolveResponse)
def solve(body: SolveRequest) -> SolveResponse:
    cube_str = body.cube_state.to_kociemba()
    try:
        solution: str = kociemba.solve(cube_str)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid cube state: {exc}")
    moves = solution.strip().split()
    return SolveResponse(moves=moves, move_count=len(moves))
