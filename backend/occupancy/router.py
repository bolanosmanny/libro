"""
Production FastAPI Router for Library Occupancy and Busyness Prediction.

Endpoints:
- GET /v1/libraries/{id}/occupancy: Real-time master and zone telemetry with ETag & 304 support
- GET /v1/libraries/{id}/forecast: Rolling 3-6 hour predictive buckets with confidence intervals
- POST /v1/libraries/{id}/calibration/feedback: Crowdsourced geofenced sentiment vote ingestion
- POST /v1/libraries/{id}/calibration/labs: Real-time computer cluster and printer telemetry ingestion
- POST /v1/libraries/{id}/calibration/environment: Update weather and academic period
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query, Request, Response, status

from .models import (
    AcademicPeriod,
    CrowdFeedbackIngest,
    EnvironmentUpdateRequest,
    ForecastResponse,
    LabClusterTelemetryIngest,
    OccupancyResponse,
    WeatherConditions,
)
from .cache import (
    cache_manager,
    compute_etag,
    generate_rounded_timestamp,
    make_forecast_cache_key,
    make_occupancy_cache_key,
)
from .engine import default_simulator, simulation_worker

router = APIRouter(prefix="/v1/libraries", tags=["Occupancy & Forecasting"])

CACHE_CONTROL_HEADER = "public, max-age=60, stale-while-revalidate=30"


@router.get(
    "/{facility_id}/occupancy",
    response_model=OccupancyResponse,
    summary="Get Live Library Occupancy & Granular Zone Telemetry",
)
async def get_facility_occupancy(
    facility_id: str,
    request: Request,
    if_none_match: Optional[str] = Header(default=None, alias="if-none-match"),
) -> Response:
    """
    Returns live building occupancy percentage, trend direction (+30m derivative),
    and granular zone breakdown across Cafe, General Stacks, Silent Sanctuary, and Study Rooms.

    Optimized for Edge CDNs and client polling via HTTP 304 Not Modified and ETag validation.
    """
    rounded_ts = generate_rounded_timestamp(window_seconds=120)
    cache_key = make_occupancy_cache_key(facility_id, rounded_ts)

    # 1. Check cache layer (Redis or in-memory fallback)
    cached_payload = await cache_manager.get(cache_key)

    if not cached_payload:
        # Check fallback latest key
        cached_payload = await cache_manager.get(f"occupancy:{facility_id}:latest")

    if cached_payload:
        payload_str = cached_payload
    else:
        # Cache miss: compute deterministically on-the-fly and save
        telemetry = default_simulator.generate_current_telemetry(datetime.now())
        payload_str = telemetry.model_dump_json()
        await cache_manager.set(cache_key, payload_str, ttl=120)
        await cache_manager.set(f"occupancy:{facility_id}:latest", payload_str, ttl=120)

    # 2. Compute cryptographic ETag
    etag = compute_etag(payload_str)

    # 3. Handle conditional ETag match -> 304 Not Modified
    if if_none_match and if_none_match.strip() == etag:
        return Response(
            status_code=status.HTTP_304_NOT_MODIFIED,
            headers={
                "ETag": etag,
                "Cache-Control": CACHE_CONTROL_HEADER,
            },
        )

    return Response(
        content=payload_str,
        media_type="application/json",
        status_code=status.HTTP_200_OK,
        headers={
            "ETag": etag,
            "Cache-Control": CACHE_CONTROL_HEADER,
            "X-Cache-Lookup": "HIT" if cached_payload else "MISS",
        },
    )


@router.get(
    "/{facility_id}/forecast",
    response_model=ForecastResponse,
    summary="Get Rolling Forward Occupancy Forecast",
)
async def get_facility_forecast(
    facility_id: str,
    request: Request,
    hours: int = Query(default=6, ge=1, le=12, description="Forecast horizon in hours (1-12)"),
    if_none_match: Optional[str] = Header(default=None, alias="if-none-match"),
) -> Response:
    """
    Returns rolling predictive forecast in 30-minute buckets over the next 3 to 12 hours,
    complete with confidence intervals and step-by-step trend vectors.
    """
    rounded_ts = generate_rounded_timestamp(window_seconds=120)
    cache_key = f"{make_forecast_cache_key(facility_id, rounded_ts)}:h{hours}"

    cached_payload = await cache_manager.get(cache_key)

    if cached_payload:
        payload_str = cached_payload
    else:
        forecast = default_simulator.generate_forecast(datetime.now(), horizon_hours=hours)
        payload_str = forecast.model_dump_json()
        await cache_manager.set(cache_key, payload_str, ttl=120)

    etag = compute_etag(payload_str)

    if if_none_match and if_none_match.strip() == etag:
        return Response(
            status_code=status.HTTP_304_NOT_MODIFIED,
            headers={
                "ETag": etag,
                "Cache-Control": CACHE_CONTROL_HEADER,
            },
        )

    return Response(
        content=payload_str,
        media_type="application/json",
        status_code=status.HTTP_200_OK,
        headers={
            "ETag": etag,
            "Cache-Control": CACHE_CONTROL_HEADER,
        },
    )


@router.post(
    "/{facility_id}/calibration/feedback",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit Crowdsourced Busyness Sentiment Vote",
)
async def submit_crowdsourced_feedback(
    facility_id: str,
    vote: CrowdFeedbackIngest,
) -> dict:
    """
    Ingests geofenced student sentiment feedback (quiet, normal, packed).
    Validates campus proximity and adapts Bayesian calibration weights.
    """
    vote.facility_id = facility_id
    accepted = default_simulator.calibration_engine.ingest_crowd_vote(vote)
    if not accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback rejected: user coordinates lie outside campus geofence boundary.",
        )
    return {"status": "accepted", "message": "Feedback successfully incorporated into calibration filter."}


@router.post(
    "/{facility_id}/calibration/labs",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest Physical Surrogate Computer Lab & Printer Telemetry",
)
async def ingest_lab_cluster_metrics(
    facility_id: str,
    metrics: LabClusterTelemetryIngest,
) -> dict:
    """
    Registers active workstation and printer fleet pressure to adjust physical baseline calibration.
    """
    metrics.facility_id = facility_id
    default_simulator.calibration_engine.ingest_lab_telemetry(metrics)
    return {"status": "accepted", "workstations_active": metrics.workstations_active}


@router.post(
    "/{facility_id}/calibration/environment",
    status_code=status.HTTP_200_OK,
    summary="Update Environmental Parameters (Academic Period & Weather)",
)
async def update_environment_overrides(
    facility_id: str,
    update: EnvironmentUpdateRequest,
) -> dict:
    """
    Updates simulator environment multipliers (e.g., during finals week or snow/storm weather).
    """
    if update.academic_period:
        default_simulator.set_academic_period(update.academic_period)
    if update.weather:
        default_simulator.update_weather(update.weather)

    # Trigger immediate cache update
    await simulation_worker.compute_and_cache_cycle()
    return {
        "status": "updated",
        "academic_period": default_simulator.current_academic_period,
        "weather": default_simulator.current_weather.model_dump(),
    }
