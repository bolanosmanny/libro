"""
Occupancy Simulation Engine & Background Worker.

Runs an asynchronous worker loop every 60 seconds that:
1. Evaluates baseline circadian dynamics, calendar multipliers, weather impact, and stochastic drift
2. Applies ground-truth calibration adjustments
3. Evaluates 30-minute forward derivative for trend classification
4. Synthesizes 4-zone spatial breakdown
5. Generates 6-hour rolling forecast in 30-minute buckets with confidence intervals
6. Serializes and stores payloads in the high-speed cache with timestamp-rounded keys
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from .models import (
    AcademicPeriod,
    ForecastBucket,
    ForecastResponse,
    OccupancyResponse,
    TrendDirection,
    WeatherConditions,
    ZoneId,
)
from .math_dynamics import (
    ACADEMIC_MULTIPLIERS,
    DEFAULT_OPERATING_SCHEDULE,
    StochasticDriftProcess,
    compute_baseline_circadian,
    compute_weather_multiplier,
)
from .zones import compute_zone_telemetries
from .calibration import CalibrationEngine
from .cache import (
    cache_manager,
    generate_rounded_timestamp,
    make_forecast_cache_key,
    make_occupancy_cache_key,
)

logger = logging.getLogger("libro.occupancy")


class FacilitySimulator:
    """Manages stateful simulation dynamics for a specific library facility."""

    def __init__(
        self,
        facility_id: str = "addlestone-main",
        facility_name: str = "Marlene and Nathan Addlestone Library",
        total_capacity: int = 1200,
    ):
        self.facility_id = facility_id
        self.facility_name = facility_name
        self.total_capacity = total_capacity

        # Stateful stochastic drift process
        self.drift_process = StochasticDriftProcess(phi_5min=0.85, sigma_stationary=3.0)

        # Calibration engine
        self.calibration_engine = CalibrationEngine()

        # Operational state
        self.current_academic_period: AcademicPeriod = AcademicPeriod.REGULAR_TERM
        self.current_weather: WeatherConditions = WeatherConditions(
            temperature_f=68.0,
            precipitation_in_hr=0.0,
            is_rainy=False,
            is_cold=False,
        )

    def set_academic_period(self, period: AcademicPeriod) -> None:
        self.current_academic_period = period

    def update_weather(self, weather: WeatherConditions) -> None:
        self.current_weather = weather

    def calculate_state_at(
        self,
        target_dt: datetime,
        include_drift: bool = True,
        drift_override: Optional[float] = None,
    ) -> Tuple[float, bool, Dict[str, float]]:
        """
        Calculates occupancy percentage at a specified datetime.
        Returns: (occupancy_pct, is_open, applied_multipliers)
        """
        # 1. Base circadian curve
        base_pct = compute_baseline_circadian(target_dt)

        weekday = target_dt.weekday()
        hour_frac = target_dt.hour + target_dt.minute / 60.0
        open_hr, close_hr = DEFAULT_OPERATING_SCHEDULE.get(weekday, (8.0, 22.0))
        is_open = (open_hr - 0.5) <= hour_frac <= close_hr

        if not is_open or base_pct <= 0.0:
            return 0.0, False, {"academic": 1.0, "weather": 1.0, "drift": 0.0}

        # 2. Dynamic multipliers
        m_academic = ACADEMIC_MULTIPLIERS.get(self.current_academic_period, 1.0)
        m_weather = compute_weather_multiplier(self.current_weather, hour_frac)

        scaled = base_pct * m_academic * m_weather

        # 3. Continuous stochastic drift
        drift_val = 0.0
        if include_drift:
            drift_val = self.drift_process.value if drift_override is None else drift_override

        raw_final = scaled + drift_val

        # Saturation clamping in [0, 100]
        final_pct = max(0.0, min(100.0, raw_final))

        multipliers = {
            "academic": m_academic,
            "weather": round(m_weather, 2),
            "drift": round(drift_val, 2),
        }
        return final_pct, is_open, multipliers

    def generate_current_telemetry(self, current_dt: Optional[datetime] = None) -> OccupancyResponse:
        """Computes complete real-time occupancy state, zone telemetries, and trend derivative."""
        now = current_dt or datetime.now()

        # Step drift forward by 1 minute interval during real-time evaluation
        self.drift_process.step()

        # Compute current uncalibrated occupancy
        uncalibrated_pct, is_open, multipliers = self.calculate_state_at(now, include_drift=True)

        # Ingest calibration surrogates
        calibrated_pct, kalman_gain = self.calibration_engine.compute_calibrated_occupancy(uncalibrated_pct)

        # Compute 30-minute forward derivative for trend determination
        dt_plus_30 = now + timedelta(minutes=30)
        future_pct, _, _ = self.calculate_state_at(dt_plus_30, include_drift=False)
        delta_30m = future_pct - calibrated_pct

        if delta_30m > 3.0:
            trend = TrendDirection.INCREASING
        elif delta_30m < -3.0:
            trend = TrendDirection.DECREASING
        else:
            trend = TrendDirection.STABLE

        # Zone telemetry breakdown
        zones = compute_zone_telemetries(calibrated_pct, now, is_open, trend)

        total_headcount = int(round((calibrated_pct / 100.0) * self.total_capacity))

        return OccupancyResponse(
            facility_id=self.facility_id,
            facility_name=self.facility_name,
            timestamp=now,
            is_open=is_open,
            master_occupancy_percentage=round(calibrated_pct, 1),
            total_estimated_headcount=total_headcount,
            total_building_capacity=self.total_capacity,
            trend=trend,
            trend_delta_30m=round(delta_30m, 1),
            academic_period=self.current_academic_period,
            applied_multipliers=multipliers,
            zones=zones,
            meta={
                "kalman_gain": kalman_gain,
                "stochastic_drift_offset": round(self.drift_process.value, 2),
            },
        )

    def generate_forecast(
        self,
        current_dt: Optional[datetime] = None,
        horizon_hours: int = 6,
    ) -> ForecastResponse:
        """
        Generates predictive forward forecast in 30-minute buckets.
        Calculates confidence intervals widening over time as stochastic uncertainty accumulates.
        """
        now = current_dt or datetime.now()
        buckets: List[ForecastBucket] = []

        total_steps = horizon_hours * 2  # 30-minute intervals
        for step in range(1, total_steps + 1):
            target_time = now + timedelta(minutes=step * 30)
            pred_pct, is_open, _ = self.calculate_state_at(target_time, include_drift=False)

            # Step derivative
            next_time = target_time + timedelta(minutes=30)
            next_pct, _, _ = self.calculate_state_at(next_time, include_drift=False)
            step_delta = next_pct - pred_pct

            if step_delta > 2.0:
                step_trend = TrendDirection.INCREASING
            elif step_delta < -2.0:
                step_trend = TrendDirection.DECREASING
            else:
                step_trend = TrendDirection.STABLE

            # Confidence interval grows with sqrt(time)
            hours_ahead = (step * 30) / 60.0
            margin = 3.0 + 2.5 * (hours_ahead ** 0.5)
            ci_low = max(0.0, pred_pct - margin)
            ci_high = min(100.0, pred_pct + margin)

            pred_headcount = int(round((pred_pct / 100.0) * self.total_capacity))

            buckets.append(
                ForecastBucket(
                    timestamp=target_time,
                    minutes_ahead=step * 30,
                    predicted_occupancy_percentage=round(pred_pct, 1),
                    predicted_headcount=pred_headcount,
                    confidence_interval_low=round(ci_low, 1),
                    confidence_interval_high=round(ci_high, 1),
                    trend_direction=step_trend,
                )
            )

        return ForecastResponse(
            facility_id=self.facility_id,
            generated_at=now,
            forecast_horizon_hours=horizon_hours,
            forecast_buckets=buckets,
        )


class SimulationWorker:
    """Async background worker executing periodic simulation and cache precomputation."""

    def __init__(self, simulator: FacilitySimulator, cadence_seconds: int = 60):
        self.simulator = simulator
        self.cadence_seconds = cadence_seconds
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def compute_and_cache_cycle(self) -> None:
        """Executes one simulation evaluation cycle and updates cached records."""
        try:
            rounded_ts = generate_rounded_timestamp(window_seconds=120)
            now = datetime.now()

            # 1. Real-time telemetry
            telemetry = self.simulator.generate_current_telemetry(now)
            telemetry_json = telemetry.model_dump_json()
            occ_key = make_occupancy_cache_key(self.simulator.facility_id, rounded_ts)
            await cache_manager.set(occ_key, telemetry_json, ttl=120)

            # Also write to unrounded key for instantaneous fallback
            await cache_manager.set(f"occupancy:{self.simulator.facility_id}:latest", telemetry_json, ttl=120)

            # 2. Forecast
            forecast = self.simulator.generate_forecast(now, horizon_hours=6)
            forecast_json = forecast.model_dump_json()
            fc_key = make_forecast_cache_key(self.simulator.facility_id, rounded_ts)
            await cache_manager.set(fc_key, forecast_json, ttl=120)
            await cache_manager.set(f"forecast:{self.simulator.facility_id}:latest", forecast_json, ttl=120)

        except Exception as e:
            logger.error("Simulation worker error in compute_and_cache_cycle: %s", e)

    async def _worker_loop(self) -> None:
        while self._running:
            await self.compute_and_cache_cycle()
            await asyncio.sleep(self.cadence_seconds)

    def start(self) -> None:
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._worker_loop())
            logger.info("Occupancy simulation worker started (cadence: %ds).", self.cadence_seconds)

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            logger.info("Occupancy simulation worker stopped.")


# Default global simulator and worker instance
default_simulator = FacilitySimulator()
simulation_worker = SimulationWorker(default_simulator, cadence_seconds=60)

