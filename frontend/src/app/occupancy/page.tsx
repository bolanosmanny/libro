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
  if (!isOpen) return { emoji: "🔒", label: "Closed", desc: "Check back during library hours.", color: "#94a3b8" };
  if (p < 25)  return { emoji: "🟢", label: "Very Quiet",   desc: "Plenty of open seats — great time to head in.",         color: "#22c55e" };
  if (p < 50)  return { emoji: "🟡", label: "Moderate",     desc: "Comfortable — you'll find a good spot.",                color: "#eab308" };
  if (p < 72)  return { emoji: "🟠", label: "Getting Busy", desc: "Filling up — go soon to grab a seat.",                  color: "#f97316" };
  if (p < 90)  return { emoji: "🔴", label: "Busy",         desc: "Quite crowded — try an upper floor or off-peak hour.", color: "#ef4444" };
  return             { emoji: "🚨", label: "Packed!",       desc: "Near capacity — consider another space.",               color: "#dc2626" };
}

function colorForZone(p: number) {
  if (p < 35) return { bar: "#22c55e", bg: "rgba(34,197,94,.12)",  border: "rgba(34,197,94,.35)"  };
  if (p < 60) return { bar: "#eab308", bg: "rgba(234,179,8,.12)",  border: "rgba(234,179,8,.35)"  };
  if (p < 80) return { bar: "#f97316", bg: "rgba(249,115,22,.12)", border: "rgba(249,115,22,.35)" };
  return            { bar: "#ef4444", bg: "rgba(239,68,68,.12)",   border: "rgba(239,68,68,.35)"  };
}

function zoneIcon(id: string) {
  const icons: Record<string, string> = {
    cafe_collab: "☕", general_stacks: "📚", silent_upper: "🔇", group_rooms: "🚪",
  };
  return icons[id] ?? "🏛️";
}

function noiseShort(n: string) {
  if (n.includes("Silent") || n.includes("Whisper")) return "🤫 Silent";
  if (n.includes("Moderate")) return "💬 Moderate";
  if (n.includes("Collaborative") || n.includes("Enclosed")) return "👥 Enclosed";
  return "📢 Lively";
}

function fmtPeriod(p: string) {
  const m: Record<string, string> = {
    regular_term: "Regular Term", finals_week: "📚 Finals Week",
    midterms: "⚡ Midterms", add_drop: "Add/Drop Week", break_or_holiday: "🌴 Break",
  };
  return m[p] ?? p;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ── Radial Gauge ───────────────────────────────────────────────────
function RadialGauge({ pct, color, isOpen }: { pct: number; color: string; isOpen: boolean }) {
  // Track arc = 250°, radius = 65, circumference = 2π*65 ≈ 408.4
  // Clamped stroke segment = 283.3 (250/360 × 408.4)
  const TRACK = 283.3;
  const fill  = TRACK * (Math.min(100, Math.max(0, pct)) / 100);

  return (
    <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 160, height: 160 }}>
      {/* Subtle spin ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(#6366f1 0deg, transparent 70deg)",
          opacity: 0.10,
          animation: "spin 14s linear infinite",
        }}
      />
      <svg className="absolute inset-0" width="160" height="160" viewBox="0 0 160 160">
        {/* Track */}
        <circle cx="80" cy="80" r="65" fill="none" stroke="var(--border)" strokeWidth="13"
                strokeLinecap="round" strokeDasharray="283.3" strokeDashoffset="70.8"
                transform="rotate(145 80 80)" />
        {/* Fill */}
        <circle cx="80" cy="80" r="65" fill="none" stroke={color} strokeWidth="13"
                strokeLinecap="round" strokeDasharray="283.3"
                strokeDashoffset={(TRACK - fill).toFixed(1)}
                transform="rotate(145 80 80)"
                style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1), stroke .4s" }} />
      </svg>
      <div className="relative text-center z-10">
        <div className="text-4xl font-black leading-none text-slate-900 dark:text-white">
          {isOpen ? `${Math.round(pct)}%` : "—"}
        </div>
        <div className="text-xs text-slate-500 font-medium mt-0.5">occupancy</div>
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
    ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 2.5;
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();

    // dots
    buckets.forEach((b, i) => {
      const x = toX(i), y = toY(b.predicted_occupancy_percentage);
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#6366f1"; ctx.fill();
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
    increasing: { label: "↑ Rising",  color: "#22c55e", bg: "rgba(34,197,94,.12)",   border: "rgba(34,197,94,.35)"   },
    decreasing: { label: "↓ Falling", color: "#ef4444", bg: "rgba(239,68,68,.12)",   border: "rgba(239,68,68,.35)"   },
    stable:     { label: "→ Stable",  color: "#64748b", bg: "rgba(100,116,139,.1)",  border: "rgba(100,116,139,.3)"  },
  };
  const tr = trendMap[occ?.trend ?? "stable"];

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">🏛️</span>
              <h1 className="font-bold text-lg text-slate-900 dark:text-white">Addlestone Library</h1>
              {open ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />LIVE
                </span>
              ) : occ ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-500">CLOSED</span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              College of Charleston ·{" "}
              {occ ? `Updated ${fmtTime(occ.timestamp)}` : "Loading…"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.65 2.35A8 8 0 1 0 15.5 8h-1.5a6.5 6.5 0 1 1-1.76-4.48l-1.99 1.99H15V.5l-1.35 1.85z"/>
              </svg>
              Refresh
            </button>
            <Link href="/dashboard" className="rounded-xl bg-teal-600 hover:bg-teal-500 px-3 py-1.5 text-xs font-bold text-white transition">
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-start gap-2">
            <span>⚠️</span>
            <span>Backend unreachable: {error}. Make sure uvicorn is running on port 8000.</span>
          </div>
        )}

        {/* ── Skeleton ── */}
        {loading && !occ && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse">
              <div className="flex gap-6 items-center">
                <div className="w-40 h-40 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-8 rounded-lg bg-slate-200 dark:bg-slate-700 w-36" />
                  <div className="h-4 rounded bg-slate-200 dark:bg-slate-700 w-52" />
                  <div className="h-4 rounded bg-slate-200 dark:bg-slate-700 w-40" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[0,1,2,3].map(i => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-24 animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* ── Hero Card ── */}
        {occ && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <RadialGauge pct={p} color={st.color} isOpen={open} />

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="text-2xl">{st.emoji}</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{st.label}</span>
                </div>
                <p className="text-sm text-slate-500 mb-3 leading-relaxed">{st.desc}</p>

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="rounded-full border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    👥 {occ.total_estimated_headcount.toLocaleString()} people
                  </span>
                  <span className="rounded-full border px-3 py-1 text-xs font-semibold"
                        style={{ color: tr.color, background: tr.bg, borderColor: tr.border }}>
                    {tr.label}
                  </span>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500">
                    {fmtPeriod(occ.academic_period)}
                  </span>
                </div>
              </div>
            </div>

            {/* Gradient meter */}
            <div className="mt-5">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5 select-none">
                <span>Quiet</span><span>Moderate</span><span>Busy</span><span>Packed</span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                <div className="absolute inset-0 rounded-full"
                     style={{ background: "linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444)" }} />
                <div className="absolute top-0 bottom-0 w-1 rounded-full shadow-lg bg-white"
                     style={{ left: `${Math.min(97, Math.max(1, p))}%`, transition: "left 1.1s cubic-bezier(.16,1,.3,1)" }} />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1 select-none">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Zones ── */}
        {occ && (
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Floor-by-Floor Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {occ.zones.map(z => {
                const c = colorForZone(z.occupancy_percentage);
                return (
                  <div key={z.zone_id} className="rounded-xl p-4 border shadow-sm"
                       style={{ background: c.bg, borderColor: c.border }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-base">{zoneIcon(z.zone_id)}</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{z.display_name}</span>
                        </div>
                        <span className="text-xs text-slate-500">{z.floor}</span>
                      </div>
                      <span className="text-xl font-black flex-shrink-0 ml-2" style={{ color: c.bar }}>
                        {Math.round(z.occupancy_percentage)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full mb-2 overflow-hidden bg-white/30 dark:bg-black/20">
                      <div className="h-full rounded-full" style={{
                        width: `${z.occupancy_percentage}%`,
                        background: c.bar,
                        transition: "width 1s cubic-bezier(.16,1,.3,1)"
                      }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{z.headcount_estimate} / {z.capacity_total}</span>
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
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Group Study Rooms</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 mr-1 align-middle" />Available
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400 mx-1 ml-3 align-middle" />Occupied
                    · {du.rooms_available} of {du.total_rooms} open
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold border ${
                  isFull ? "text-red-400 bg-red-500/10 border-red-500/30"
                  : isAlmostFull ? "text-orange-400 bg-orange-500/10 border-orange-500/30"
                  : "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
                }`}>
                  {isFull ? "Full" : isAlmostFull ? "Almost Full" : `${du.rooms_available} Open`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: du.total_rooms }, (_, i) => (
                  <div key={i}
                       title={`Room ${i + 1}: ${i < du.rooms_occupied ? "Occupied" : "Available"}`}
                       className="w-[11px] h-[11px] rounded-full transition-colors duration-500"
                       style={{ background: i < du.rooms_occupied ? "#f87171" : "#4ade80" }} />
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Forecast Chart ── */}
        {forecast?.forecast_buckets?.length ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">6-Hour Occupancy Forecast</h2>
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
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active Multipliers</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Academic", value: `${occ.applied_multipliers.academic}×`, icon: "🎓" },
                { label: "Weather",  value: `${occ.applied_multipliers.weather}×`,  icon: "🌤️" },
                { label: "Drift",    value: `${occ.applied_multipliers.drift >= 0 ? "+" : ""}${occ.applied_multipliers.drift.toFixed(1)}%`, icon: "〜" },
              ].map(m => (
                <div key={m.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-center">
                  <div className="text-lg mb-0.5">{m.icon}</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{m.value}</div>
                  <div className="text-xs text-slate-500">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 opacity-60">
          Auto-refreshes every 60 s · Libro Simulation Engine · Sensorless Occupancy Modeling
        </p>

      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

