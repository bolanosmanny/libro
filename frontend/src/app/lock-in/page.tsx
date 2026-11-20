"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Clock =
  | { status: "ready" }
  | { status: "paused"; remainingMs: number }
  | { status: "running"; endsAt: number };

type Timer = {
  mode: "pomodoro" | "custom";
  phase: "focus" | "break";
  customMinutes: number;
  clock: Clock;
};

const storageKey = "libro:study-timer";
const pomodoroDuration = { focus: 25, break: 5 };
const maxCustomMinutes = 180;
const msPerMinute = 60_000;
const initialTimer: Timer = {
  mode: "pomodoro",
  phase: "focus",
  customMinutes: 45,
  clock: { status: "ready" },
};

function isValidDuration(minutes: number) {
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= maxCustomMinutes;
}

function readTimer(): Timer {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return initialTimer;

    const saved = JSON.parse(raw) as Timer | null;
    const clock = saved?.clock;

    if (
      saved &&
      (saved.mode === "pomodoro" || saved.mode === "custom") &&
      (saved.phase === "focus" || saved.phase === "break") &&
      isValidDuration(saved.customMinutes) &&
      (clock?.status === "ready" ||
        (clock?.status === "paused" &&
          Number.isFinite(clock.remainingMs) &&
          clock.remainingMs > 0) ||
        (clock?.status === "running" && Number.isFinite(clock.endsAt)))
    ) {
      return saved;
    }
  } catch {
    // A temporary or blocked storage area still allows a timer on this page.
  }
  return initialTimer;
}

export default function LockInPage() {
  const [timer, setTimer] = useState<Timer>(initialTimer);
  const [customInput, setCustomInput] = useState(String(initialTimer.customMinutes));
  const [now, setNow] = useState(0);
  const { mode, phase, clock } = timer;

  useEffect(() => {
    function restore() {
      const saved = readTimer();
      setTimer(saved);
      setCustomInput(String(saved.customMinutes));
      setNow(Date.now());
    }

    function sync(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) restore();
    }

    const frame = requestAnimationFrame(restore);
    window.addEventListener("storage", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (clock.status !== "running") return;
    const deadline = clock.endsAt;

    function updateClock() {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) window.clearInterval(interval);
    }

    const interval = window.setInterval(updateClock, 250);
    document.addEventListener("visibilitychange", updateClock);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, [clock]);

  const customMinutes = Number(customInput);
  const validCustom = isValidDuration(customMinutes);
  const durationMinutes = mode === "pomodoro"
    ? pomodoroDuration[phase]
    : validCustom
      ? customMinutes
      : timer.customMinutes;
  const durationMs = durationMinutes * msPerMinute;
  let remainingMs = durationMs;
  if (clock.status === "paused") remainingMs = clock.remainingMs;
  if (clock.status === "running") {
    remainingMs = Math.min(durationMs, Math.max(0, clock.endsAt - now));
  }

  const complete = clock.status === "running" && remainingMs === 0;
  const running = clock.status === "running" && !complete;
  const paused = clock.status === "paused";
  const editable = !running && !paused;
  const nextPomodoroPhase = phase === "focus" ? "break" : "focus";
  const startPhase = complete && mode === "pomodoro" ? nextPomodoroPhase : phase;
  const seconds = Math.ceil(remainingMs / 1000);
  const display = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  function saveTimer(next: Timer) {
    setTimer(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // The current page can keep running if browser storage is disabled.
    }
  }

  function selectMode(nextMode: Timer["mode"]) {
    if (mode === nextMode) return;
    setCustomInput(String(timer.customMinutes));
    saveTimer({ ...timer, mode: nextMode, phase: "focus", clock: { status: "ready" } });
  }

  function toggleTimer() {
    const time = Date.now();
    setNow(time);

    if (running && clock.status === "running") {
      const left = clock.endsAt - time;
      if (left > 0) saveTimer({ ...timer, clock: { status: "paused", remainingMs: left } });
      return;
    }

    if (mode === "custom" && !validCustom) return;
    const nextDuration = mode === "custom" ? customMinutes : pomodoroDuration[startPhase];
    const nextRemaining = paused && clock.status === "paused"
      ? clock.remainingMs
      : nextDuration * msPerMinute;

    saveTimer({
      mode,
      phase: startPhase,
      customMinutes: mode === "custom" ? customMinutes : timer.customMinutes,
      clock: { status: "running", endsAt: time + nextRemaining },
    });
  }

  let buttonLabel = "Start timer";
  if (running) buttonLabel = "Pause";
  else if (paused) buttonLabel = "Resume";
  else if (mode === "pomodoro") {
    buttonLabel = startPhase === "break"
      ? "Start 5-minute break"
      : "Start 25-minute focus";
  }

  let statusText = "Ready when you are.";
  if (running) statusText = "Timer running.";
  else if (paused) statusText = "Timer paused.";
  else if (complete) {
    statusText = mode === "custom"
      ? "Study timer complete."
      : phase === "focus"
        ? "Focus complete. Take a 5-minute break."
        : "Break complete. Ready for another focus session?";
  }

  return (
    <main className="min-h-screen bg-[#E7F1F6] px-5 py-8 text-[#10263F] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#526B7D] hover:text-[#10263F]"
        >
          ← Back to dashboard
        </Link>
        <header className="my-7">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Lock In</h1>
          <p className="mt-2 text-[#526B7D]">Set a timer for your next study session.</p>
        </header>

        <section aria-label="Study timer" className="rounded-2xl border border-[#C9DEE6] bg-[#F4FAFC] p-4 shadow-sm sm:p-6">
          <div role="group" aria-label="Timer mode" className="grid grid-cols-2 gap-1 rounded-xl bg-[#D7E8EF] p-1">
            {([["pomodoro", "Pomodoro"], ["custom", "Custom timer"]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                disabled={!editable}
                onClick={() => selectMode(value)}
                className="min-h-11 rounded-lg px-2 font-medium text-[#39566A] hover:bg-[#E7F1F6] aria-pressed:bg-white aria-pressed:text-[#10263F] aria-pressed:shadow-sm disabled:cursor-not-allowed"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="my-5">
            {mode === "pomodoro" ? (
              <p className="text-sm text-[#526B7D]">25 minutes of focus, followed by a 5-minute break.</p>
            ) : (
              <label className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium">
                Duration in minutes
                <input
                  type="number"
                  min={1}
                  max={maxCustomMinutes}
                  step={1}
                  value={customInput}
                  disabled={!editable}
                  aria-invalid={!validCustom}
                  aria-describedby="study-duration-range"
                  onChange={(event) => setCustomInput(event.target.value)}
                  className="w-24 rounded-lg border border-[#A9C5D0] bg-white px-3 py-2 disabled:opacity-60"
                />
                <span id="study-duration-range" className={validCustom ? "text-[#526B7D]" : "text-red-700"}>
                  Choose a whole number from 1 to {maxCustomMinutes}.
                </span>
              </label>
            )}
          </div>

          <div className="rounded-xl bg-[#10263F] px-3 py-9 text-center text-white sm:py-11">
            <p className="text-sm font-semibold tracking-wide text-[#BCE6E6]">
              {mode === "custom" ? "Custom session" : phase === "focus" ? "Focus time" : "Short break"}
            </p>
            <p role="timer" aria-label="Time remaining" className="my-2 font-mono text-6xl font-semibold leading-none tracking-tight tabular-nums sm:text-8xl">
              {display}
            </p>
            <p role="status" className="mt-4 min-h-5 text-sm text-[#D7E8EF]">{statusText}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={mode === "custom" && editable && !validCustom}
              onClick={toggleTimer}
              className="min-h-11 rounded-lg bg-[#0D686A] px-5 text-sm font-semibold text-white hover:bg-[#105557] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {buttonLabel}
            </button>
            <button
              type="button"
              disabled={clock.status === "ready"}
              onClick={() => saveTimer({ ...timer, clock: { status: "ready" } })}
              className="min-h-11 rounded-lg border border-[#A9C5D0] bg-white px-5 text-sm font-semibold text-[#10263F] hover:bg-[#E7F1F6] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Reset
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
