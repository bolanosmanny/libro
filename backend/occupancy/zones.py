"""
Granular Spatial & Zone Breakdown Module.

Derives zone-level telemetry, noise classifications, dwell time, and capacity
from the master building percentage according to distinct architectural dynamics:
1. Collaborative / Cafe (Ground Level) - short dwell, early lunch peak, class-end spikes (:45-:05)
2. General Study & Stacks (Mid Levels) - tracks master baseline directly
3. Silent Study (Upper Levels) - long dwell, evening persistence, slower morning ramp
4. Group Study Rooms - discrete binary/chunked room allocations (1-2 hr booking blocks)
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Dict, List, Tuple
from .models import NoiseLevel, TrendDirection, ZoneId, ZoneTelemetry


# Zone baseline seat allocations
ZONE_CONFIGS: Dict[ZoneId, dict] = {
    ZoneId.CAFE_COLLAB: {
        "display_name": "Collaborative Commons & Cafe",
        "floor": "Ground Level",
        "capacity": 250,
        "noise": NoiseLevel.LIVELY,
        "dwell_time": "20–45 min",
    },
    ZoneId.GENERAL_STACKS: {
        "display_name": "General Study & Stacks",
        "floor": "2nd & 3rd Floors",
        "capacity": 500,
        "noise": NoiseLevel.MODERATE,
        "dwell_time": "1–2 hours",
    },
    ZoneId.SILENT_UPPER: {
        "display_name": "Silent Research & Study Sanctuary",
        "floor": "4th Floor",
        "capacity": 350,
        "noise": NoiseLevel.SILENT,
        "dwell_time": "3–5 hours",
    },
    ZoneId.GROUP_ROOMS: {
        "display_name": "Group Study Rooms",
        "floor": "All Levels (16 Suites)",
        "capacity": 100,
        "total_rooms": 16,
        "noise": NoiseLevel.COLLABORATIVE,
        "dwell_time": "1–2 hours (Booked)",
    },
}


def _class_dismissal_surge(minute: int) -> float:
    """
    Computes surge multiplier around standard university class end markers (:45 to :05 past the hour).
    Peaks around :52 with standard deviation ~ 5 minutes.
    """
    # Transform minute into distance from :50
    dist = abs(minute - 50)
    # Also wrap around for :00 - :05 (distance 10-15 min)
    if minute < 10:
        dist = minute + 10

    # Gaussian burst with height 15% occupancy surge
    if dist <= 12:
        return 14.0 * math.exp(-0.5 * (dist / 4.5) ** 2)
    return 0.0


def compute_zone_telemetries(
    master_percentage: float,
    current_dt: datetime,
    is_open: bool,
    master_trend: TrendDirection
) -> List[ZoneTelemetry]:
    """
    Transforms master building occupancy percentage into granular zone telemetry.
    """
    if not is_open or master_percentage <= 0.0:
        # Zero out if closed
        results = []
        for zid, cfg in ZONE_CONFIGS.items():
            results.append(
                ZoneTelemetry(
                    zone_id=zid,
                    display_name=cfg["display_name"],
                    floor=cfg["floor"],
                    occupancy_percentage=0.0,
                    headcount_estimate=0,
                    capacity_total=cfg["capacity"],
                    noise_classification=NoiseLevel.SILENT,
                    dwell_time_typical_min=cfg["dwell_time"],
                    trend=TrendDirection.STABLE,
                    discrete_units={"rooms_occupied": 0, "total_rooms": cfg["total_rooms"]} if zid == ZoneId.GROUP_ROOMS else None,
                )
            )
        return results

    hour_fraction = current_dt.hour + current_dt.minute / 60.0
    results: List[ZoneTelemetry] = []

    # --- 1. Collaborative / Cafe (Ground Level) ---
    cafe_cfg = ZONE_CONFIGS[ZoneId.CAFE_COLLAB]
    # Lunch and early afternoon boost (11:00 AM - 3:30 PM)
    lunch_mod = 1.0
    if 11.0 <= hour_fraction <= 15.5:
        lunch_mod = 1.22
    elif hour_fraction > 19.0:
        # Diminishes after evening dinner
        lunch_mod = 0.70

    # Additive class dismissal surge
    class_surge = _class_dismissal_surge(current_dt.minute)
    cafe_pct = max(0.0, min(100.0, (master_percentage * lunch_mod) + class_surge))
    cafe_headcount = int(round((cafe_pct / 100.0) * cafe_cfg["capacity"]))

    results.append(
        ZoneTelemetry(
            zone_id=ZoneId.CAFE_COLLAB,
            display_name=cafe_cfg["display_name"],
            floor=cafe_cfg["floor"],
            occupancy_percentage=round(cafe_pct, 1),
            headcount_estimate=cafe_headcount,
            capacity_total=cafe_cfg["capacity"],
            noise_classification=NoiseLevel.LIVELY if cafe_pct > 35 else NoiseLevel.MODERATE,
            dwell_time_typical_min=cafe_cfg["dwell_time"],
            trend=master_trend,
        )
    )

    # --- 2. General Study & Stacks (Mid Levels) ---
    stacks_cfg = ZONE_CONFIGS[ZoneId.GENERAL_STACKS]
    # Directly tracks building baseline with minimal variance
    stacks_pct = max(0.0, min(100.0, master_percentage))
    stacks_headcount = int(round((stacks_pct / 100.0) * stacks_cfg["capacity"]))

    results.append(
        ZoneTelemetry(
            zone_id=ZoneId.GENERAL_STACKS,
            display_name=stacks_cfg["display_name"],
            floor=stacks_cfg["floor"],
            occupancy_percentage=round(stacks_pct, 1),
            headcount_estimate=stacks_headcount,
            capacity_total=stacks_cfg["capacity"],
            noise_classification=NoiseLevel.MODERATE if stacks_pct > 60 else NoiseLevel.SILENT,
            dwell_time_typical_min=stacks_cfg["dwell_time"],
            trend=master_trend,
        )
    )

    # --- 3. Silent Study (Upper Levels) ---
    silent_cfg = ZONE_CONFIGS[ZoneId.SILENT_UPPER]
    # Slow morning ramp (starts filling later) and heavy evening persistence (7:00 PM - closing)
    if hour_fraction < 12.0:
        silent_mod = 0.72
    elif hour_fraction >= 19.0:
        silent_mod = 1.28  # Heavy evening focus
    else:
        silent_mod = 1.05

    silent_pct = max(0.0, min(100.0, master_percentage * silent_mod))
    silent_headcount = int(round((silent_pct / 100.0) * silent_cfg["capacity"]))

    results.append(
        ZoneTelemetry(
            zone_id=ZoneId.SILENT_UPPER,
            display_name=silent_cfg["display_name"],
            floor=silent_cfg["floor"],
            occupancy_percentage=round(silent_pct, 1),
            headcount_estimate=silent_headcount,
            capacity_total=silent_cfg["capacity"],
            noise_classification=NoiseLevel.SILENT,
            dwell_time_typical_min=silent_cfg["dwell_time"],
            trend=master_trend,
        )
    )

    # --- 4. Group Study Rooms (Discrete / Quantized Booking Blocks) ---
    rooms_cfg = ZONE_CONFIGS[ZoneId.GROUP_ROOMS]
    total_rooms = rooms_cfg["total_rooms"]
    # Group room utilization is quantized in chunks of total_rooms (1/16 = 6.25% per room)
    # Higher demand pushes room bookings towards saturation quickly
    demand_ratio = master_percentage / 100.0
    # Power curve represents high demand: study rooms book out earlier than open stacks
    prob_booked = math.pow(demand_ratio, 0.75)
    rooms_occupied = int(round(prob_booked * total_rooms))
    rooms_occupied = max(0, min(total_rooms, rooms_occupied))

    rooms_pct = (rooms_occupied / total_rooms) * 100.0
    rooms_headcount = int(round((rooms_pct / 100.0) * rooms_cfg["capacity"]))

    results.append(
        ZoneTelemetry(
            zone_id=ZoneId.GROUP_ROOMS,
            display_name=rooms_cfg["display_name"],
            floor=rooms_cfg["floor"],
            occupancy_percentage=round(rooms_pct, 1),
            headcount_estimate=rooms_headcount,
            capacity_total=rooms_cfg["capacity"],
            noise_classification=NoiseLevel.COLLABORATIVE,
            dwell_time_typical_min=rooms_cfg["dwell_time"],
            trend=master_trend,
            discrete_units={
                "rooms_occupied": rooms_occupied,
                "total_rooms": total_rooms,
                "rooms_available": total_rooms - rooms_occupied,
                "block_interval_min": 60,
            },
        )
    )

    return results

