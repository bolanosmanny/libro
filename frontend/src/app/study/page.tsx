"use client";

import { useState } from "react";
import Link from "next/link";
import PomodoroTimer from "@/components/PomodoroTimer";
import StudyChecklist from "@/components/StudyChecklist";

export default function StudyPage() {
  const [fullscreenFocus, setFullscreenFocus] = useState(false);

  return (
    <main
      className={`min-h-[calc(100vh-65px)] transition-colors duration-300 ${
        fullscreenFocus ? "bg-[#0b1320] text-slate-100" : "bg-slate-50 text-slate-900"
      } py-8 px-4 sm:px-6 lg:px-8`}
    >
      <div className="mx-auto max-w-6xl">
        {/* Navigation & Header */}
        {!fullscreenFocus && (
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏱️</span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Academic Productivity Session
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Library study aids • Customizable Pomodoro focus timer & daily objectives planner.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFullscreenFocus(true)}
                title="Enter distraction-free study mode"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                <span>🔲 Focus Mode</span>
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-500"
              >
                <span>← Your Activity</span>
              </Link>
            </div>
          </header>
        )}

        {/* Exit Focus Mode Banner */}
        {fullscreenFocus && (
          <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-xs font-bold tracking-wider uppercase text-slate-400">
                Distraction-Free Focus Mode
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFullscreenFocus(false)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              ✕ Exit Focus Mode
            </button>
          </div>
        )}

        {/* Responsive Grid: Pomodoro Timer & Study Objectives */}
        <div className="grid gap-8 lg:grid-cols-2 items-start">
          {/* Pomodoro Focus Timer Card */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 shadow-sm transition-all ${
              fullscreenFocus
                ? "border-slate-800 bg-[#111c2e] text-white shadow-xl"
                : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold tracking-tight">Pomodoro Focus Timer</h2>
              <p
                className={`mt-1 text-xs ${
                  fullscreenFocus ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Structure your study blocks with interval chimes and on-screen break alerts.
              </p>
            </div>

            <PomodoroTimer />
          </section>

          {/* Daily Study Checklist Card */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 shadow-sm transition-all ${
              fullscreenFocus
                ? "border-slate-800 bg-[#111c2e] text-white shadow-xl"
                : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <StudyChecklist />
          </section>
        </div>

        {/* Patron Productivity Guide / Tips */}
        {!fullscreenFocus && (
          <aside className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-4">
              📚 Library Study Tips & Techniques
            </h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🎯</span> The Pomodoro Technique
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  25 minutes of deep focus followed by a 5-minute break helps maintain cognitive energy, improve memory consolidation, and avoid study fatigue.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🔔</span> Quiet Zone Friendly
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Audible chimes use soft synthesized Web Audio harmonics designed for library environments. You can toggle audio cues on or off at any time.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>💾</span> Persistent Session State
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Your daily objectives and interval settings persist locally in your browser, remaining available throughout your entire library visit.
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
