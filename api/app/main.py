from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import upload, analyze, jobs, solve

app = FastAPI(title="CubeVision API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(analyze.router)
app.include_router(jobs.router)
app.include_router(solve.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
