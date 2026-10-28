"""
Ground-Truth Calibration Hooks and Sensorless Fusion Engine.

Ingests physical surrogates and crowdsourced signals to continuously calibrate
and fine-tune simulated occupancy:
1. Geofenced Crowdsourced Sentiment (3-tier single-tap votes: quiet, normal, packed)
2. Actual Room Reservation Data (from DB or LibCal API)
3. Lab Computer / Printer Cluster Utilization telemetry
4. Bayesian / Exponentially Weighted Moving Average (EWMA) Calibration Filter
"""

from __future__ import annotations

import math
import time
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from collections import deque

from .models import CrowdFeedbackIngest, CrowdSentimentVote, LabClusterTelemetryIngest


# Addlestone Library approximate campus coordinates
CAMPUS_LAT = 32.7842
CAMPUS_LON = -79.9392
MAX_GEOFENCE_RADIUS_KM = 0.50  # 500 meter geofence radius


def _haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two GPS coordinates in kilometers."""
    r = 6371.0  # Earth's radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class CalibrationEngine:
    """
    Maintains rolling calibration signals and computes an observation adjustment
    factor to blend into the simulated prior occupancy.
    """

    def __init__(self, vote_window_seconds: int = 2700):
        # 45-minute rolling window for crowdsourced votes
        self.vote_window_seconds = vote_window_seconds
        self._votes: deque[Tuple[float, float]] = deque()  # (epoch_timestamp, score_percentage)
        self._last_lab_metric: Optional[Tuple[float, float]] = None  # (epoch_timestamp, lab_occupancy_pct)
        self._last_reservation_metric: Optional[Tuple[float, float]] = None  # (epoch_timestamp, room_occupancy_pct)

    def ingest_crowd_vote(self, vote: CrowdFeedbackIngest) -> bool:
        """
        Validates geofence and registers a crowdsourced vote.
        Vote values:
        - quiet: 25.0%
        - normal: 55.0%
        - packed: 85.0%
        """
        now = time.time()

        # Validate geofence if coordinates are provided
        if vote.latitude is not None and vote.longitude is not None:
            dist = _haversine_distance_km(CAMPUS_LAT, CAMPUS_LON, vote.latitude, vote.longitude)
            if dist > MAX_GEOFENCE_RADIUS_KM:
                return False  # Discard vote outside campus boundary

        vote_map = {
            CrowdSentimentVote.QUIET: 25.0,
            CrowdSentimentVote.NORMAL: 55.0,
            CrowdSentimentVote.PACKED: 85.0,
        }
        val = vote_map.get(vote.vote, 55.0)
        self._votes.append((now, val))
        return True

    def ingest_lab_telemetry(self, telemetry: LabClusterTelemetryIngest) -> None:
        """Registers active computer workstations and print queue pressure."""
        now = time.time()
        if telemetry.workstations_total > 0:
            pct = (telemetry.workstations_active / telemetry.workstations_total) * 100.0
            # Print volume multiplier (heavy printing correlates with crunch hours)
            print_boost = min(15.0, telemetry.print_jobs_last_hour * 0.25)
            effective_lab_pct = min(100.0, pct + print_boost)
            self._last_lab_metric = (now, effective_lab_pct)

    def update_reservation_metric(self, booked_rooms: int, total_rooms: int) -> None:
        """Registers live room booking state from the reservation system."""
        now = time.time()
        if total_rooms > 0:
            pct = (booked_rooms / total_rooms) * 100.0
            self._last_reservation_metric = (now, pct)

    def compute_calibrated_occupancy(self, simulated_prior: float) -> Tuple[float, float]:
        """
        Combines the simulated prior B_sim with observed calibration surrogates
        using an adaptive Bayesian Kalman-style fusion:

            B_calibrated = (1 - K) * B_sim + K * Z_obs

        Returns:
            (calibrated_occupancy, kalman_gain_applied)
        """
        now = time.time()
        cutoff = now - self.vote_window_seconds

        # Prune stale votes
        while self._votes and self._votes[0][0] < cutoff:
            self._votes.popleft()

        observations: List[Tuple[float, float]] = []  # (weight, value)

        # 1. Crowdsourced votes with exponential time decay
        if self._votes:
            total_weight = 0.0
            weighted_sum = 0.0
            for vote_time, vote_val in self._votes:
                age_min = (now - vote_time) / 60.0
                # Exponential decay half-life of 20 minutes
                w = math.exp(-0.0346 * age_min)
                weighted_sum += vote_val * w
                total_weight += w

            if total_weight > 0.0:
                crowd_avg = weighted_sum / total_weight
                # Confidence grows with sample size up to 10 votes
                sample_confidence = min(1.0, len(self._votes) / 8.0) * 0.30
                observations.append((sample_confidence, crowd_avg))

        # 2. Lab cluster utilization (valid within 30 minutes)
        if self._last_lab_metric and (now - self._last_lab_metric[0]) < 1800:
            observations.append((0.25, self._last_lab_metric[1]))

        # 3. Room reservations (valid within 30 minutes)
        if self._last_reservation_metric and (now - self._last_reservation_metric[0]) < 1800:
            observations.append((0.20, self._last_reservation_metric[1]))

        if not observations:
            return simulated_prior, 0.0

        # Compute combined observation Z_obs and Kalman gain K
        sum_weights = sum(w for w, _ in observations)
        k_gain = min(0.45, sum_weights)  # Cap external influence at 45% to prevent spoofing
        z_obs = sum(w * val for w, val in observations) / sum_weights

        calibrated = (1.0 - k_gain) * simulated_prior + k_gain * z_obs
        return round(max(0.0, min(100.0, calibrated)), 1), round(k_gain, 3)

