"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────
interface ZoneTelemetry {
  zone_id: string;
  display_name: string;
  floor: string;
  occupancy_percentage: number;
  headcount_estimate: number;
  capacity_total: number;
  noise_classification: string;
  trend: string;
  discrete_units?: {
    rooms_occupied: number;
    total_rooms: number;
    rooms_available: number;
    block_interval_min: number;
  } | null;
}

interface OccupancyData {
  facility_id: string;
  facility_name: string;
  timestamp: string;
  is_open: boolean;
  master_occupancy_percentage: number;
  total_estimated_headcount: number;
  total_building_capacity: number;
  trend: "increasing" | "stable" | "decreasing";
  trend_delta_30m: number;
  academic_period: string;
  applied_multipliers: { academic: number; weather: number; drift: number };
  zones: ZoneTelemetry[];
  meta: { kalman_gain: number; stochastic_drift_offset: number };
}

interface ForecastBucket {
  timestamp: string;
  minutes_ahead: number;
  predicted_occupancy_percentage: number;
  predicted_headcount: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  trend_direction: string;
}

interface ForecastData {
  forecast_buckets: ForecastBucket[];
  forecast_horizon_hours: number;
}

// ── Helpers ────────────────────────────────────────────────────────
function statusFromPct(p: number, isOpen: boolean) {
  if (!isOpen) return { label: "Closed", desc: "Check back during library hours.", color: "#71717a" };
  if (p < 25)  return { label: "Quiet", desc: "Plenty of open seats — a good time to visit.", color: "#047857" };
  if (p < 50)  return { label: "Moderate", desc: "Comfortable — you should find a good spot.", color: "#71717a" };
  if (p < 72)  return { label: "Getting busy", desc: "Filling up — consider visiting soon.", color: "#a16207" };
  if (p < 90)  return { label: "Busy", desc: "Quite crowded — try another floor or an off-peak hour.", color: "#a16207" };
  return             { label: "Near capacity", desc: "Consider another space.", color: "#a16207" };
}

function colorForZone(p: number) {
  if (p < 35) return "#047857";
  if (p < 70) return "#71717a";
  return "#a16207";
}

function noiseShort(n: string) {
  if (n.includes("Silent") || n.includes("Whisper")) return "Silent";
  if (n.includes("Moderate")) return "Moderate";
  if (n.includes("Collaborative") || n.includes("Enclosed")) return "Enclosed";
  return "Lively";
}

function fmtPeriod(p: string) {
  const m: Record<string, string> = {
    regular_term: "Regular Term", finals_week: "Finals Week",
    midterms: "Midterms", add_drop: "Add/Drop Week", break_or_holiday: "Break",
  };
  return m[p] ?? p;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ── Radial Gauge ───────────────────────────────────────────────────
function RadialGauge({ pct, isOpen }: { pct: number; isOpen: boolean }) {
  return (
    <div className="flex min-w-40 flex-col justify-center border-b border-zinc-200 pb-5 text-left sm:border-b-0 sm:border-r sm:pb-0 sm:pr-8">
      <div className="font-mono text-6xl font-light leading-none tracking-tight text-zinc-950 tabular-nums">
          {isOpen ? `${Math.round(pct)}%` : "—"}
      </div>
      <div className="mt-2 text-xs uppercase tracking-wider text-zinc-500">
        Occupancy
      </div>
    </div>
  );
}

// ── Forecast Canvas ────────────────────────────────────────────────
function ForecastChart({ buckets }: { buckets: ForecastBucket[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !buckets.length) return;
    const canvas = canvasRef.current;
    const wrap   = canvas.parentElement!;
    const dpr    = window.devicePixelRatio || 1;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const isDark = document.documentElement.classList.contains("dark") ||
                   document.body.style.getPropertyValue("color-scheme") === "dark";

    const pad = { t: 8, b: 4, l: 28, r: 6 };
    const gW = W - pad.l - pad.r, gH = H - pad.t - pad.b;
    const n = buckets.length;
    const toX = (i: number) => pad.l + (i / Math.max(1, n - 1)) * gW;
    const toY = (v: number) => pad.t + gH - (Math.min(100, v) / 100) * gH;

    // grid
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    [0, 25, 50, 75, 100].forEach(v => {
      const y = toY(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillStyle = isDark ? "rgba(255,255,255,.28)" : "rgba(0,0,0,.30)";
      ctx.font = "9px system-ui,sans-serif";
      ctx.fillText(v + "%", 0, y + 3);
    });

    // CI band
    ctx.beginPath();
    buckets.forEach((b, i) => { i === 0 ? ctx.moveTo(toX(i), toY(b.confidence_interval_high)) : ctx.lineTo(toX(i), toY(b.confidence_interval_high)); });
    [...buckets].reverse().forEach((b, i) => ctx.lineTo(toX(n - 1 - i), toY(b.confidence_interval_low)));
    ctx.closePath();
    ctx.fillStyle = isDark ? "rgba(99,102,241,.14)" : "rgba(99,102,241,.11)";
    ctx.fill();

    // line
    ctx.beginPath();
    buckets.forEach((b, i) => { i === 0 ? ctx.moveTo(toX(i), toY(b.predicted_occupancy_percentage)) : ctx.lineTo(toX(i), toY(b.predicted_occupancy_percentage)); });
    ctx.strokeStyle = "#52525b"; ctx.lineWidth = 2;
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();

    // dots
    buckets.forEach((b, i) => {
      const x = toX(i), y = toY(b.predicted_occupancy_percentage);
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#52525b"; ctx.fill();
      ctx.strokeStyle = isDark ? "#1e293b" : "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke();
    });
  }, [buckets]);

  return (
    <div style={{ height: 108 }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function OccupancyPage() {
  const [occ,      setOcc]      = useState<OccupancyData | null>(null);
  const [forecast, setForecast] = useState<ForecastData  | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const etagRef = useRef<string | null>(null);
  const cachedOccRef = useRef<OccupancyData | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const headers: HeadersInit = {};
      if (etagRef.current) headers["If-None-Match"] = etagRef.current;

      const [occRes, fcRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/v1/libraries/addlestone-main/occupancy", { headers, cache: "no-store" }),
        fetch("http://127.0.0.1:8000/v1/libraries/addlestone-main/forecast?hours=6", { cache: "no-store" }),
      ]);

      if (occRes.status === 200) {
        const etag = occRes.headers.get("ETag");
        if (etag) etagRef.current = etag;
        const data: OccupancyData = await occRes.json();
        cachedOccRef.current = data;
        setOcc(data);
      } else if (occRes.status === 304 && cachedOccRef.current) {
        setOcc(cachedOccRef.current); // keep cached
      }

      if (fcRes.ok) {
        const fcData: ForecastData = await fcRes.json();
        setForecast(fcData);
      }
    } catch (e: unknown) {
      setError((e as Error).message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 60_000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const p    = occ?.master_occupancy_percentage ?? 0;
  const open = occ?.is_open ?? false;
  const st   = statusFromPct(p, open);

  const trendMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
    increasing: { label: "Rising", color: "#71717a", bg: "#fafafa", border: "#e4e4e7" },
    decreasing: { label: "Falling", color: "#71717a", bg: "#fafafa", border: "#e4e4e7" },
    stable:     { label: "Stable", color: "#71717a", bg: "#fafafa", border: "#e4e4e7" },
  };
  const tr = trendMap[occ?.trend ?? "stable"];

  return (
    <main className="min-h-screen bg-[#faf9f6] px-5 py-10 text-zinc-900 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-10">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-medium tracking-tight text-zinc-950">Addlestone Library</h1>
              {open ? (
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" />Live
                </span>
              ) : occ ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Closed</span>
              ) : null}
            </div>
            <p className="mt-2 font-mono text-xs tabular-nums text-zinc-500">
              College of Charleston ·{" "}
              {occ ? `Updated ${fmtTime(occ.timestamp)}` : "Loading…"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-950"
            >
              Refresh data
            </button>
            <Link href="/dashboard" className="px-2 py-2 text-xs font-medium text-zinc-600 transition hover:text-zinc-950">
              Activity
            </Link>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-700">
            Backend unavailable: {error}. Confirm the library service is running.
          </div>
        )}

        {/* ── Skeleton ── */}
        {loading && !occ && (
          <div className="space-y-4">
            <div className="border border-zinc-200 bg-white p-6 animate-pulse">
              <div className="flex gap-6 items-center">
                <div className="h-20 w-40 bg-zinc-200" />
                <div className="flex-1 space-y-3">
                  <div className="h-8 w-36 bg-zinc-200" />
                  <div className="h-4 w-52 bg-zinc-200" />
                  <div className="h-4 w-40 bg-zinc-200" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[0,1,2,3].map(i => (
                <div key={i} className="h-24 border border-zinc-200 bg-white animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* ── Hero Card ── */}
        {occ && (
          <div className="border-y border-zinc-200 bg-white px-6 py-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <RadialGauge pct={p} isOpen={open} />

              <div className="flex-1 text-center sm:text-left">
                <div className="mb-1 flex items-center justify-center gap-2 sm:justify-start">
                  <span className="text-xl font-medium text-zinc-950">{st.label}</span>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-zinc-500">{st.desc}</p>

                <div className="flex flex-wrap justify-center gap-3 text-xs text-zinc-500 sm:justify-start">
                  <span className="font-mono tabular-nums text-zinc-700">
                    {occ.total_estimated_headcount.toLocaleString()} people
                  </span>
                  <span className="border-l border-zinc-200 pl-3" style={{ color: tr.color }}>
                    {tr.label}
                  </span>
                  <span className="border-l border-zinc-200 pl-3">
                    {fmtPeriod(occ.academic_period)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── Zones ── */}
        {occ && (
          <div>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-zinc-500">Floor-by-floor breakdown</h2>
            <div className="divide-y divide-zinc-200 border-y border-zinc-200 bg-white">
              {occ.zones.map(z => {
                const color = colorForZone(z.occupancy_percentage);
                return (
                  <div key={z.zone_id} className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_5rem] sm:items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium leading-tight text-zinc-900">{z.display_name}</span>
                      <span className="text-xs text-zinc-500">{z.floor}</span>
                    </div>
                    <span className="font-mono text-xl font-light tabular-nums text-zinc-900 sm:text-right">
                        {Math.round(z.occupancy_percentage)}%
                    </span>
                    <div className="col-span-full h-1.5 bg-zinc-100">
                      <div className="h-full" style={{
                        width: `${z.occupancy_percentage}%`,
                        background: color,
                        transition: "width 1s cubic-bezier(.16,1,.3,1)"
                      }} />
                    </div>
                    <div className="col-span-full flex justify-between text-xs text-zinc-500">
                      <span className="font-mono tabular-nums">{z.headcount_estimate} / {z.capacity_total} people</span>
                      <span>{noiseShort(z.noise_classification)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Room Dot Grid ── */}
        {occ && (() => {
          const gr = occ.zones.find(z => z.zone_id === "group_rooms");
          const du = gr?.discrete_units;
          if (!du) return null;
          const isAlmostFull = du.rooms_available <= 4 && du.rooms_available > 0;
          const isFull = du.rooms_available === 0;
          return (
            <div className="border-y border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-zinc-900">Group study rooms</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {du.rooms_available} of {du.total_rooms} available
                  </p>
                </div>
                <span className={`font-mono text-xs uppercase tracking-wider ${
                  isFull ? "text-zinc-500"
                  : isAlmostFull ? "text-amber-700"
                  : "text-emerald-800"
                }`}>
                  {isFull ? "Full" : isAlmostFull ? "Almost Full" : `${du.rooms_available} Open`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: du.total_rooms }, (_, i) => (
                  <div key={i}
                       title={`Room ${i + 1}: ${i < du.rooms_occupied ? "Occupied" : "Available"}`}
                       className={`h-2.5 w-2.5 transition-colors duration-500 ${
                         i < du.rooms_occupied ? "bg-zinc-500" : "bg-emerald-700"
                       }`} />
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Forecast Chart ── */}
        {forecast?.forecast_buckets?.length ? (
          <div className="border-y border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-medium text-zinc-900">Six-hour occupancy forecast</h2>
            <ForecastChart buckets={forecast.forecast_buckets} />
            <div className="flex justify-between mt-1 px-1">
              {forecast.forecast_buckets
                .filter((_, i) => i % 2 === 0 || i === forecast.forecast_buckets.length - 1)
                .map((b, i) => (
                  <span key={i} className="text-xs text-slate-400">{fmtTime(b.timestamp)}</span>
                ))}
            </div>
          </div>
        ) : null}

        {/* ── Multipliers ── */}
        {occ && (
          <div className="border-y border-zinc-200 bg-white p-4">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-zinc-500">Active multipliers</h2>
            <div className="grid grid-cols-3 divide-x divide-zinc-200">
              {[
                { label: "Academic", value: `${occ.applied_multipliers.academic}×` },
                { label: "Weather",  value: `${occ.applied_multipliers.weather}×` },
                { label: "Drift",    value: `${occ.applied_multipliers.drift >= 0 ? "+" : ""}${occ.applied_multipliers.drift.toFixed(1)}%` },
              ].map(m => (
                <div key={m.label} className="px-3 py-2 text-center">
                  <div className="font-mono text-lg tabular-nums text-zinc-900">{m.value}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          Auto-refreshes every 60 s · Libro Simulation Engine · Sensorless Occupancy Modeling
        </p>

      </div>

    </main>
  );
}
