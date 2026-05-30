from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ids_analytics.models import (
    BatchScoreRequest,
    BatchScoreResponse,
    Event,
    HealthResponse,
    ScoreResponse,
    StatusResponse,
)
from ids_analytics.scoring import score_event

app = FastAPI(title="Analytics API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

MAX_BATCH = 100


@app.get("/healthz")
def healthz():
    return HealthResponse(service="analytics-api", status="ok")


@app.get("/api/v1/status")
def status():
    return StatusResponse(
        service="analytics-api",
        status="ok",
        mode="development",
        version="0.1.0",
        capabilities=["event_scoring", "risk_explanation", "recommendations"],
    )


@app.post("/api/v1/score/event", response_model=ScoreResponse)
def score_single(event: Event):
    return score_event(event)


@app.post("/api/v1/score/events", response_model=BatchScoreResponse)
def score_batch(request: BatchScoreRequest):
    if not request.items:
        raise HTTPException(status_code=400, detail="items list is empty")
    if len(request.items) > MAX_BATCH:
        raise HTTPException(
            status_code=400,
            detail=f"batch size exceeds maximum of {MAX_BATCH}",
        )
    results = [score_event(evt) for evt in request.items]
    return BatchScoreResponse(items=results, count=len(results))
