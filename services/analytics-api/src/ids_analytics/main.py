from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Analytics API", version="0.1.0")


class StatusResponse(BaseModel):
    service: str
    status: str
    mode: str
    version: str


class HealthResponse(BaseModel):
    service: str
    status: str


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
    )
