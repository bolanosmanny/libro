"""
Mathematical Dynamics and Simulation Core for Library Occupancy.

Implements:
1. Circadian Baseline Curve B_base(t) for Weekdays (bimodal) and Weekends (inverted single crest / Sunday cram)
2. Smooth 30-minute pre-opening ramp and hard closure gating
3. Academic Calendar & Weather Multipliers
4. Mean-Reverting Discrete AR(1) / Ornstein-Uhlenbeck Stochastic Drift Process epsilon(t)
"""

from __future__ import annotations

import math
import random
from datetime import datetime, time
from typing import Dict, Tuple

from .models import AcademicPeriod, WeatherConditions


# --- Operating Hours Configuration (Addlestone Library / University Standard) ---
# Format: weekday index (0=Mon, 6=Sun): (open_hour, close_hour)
DEFAULT_OPERATING_SCHEDULE: Dict[int, Tuple[float, float]] = {
    0: (7.5, 24.0),   # Monday: 7:30 AM - Midnight
    1: (7.5, 24.0),   # Tuesday: 7:30 AM - Midnight
    2: (7.5, 24.0),   # Wednesday: 7:30 AM - Midnight
    3: (7.5, 24.0),   # Thursday: 7:30 AM - Midnight
    4: (7.5, 20.0),   # Friday: 7:30 AM - 8:00 PM
    5: (10.0, 18.0),  # Saturday: 10:00 AM - 6:00 PM
    6: (11.0, 24.0),  # Sunday: 11:00 AM - Midnight
}

# Academic multipliers specified by system architecture
ACADEMIC_MULTIPLIERS: Dict[AcademicPeriod, float] = {
    AcademicPeriod.ADD_DROP: 0.65,
    AcademicPeriod.REGULAR_TERM: 1.00,
    AcademicPeriod.MIDTERMS: 1.35,
    AcademicPeriod.FINALS_WEEK: 1.80,
    AcademicPeriod.BREAK_OR_HOLIDAY: 0.15,
}


def _gaussian(x: float, amplitude: float, mean: float, std_dev: float) -> float:
    """Computes a standard Gaussian bell curve component."""
    if std_dev <= 0:
        return 0.0
    exponent = -0.5 * ((x - mean) / std_dev) ** 2
    return amplitude * math.exp(exponent)


def _smoothstep(edge0: float, edge1: float, x: float) -> float:
    """Hermite interpolation for smooth non-linear transitions in [0, 1]."""
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)


def compute_baseline_circadian(dt: datetime, schedule: Dict[int, Tuple[float, float]] = None) -> float:
    """
    Computes deterministic base library occupancy B_base(t) in [0, 100].

    Dynamics:
    - Ramp up 30 minutes before opening via cubic Hermite smoothstep.
    - Zero outside operating hours.
    - Weekdays (Mon-Fri):
      * Morning ramp from 8:00 AM.
      * Peak 1: Lunch transition 11:30 AM - 2:00 PM (center ~12:45 PM, amp ~68%).
      * Valley: Late afternoon dip 4:30 PM - 6:00 PM (amp down to ~45%).
      * Peak 2: Evening study session 7:00 PM - 10:30 PM (center ~8:45 PM, amp ~78%).
    - Weekends:
      * Saturday: Inverted single-crest, lazy morning, afternoon crest ~3:30 PM.
      * Sunday: Strong afternoon ramp into heavy cram session matching finals-level volume (center ~8:30 PM, amp ~85%).
    """
    if schedule is None:
        schedule = DEFAULT_OPERATING_SCHEDULE

    weekday = dt.weekday()
    hour_fraction = dt.hour + dt.minute / 60.0 + dt.second / 3600.0
    open_hour, close_hour = schedule.get(weekday, (8.0, 22.0))

    ramp_start = open_hour - 0.5  # 30-min pre-opening ramp

    # Check operating bounds
    if hour_fraction < ramp_start or hour_fraction > close_hour:
        return 0.0

    raw_occupancy = 0.0

    # 1. Weekday Curve (Mon - Thu, with adjusted Fri evening)
    if weekday < 5:
        # Morning ramp component (8:00 AM - 11:30 AM)
        morning_ramp = _smoothstep(8.0, 11.5, hour_fraction) * 35.0

        # Lunch peak (11:30 AM - 2:00 PM)
        lunch_peak = _gaussian(hour_fraction, amplitude=32.0, mean=12.75, std_dev=1.10)

        # Baseline background floor while open
        base_floor = 18.0 * _smoothstep(open_hour, open_hour + 1.0, hour_fraction)

        # Evening study peak (7:00 PM - 10:30 PM)
        # Friday evening study is curtailed
        evening_amp = 18.0 if weekday == 4 else 44.0
        evening_peak = _gaussian(hour_fraction, amplitude=evening_amp, mean=20.5, std_dev=1.35)

        # Late afternoon dip transition (4:30 PM - 6:00 PM)
        afternoon_dip_mod = 1.0
        if 16.0 <= hour_fraction <= 18.5:
            # Gaussian subtraction to carve out the dinner/class transition valley
            dip_depth = _gaussian(hour_fraction, amplitude=12.0, mean=17.25, std_dev=0.75)
            raw_occupancy = (base_floor + morning_ramp + lunch_peak + evening_peak) - dip_depth
        else:
            raw_occupancy = base_floor + morning_ramp + lunch_peak + evening_peak

        # Closing taper (last 45 minutes before close)
        if hour_fraction > (close_hour - 0.75):
            taper = 1.0 - _smoothstep(close_hour - 0.75, close_hour, hour_fraction)
            raw_occupancy *= taper

    # 2. Weekend Curves (Saturday vs Sunday)
    elif weekday == 5:
        # Saturday: Low morning, late afternoon crest ~3:30 PM, early close
        sat_morning = _smoothstep(10.0, 13.0, hour_fraction) * 22.0
        sat_afternoon_crest = _gaussian(hour_fraction, amplitude=34.0, mean=15.5, std_dev=1.60)
        raw_occupancy = sat_morning + sat_afternoon_crest

        if hour_fraction > (close_hour - 0.5):
            raw_occupancy *= (1.0 - _smoothstep(close_hour - 0.5, close_hour, hour_fraction))

    else:
        # Sunday: Opens 11:00 AM, moderate afternoon, massive evening cram session
        sun_open_floor = _smoothstep(11.0, 13.5, hour_fraction) * 25.0
        sun_afternoon = _gaussian(hour_fraction, amplitude=28.0, mean=15.5, std_dev=1.80)
        # Heavy Sunday night cram session
        sun_night_cram = _gaussian(hour_fraction, amplitude=52.0, mean=20.75, std_dev=1.45)
        raw_occupancy = sun_open_floor + sun_afternoon + sun_night_cram

        if hour_fraction > (close_hour - 0.75):
            raw_occupancy *= (1.0 - _smoothstep(close_hour - 0.75, close_hour, hour_fraction))

    # Apply 30-min pre-open ramp weighting if within [ramp_start, open_hour)
    if ramp_start <= hour_fraction < open_hour:
        ramp_factor = _smoothstep(ramp_start, open_hour, hour_fraction)
        raw_occupancy = raw_occupancy * ramp_factor

    return max(0.0, min(100.0, raw_occupancy))


def compute_weather_multiplier(weather: WeatherConditions, hour_fraction: float) -> float:
    """
    Computes environmental modifier based on weather conditions.
    Cold temperatures (< 45°F) or active precipitation drive students into indoor
    study spaces during peak hours (+15% to +20% boost).
    """
    multiplier = 1.0

    # Weather impact is heightened during daylight and evening study hours (8:00 AM - 10:00 PM)
    if 8.0 <= hour_fraction <= 22.0:
        if weather.precipitation_in_hr >= 0.15 or weather.is_rainy:
            # Significant rain / storm boost
            multiplier += 0.18
        elif weather.precipitation_in_hr > 0.0:
            multiplier += 0.12

        if weather.temperature_f < 45.0 or weather.is_cold:
            multiplier += 0.08

    # Cap weather multiplier between 0.85 (mild warm day outdoor studying) and 1.25 (freezing rain)
    return max(0.85, min(1.25, multiplier))


class StochasticDriftProcess:
    """
    Continuous Stochastic Drift Process epsilon(t) using an Autoregressive AR(1)
    discrete approximation of an Ornstein-Uhlenbeck mean-reverting process.

    SDE formulation:
        d(epsilon_t) = -theta * epsilon_t * dt + sigma_ou * dW_t

    Discrete AR(1) recurrence:
        epsilon[k] = phi * epsilon[k-1] + sigma_eff * Z_k
        where Z_k ~ N(0, 1),
        phi = exp(-theta * delta_t),
        sigma_eff = sigma * sqrt(1 - phi^2) to guarantee stationary variance Var(epsilon) = sigma^2.

    Parameters:
    - 30-45 minute correlation decay window (half-life ~ 35 minutes)
    - phi_5m ≈ 0.85 (for 5 min) -> phi_1m ≈ 0.968
    - sigma ≈ 3.0 percentage points stationary standard deviation
    """

    def __init__(self, phi_5min: float = 0.85, sigma_stationary: float = 3.0):
        self.sigma = sigma_stationary
        # Derive 1-minute step autocorrelation parameter: phi_1m = (phi_5m)^(1/5)
        self.phi_1m = math.pow(phi_5min, 1.0 / 5.0)  # ≈ 0.968
        self.sigma_effective = self.sigma * math.sqrt(max(0.0, 1.0 - self.phi_1m ** 2))
        self._current_value: float = 0.0
        self._last_step_time: float = 0.0

    @property
    def value(self) -> float:
        return self._current_value

    def step(self, random_seed: float = None) -> float:
        """Advance the stochastic process by 1 discrete minute interval."""
        z = random.gauss(0.0, 1.0) if random_seed is None else random_seed
        self._current_value = (self.phi_1m * self._current_value) + (self.sigma_effective * z)
        # Soft clamp drift to ± 3 standard deviations (± 9.0%)
        self._current_value = max(-3.0 * self.sigma, min(3.0 * self.sigma, self._current_value))
        return self._current_value

    def advance_time(self, minutes_elapsed: float) -> float:
        """Advance process across arbitrary fractional minutes using exact OU transition."""
        if minutes_elapsed <= 0:
            return self._current_value

        # phi_t = (phi_1m)^minutes_elapsed
        phi_t = math.pow(self.phi_1m, minutes_elapsed)
        cond_variance = (self.sigma ** 2) * (1.0 - phi_t ** 2)
        cond_std = math.sqrt(max(0.0, cond_variance))
        z = random.gauss(0.0, 1.0)
        self._current_value = (phi_t * self._current_value) + (cond_std * z)
        return self._current_value

    def reset(self, initial_value: float = 0.0) -> None:
        self._current_value = initial_value

