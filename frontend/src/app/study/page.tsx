"use client";

import { useState } from "react";
import Link from "next/link";
import PomodoroTimer from "@/components/PomodoroTimer";
import StudyChecklist from "@/components/StudyChecklist";

export default function StudyPage() {
  const [fullscreenFocus, setFullscreenFocus] = useState(false);

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${
        fullscreenFocus ? "bg-zinc-950 text-zinc-100" : "bg-[#faf9f6] text-zinc-900"
      } py-8 px-4 sm:px-6 lg:px-8`}
    >
      <div className="mx-auto max-w-6xl">
        {/* Navigation & Header */}
        {!fullscreenFocus && (
          <header className="mb-10 flex flex-col gap-5 border-b border-zinc-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">Practice</p>
              <h1 className="text-4xl font-medium tracking-tight text-zinc-950 sm:text-5xl">
                Study tools
              </h1>
              <p className="mt-3 text-sm text-zinc-500">
                Focus intervals and daily objectives, designed for quiet work.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFullscreenFocus(true)}
                title="Enter distraction-free study mode"
                className="border border-zinc-300 px-3.5 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-500"
              >
                <span>Focus mode</span>
              </button>
              <Link
                href="/dashboard"
                className="px-3 py-2 text-xs font-medium text-zinc-600 transition hover:text-zinc-950"
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
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                Focus mode
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFullscreenFocus(false)}
              className="border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500"
            >
              Exit focus mode
            </button>
          </div>
        )}

        {/* Responsive Grid: Pomodoro Timer & Study Objectives */}
        <div className="grid gap-8 lg:grid-cols-2 items-start">
          {/* Pomodoro Focus Timer Card */}
          <section
            className={`border p-6 sm:p-8 transition-all ${
              fullscreenFocus
                ? "border-zinc-800 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-900"
            }`}
          >
            <div className="mb-6 text-center">
              <h2 className="text-xl font-medium tracking-tight">Pomodoro timer</h2>
              <p
                className={`mt-1 text-xs ${
                  fullscreenFocus ? "text-zinc-400" : "text-zinc-500"
                }`}
              >
                Structure your study blocks with interval chimes and on-screen break alerts.
              </p>
            </div>

            <PomodoroTimer />
          </section>

          {/* Daily Study Checklist Card */}
          <section
            className={`border p-6 sm:p-8 transition-all ${
              fullscreenFocus
                ? "border-zinc-800 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-900"
            }`}
          >
            <StudyChecklist />
          </section>
        </div>

        {/* Patron Productivity Guide / Tips */}
        {!fullscreenFocus && (
          <aside className="mt-10 border-y border-zinc-200 bg-white p-6">
            <h3 className="mb-4 font-mono text-xs uppercase tracking-wider text-zinc-500">
              Field notes
            </h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h4 className="text-sm font-medium text-zinc-900">
                  The Pomodoro technique
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  25 minutes of deep focus followed by a 5-minute break helps maintain cognitive energy, improve memory consolidation, and avoid study fatigue.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-zinc-900">
                  Quiet-zone friendly
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Audible chimes use soft synthesized Web Audio harmonics designed for library environments. You can toggle audio cues on or off at any time.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-zinc-900">
                  Persistent session state
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
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
