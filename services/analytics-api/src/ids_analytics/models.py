"""
IDS Event models for analytics-api.

Defines the normalized event structure compatible with ids-core,
plus score/risk response models.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class Endpoint(BaseModel):
    ip: str = ""
    port: int | None = None
    hostname: str | None = None
    asset_id: str | None = None
    mac: str | None = None


class Event(BaseModel):
    id: str
    timestamp: datetime
    type: str
    severity: str
    protocol: str
    source: Endpoint = Field(default_factory=Endpoint)
    destination: Endpoint = Field(default_factory=Endpoint)
    direction: str = "unknown"
    zone: str = "unknown"
    title: str = ""
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, str] = Field(default_factory=dict)


class ScoreFactor(BaseModel):
    name: str
    impact: int
    reason: str


class ScoreResponse(BaseModel):
    event_id: str
    score: int
    risk_level: str
    factors: list[ScoreFactor] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class BatchScoreRequest(BaseModel):
    items: list[Event]


class BatchScoreResponse(BaseModel):
    items: list[ScoreResponse]
    count: int


class HealthResponse(BaseModel):
    service: str
    status: str


class StatusResponse(BaseModel):
    service: str
    status: str
    mode: str
    version: str
    capabilities: list[str] = Field(default_factory=list)
