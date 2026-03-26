import kociemba
from fastapi import APIRouter, HTTPException
from app.models import SolveRequest, SolveResponse

router = APIRouter(prefix="/solve", tags=["solve"])

_MOVE_TRANSLATION = {"U": "U'", "U'": "U", "D": "D'", "D'": "D"}


@router.post("", response_model=SolveResponse)
def solve(body: SolveRequest) -> SolveResponse:
    cube_str = body.cube_state.to_kociemba()
    try:
        solution: str = kociemba.solve(cube_str)
    except Exception:
        raise HTTPException(
            status_code=422,
            detail=(
                "This cube position can't be solved. "
                "Make sure each color appears exactly 9 times and the stickers "
                "match a real, physically possible cube state."
            ),
        )
    moves = [_MOVE_TRANSLATION.get(m, m) for m in solution.strip().split()]
    return SolveResponse(moves=moves, move_count=len(moves))
