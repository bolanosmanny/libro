"""
Data Contracts and Pydantic Schemas for the Libro Occupancy & Prediction System.
Defines schemas for real-time telemetry, zone breakdowns, forward forecasts,
and calibration ingestion hooks.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class AcademicPeriod(str, Enum):
    ADD_DROP = "add_drop"
    REGULAR_TERM = "regular_term"
    MIDTERMS = "midterms"
    FINALS_WEEK = "finals_week"
    BREAK_OR_HOLIDAY = "break_or_holiday"


class TrendDirection(str, Enum):
    INCREASING = "increasing"
    STABLE = "stable"
    DECREASING = "decreasing"


class NoiseLevel(str, Enum):
    SILENT = "Silent / Whispers Only (<35 dB)"
    MODERATE = "Moderate / Conversational (40-50 dB)"
    COLLABORATIVE = "Enclosed / Collaborative (45-55 dB)"
    LIVELY = "Lively / Social (55-65 dB)"


class ZoneId(str, Enum):
    CAFE_COLLAB = "cafe_collab"
    GENERAL_STACKS = "general_stacks"
    SILENT_UPPER = "silent_upper"
    GROUP_ROOMS = "group_rooms"


class WeatherConditions(BaseModel):
    temperature_f: float = Field(..., description="Current outdoor temperature in Fahrenheit")
    precipitation_in_hr: float = Field(default=0.0, ge=0.0, description="Precipitation rate in inches per hour")
    is_rainy: bool = Field(default=False, description="Whether rainfall or stormy conditions are active")
    is_cold: bool = Field(default=False, description="Whether temperature is below 45°F / 7°C")


class ZoneTelemetry(BaseModel):
    zone_id: ZoneId
    display_name: str
    floor: str
    occupancy_percentage: float = Field(..., ge=0.0, le=100.0)
    headcount_estimate: int = Field(..., ge=0)
    capacity_total: int = Field(..., gt=0)
    noise_classification: NoiseLevel
    dwell_time_typical_min: str
    trend: TrendDirection
    discrete_units: Optional[dict] = Field(
        default=None,
        description="Optional discrete unit status for quantized zones like study rooms (e.g. rooms_occupied, total_rooms)"
    )


class ForecastBucket(BaseModel):
    timestamp: datetime
    minutes_ahead: int
    predicted_occupancy_percentage: float = Field(..., ge=0.0, le=100.0)
    predicted_headcount: int = Field(..., ge=0)
    confidence_interval_low: float = Field(..., ge=0.0, le=100.0)
    confidence_interval_high: float = Field(..., ge=0.0, le=100.0)
    trend_direction: TrendDirection


class OccupancyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    facility_id: str
    facility_name: str
    timestamp: datetime
    is_open: bool
    master_occupancy_percentage: float = Field(..., ge=0.0, le=100.0)
    total_estimated_headcount: int = Field(..., ge=0)
    total_building_capacity: int = Field(..., gt=0)
    trend: TrendDirection
    trend_delta_30m: float = Field(..., description="Estimated percentage point shift over the next 30 minutes")
    academic_period: AcademicPeriod
    applied_multipliers: dict[str, float]
    zones: List[ZoneTelemetry]
    meta: dict[str, str | int | float] = Field(default_factory=dict)


class ForecastResponse(BaseModel):
    facility_id: str
    generated_at: datetime
    forecast_horizon_hours: int
    forecast_buckets: List[ForecastBucket]


# --- Calibration Ingestion Schemas ---

class CrowdSentimentVote(str, Enum):
    QUIET = "quiet"
    NORMAL = "normal"
    PACKED = "packed"


class CrowdFeedbackIngest(BaseModel):
    facility_id: str
    zone_id: Optional[ZoneId] = None
    vote: CrowdSentimentVote
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class LabClusterTelemetryIngest(BaseModel):
    facility_id: str
    workstations_active: int
    workstations_total: int
    print_jobs_last_hour: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class EnvironmentUpdateRequest(BaseModel):
    academic_period: Optional[AcademicPeriod] = None
    weather: Optional[WeatherConditions] = None
