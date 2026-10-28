"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { audioManager } from "@/lib/audioAlert";

export type TimerMode = "focus" | "shortBreak" | "longBreak";

interface TimerSettings {
  focusDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number; // sessions before long break
}

const DEFAULT_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
};

interface PomodoroTimerProps {
  onSessionComplete?: (mode: TimerMode, completedCount: number) => void;
  onOpenSettingsRequested?: () => void;
}

export default function PomodoroTimer({ onSessionComplete }: PomodoroTimerProps) {
  // Settings
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);

  // Timer State
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_SETTINGS.focusDuration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);

  // Sound & Notifications
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  // On-Screen Break / Completion Prompt Modal
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    type: "focusCompleted" | "breakCompleted";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "focusCompleted",
    title: "",
    message: "",
  });

  // Accurate timing references (prevents background tab drift)
  const targetEndTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load persisted settings & session counts on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem("libro_pomodoro_settings");
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setSettings(parsed);
        setTempSettings(parsed);
        setTimeLeft(parsed.focusDuration * 60);
      }
      const storedSessions = localStorage.getItem("libro_pomodoro_completed_count");
      if (storedSessions) {
        setCompletedSessions(parseInt(storedSessions, 10) || 0);
      }
      setSoundEnabled(audioManager.isSoundEnabled());

      if (typeof window !== "undefined" && "Notification" in window) {
        setNotificationPermission(Notification.permission);
      }
    } catch (e) {
      console.error("Failed to load timer settings:", e);
    }
  }, []);

  // Total seconds for current mode
  const getTotalSecondsForMode = useCallback(
    (currentMode: TimerMode, currentSettings: TimerSettings = settings): number => {
      switch (currentMode) {
        case "focus":
          return currentSettings.focusDuration * 60;
        case "shortBreak":
          return currentSettings.shortBreakDuration * 60;
        case "longBreak":
          return currentSettings.longBreakDuration * 60;
      }
    },
    [settings]
  );

  // Update browser document title with countdown
  useEffect(() => {
    if (typeof document === "undefined") return;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    const modeLabels: Record<TimerMode, string> = {
      focus: "Focus",
      shortBreak: "Short Break",
      longBreak: "Long Break",
    };

    if (isRunning) {
      document.title = `(${formatted}) ${modeLabels[mode]} | Libro`;
    } else {
      document.title = "Libro - Study Session";
    }

    return () => {
      document.title = "Libro - Study Session";
    };
  }, [timeLeft, isRunning, mode]);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  // Trigger countdown completion actions (sound, notification, on-screen break prompt)
  const handleTimerFinished = useCallback(() => {
    // 1. Audible alert chime
    audioManager.playCompletionChime();

    // 2. Browser Desktop Notification
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const title = mode === "focus" ? "Focus session finished" : "Break finished";
        const body =
          mode === "focus"
            ? "Awesome work! Take a break to refresh your mind."
            : "Break is over. Ready to jump into your next focus block?";
        new Notification(title, { body, icon: "/favicon.ico" });
      } catch (e) {
        console.warn("Notification error:", e);
      }
    }

    // 3. Update session metrics
    if (mode === "focus") {
      const newCount = completedSessions + 1;
      setCompletedSessions(newCount);
      localStorage.setItem("libro_pomodoro_completed_count", String(newCount));
      onSessionComplete?.("focus", newCount);

      const isLongBreakTime = newCount % settings.longBreakInterval === 0;

      // 4. On-screen break prompt modal
      setPromptModal({
        isOpen: true,
        type: "focusCompleted",
        title: "Focus session complete",
        message: isLongBreakTime
          ? `Outstanding! You've finished ${newCount} focus sessions. Time for an extended ${settings.longBreakDuration}-minute break!`
          : `Great job! You've finished session #${newCount}. Take a short ${settings.shortBreakDuration}-minute break to recharge.`,
      });
    } else {
      onSessionComplete?.(mode, completedSessions);
      setPromptModal({
        isOpen: true,
        type: "breakCompleted",
        title: "Break complete",
        message: "Your break is finished. Ready to start your next focus session?",
      });
    }
  }, [mode, completedSessions, settings, onSessionComplete]);

  // Main timer tick logic (drift-compensated)
  useEffect(() => {
    if (!isRunning) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      targetEndTimeRef.current = null;
      return;
    }

    // Set end target time based on current timeLeft
    targetEndTimeRef.current = Date.now() + timeLeft * 1000;

    timerIntervalRef.current = setInterval(() => {
      if (!targetEndTimeRef.current) return;
      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.round((targetEndTimeRef.current - now) / 1000));

      setTimeLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setIsRunning(false);
        handleTimerFinished();
      }
    }, 250);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isRunning, handleTimerFinished]);

  // Controls
  const toggleStartPause = () => {
    setIsRunning((prev) => !prev);
  };

  // Alternative Path 4a: Timer Paused / Reset
  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getTotalSecondsForMode(mode));
  };

  const handleSwitchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(getTotalSecondsForMode(newMode));
  };

  const handleSkipNext = () => {
    setIsRunning(false);
    if (mode === "focus") {
      const isLongBreak = (completedSessions + 1) % settings.longBreakInterval === 0;
      handleSwitchMode(isLongBreak ? "longBreak" : "shortBreak");
    } else {
      handleSwitchMode("focus");
    }
  };

  // Save custom interval settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(tempSettings);
    localStorage.setItem("libro_pomodoro_settings", JSON.stringify(tempSettings));
    setIsSettingsOpen(false);

    // Apply new duration if not running
    if (!isRunning) {
      setTimeLeft(getTotalSecondsForMode(mode, tempSettings));
    }
  };

  const handleRestoreDefaults = () => {
    setTempSettings(DEFAULT_SETTINGS);
  };

  // Toggle sound
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    audioManager.setSoundEnabled(nextState);
    if (nextState) {
      audioManager.playTestChime();
    }
  };

  // Progress Calculations for Visual Timer Bar
  const totalSeconds = getTotalSecondsForMode(mode);
  const elapsedSeconds = totalSeconds - timeLeft;
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Theme styling based on mode
  const modeColors = {
    focus: {
      primary: "#27272a",
      light: "#fafafa",
      accent: "#52525b",
      text: "#3f3f46",
      badge: "Focus Session",
      badgeBg: "#f4f4f5",
    },
    shortBreak: {
      primary: "#27272a",
      light: "#fafafa",
      accent: "#52525b",
      text: "#3f3f46",
      badge: "Short Break",
      badgeBg: "#f4f4f5",
    },
    longBreak: {
      primary: "#27272a",
      light: "#fafafa",
      accent: "#52525b",
      text: "#3f3f46",
      badge: "Long Break",
      badgeBg: "#f4f4f5",
    },
  }[mode];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        fontFamily: "inherit",
      }}
    >
      {/* Mode Selector Tabs */}
      <div
        role="tablist"
        aria-label="Pomodoro Intervals"
        style={{
          display: "flex",
          gap: "0.35rem",
          background: "#fafafa",
          padding: "0.35rem",
          borderRadius: "12px",
          marginBottom: "1.5rem",
          width: "100%",
          maxWidth: "380px",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "focus"}
          onClick={() => handleSwitchMode("focus")}
          style={{
            flex: 1,
            padding: "0.55rem 0.5rem",
            fontSize: "0.85rem",
            fontWeight: mode === "focus" ? 700 : 500,
            color: mode === "focus" ? "#18181b" : "#71717a",
            background: mode === "focus" ? "#ffffff" : "transparent",
            border: mode === "focus" ? "1px solid #d4d4d8" : "1px solid transparent",
            borderRadius: "0",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "none",
            whiteSpace: "nowrap",
          }}
        >
          Focus · {settings.focusDuration}m
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "shortBreak"}
          onClick={() => handleSwitchMode("shortBreak")}
          style={{
            flex: 1,
            padding: "0.55rem 0.5rem",
            fontSize: "0.85rem",
            fontWeight: mode === "shortBreak" ? 700 : 500,
            color: mode === "shortBreak" ? "#18181b" : "#71717a",
            background: mode === "shortBreak" ? "#ffffff" : "transparent",
            border: mode === "shortBreak" ? "1px solid #d4d4d8" : "1px solid transparent",
            borderRadius: "0",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "none",
            whiteSpace: "nowrap",
          }}
        >
          Short break · {settings.shortBreakDuration}m
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "longBreak"}
          onClick={() => handleSwitchMode("longBreak")}
          style={{
            flex: 1,
            padding: "0.55rem 0.5rem",
            fontSize: "0.85rem",
            fontWeight: mode === "longBreak" ? 700 : 500,
            color: mode === "longBreak" ? "#18181b" : "#71717a",
            background: mode === "longBreak" ? "#ffffff" : "transparent",
            border: mode === "longBreak" ? "1px solid #d4d4d8" : "1px solid transparent",
            borderRadius: "0",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "none",
            whiteSpace: "nowrap",
          }}
        >
          Long break · {settings.longBreakDuration}m
        </button>
      </div>

      <div className="mb-5 text-center">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          {modeColors.badge}
        </p>
        <p className="font-mono text-6xl font-light leading-none tracking-tighter text-zinc-950 tabular-nums md:text-8xl">
          {formattedTime}
        </p>
        <p className="mt-4 inline-flex items-center gap-2 text-xs text-zinc-500">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isRunning ? "bg-emerald-700" : "bg-zinc-300"
            }`}
          />
          {isRunning ? "Running" : timeLeft === totalSeconds ? "Ready" : "Paused"}
        </p>
      </div>

      {/* Visual Linear Progress Bar */}
      <div
        style={{
          width: "100%",
          maxWidth: "340px",
          height: "6px",
          background: "#e4e4e7",
          overflow: "hidden",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            background: "#52525b",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Cycle Session Indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem",
          color: "#64748b",
          marginBottom: "1.25rem",
        }}
      >
        <span>
          Cycle: <strong>{(completedSessions % settings.longBreakInterval) + 1}</strong> of{" "}
          <strong>{settings.longBreakInterval}</strong>
        </span>
        <span style={{ color: "#cbd5e1" }}>•</span>
        <span>
          Total Completed: <strong>{completedSessions}</strong>
        </span>
      </div>

      {/* Main Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          maxWidth: "360px",
          marginBottom: "1.5rem",
        }}
      >
        {/* Reset button (Alternative path 4a) */}
        <button
          type="button"
          onClick={handleResetTimer}
          title="Reset timer without clearing task list"
          style={{
            padding: "0.75rem 1rem",
            background: "#ffffff",
            color: "#475569",
            border: "1px solid #e2e8f0",
            borderRadius: "0",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f4f5")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
        >
          <span>↺ Reset</span>
        </button>

        {/* Start / Pause Primary Button */}
        <button
          type="button"
          onClick={toggleStartPause}
          style={{
            flex: 1,
            padding: "0.75rem 1.5rem",
            background: "#27272a",
            color: "#ffffff",
            border: "none",
            borderRadius: "0",
            fontWeight: 700,
            fontSize: "1.05rem",
            cursor: "pointer",
            boxShadow: "none",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          {isRunning ? "Pause" : timeLeft === totalSeconds ? "Start" : "Resume"}
        </button>

        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkipNext}
          title="Skip to next phase"
          style={{
            padding: "0.75rem 1rem",
            background: "#ffffff",
            color: "#475569",
            border: "1px solid #e2e8f0",
            borderRadius: "0",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f4f5")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
        >
          <span>Skip</span>
        </button>
      </div>

      {/* Auxiliary Controls (Settings & Sound) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          maxWidth: "360px",
          paddingTop: "0.5rem",
          borderTop: "1px solid #e4e4e7",
          fontSize: "0.825rem",
          color: "#64748b",
        }}
      >
        {/* Interval Settings Trigger */}
        <button
          type="button"
          onClick={() => {
            setTempSettings(settings);
            setIsSettingsOpen(true);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#3f3f46",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "0.3rem 0.5rem",
            borderRadius: "6px",
          }}
        >
          Customize intervals
        </button>

        {/* Sound Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={handleToggleSound}
            title={soundEnabled ? "Mute audio alert chime" : "Unmute audio alert chime"}
            style={{
              background: "#ffffff",
              color: "#52525b",
              border: "1px solid #d4d4d8",
              padding: "0.25rem 0.5rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: "0.8rem",
            }}
          >
            {soundEnabled ? "Chime: On" : "Chime: Off"}
          </button>

          {notificationPermission !== "granted" && (
            <button
              type="button"
              onClick={requestNotificationPermission}
              title="Enable browser notifications"
              style={{
                background: "transparent",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                fontSize: "0.8rem",
                textDecoration: "underline",
              }}
            >
              Desktop Alerts
            </button>
          )}
        </div>
      </div>

      {/* On-Screen Break Prompt Modal (Course of Events Step 7) */}
      {promptModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(24, 24, 27, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "0",
              maxWidth: "440px",
              width: "100%",
              padding: "2rem",
              border: "1px solid #e4e4e7",
              boxShadow: "none",
              textAlign: "center",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <h3
              id="prompt-title"
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 0.5rem 0",
              }}
            >
              {promptModal.title}
            </h3>

            <p
              style={{
                fontSize: "0.95rem",
                color: "#475569",
                lineHeight: 1.5,
                margin: "0 0 1.75rem 0",
              }}
            >
              {promptModal.message}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {promptModal.type === "focusCompleted" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPromptModal((prev) => ({ ...prev, isOpen: false }));
                      handleSwitchMode("shortBreak");
                      setIsRunning(true);
                    }}
                    style={{
                      padding: "0.8rem 1.2rem",
                      background: "#27272a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "0",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      cursor: "pointer",
                    }}
                  >
                    Start {settings.shortBreakDuration}-Min Short Break
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPromptModal((prev) => ({ ...prev, isOpen: false }));
                      handleSwitchMode("longBreak");
                      setIsRunning(true);
                    }}
                    style={{
                      padding: "0.75rem 1.2rem",
                      background: "#52525b",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "0",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      cursor: "pointer",
                    }}
                  >
                    Start {settings.longBreakDuration}-Min Long Break
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPromptModal((prev) => ({ ...prev, isOpen: false }));
                      handleSwitchMode("focus");
                      setIsRunning(true);
                    }}
                    style={{
                      padding: "0.65rem 1.2rem",
                      background: "transparent",
                      color: "#3f3f46",
                      border: "1px solid #d4d4d8",
                      borderRadius: "0",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    Keep Focusing (Start Next Session)
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPromptModal((prev) => ({ ...prev, isOpen: false }));
                    handleSwitchMode("focus");
                    setIsRunning(true);
                  }}
                  style={{
                    padding: "0.8rem 1.2rem",
                    background: "#27272a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "0",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                  }}
                >
                  Start {settings.focusDuration}-Min Focus Session
                </button>
              )}

              <button
                type="button"
                onClick={() => setPromptModal((prev) => ({ ...prev, isOpen: false }))}
                style={{
                  padding: "0.6rem 1.2rem",
                  background: "transparent",
                  color: "#64748b",
                  border: "none",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  marginTop: "0.25rem",
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interval Settings Modal */}
      {isSettingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(24, 24, 27, 0.4)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "0",
              maxWidth: "420px",
              width: "100%",
              padding: "1.75rem",
              border: "1px solid #e4e4e7",
              boxShadow: "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 id="settings-title" style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                Timer Preferences
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                ×
              </button>
            </div>

            {/* Quick Presets */}
            <div style={{ marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                Quick Presets
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[
                  { name: "25 / 5m", focus: 25, short: 5, long: 15 },
                  { name: "50 / 10m", focus: 50, short: 10, long: 20 },
                  { name: "15 / 3m", focus: 15, short: 3, long: 10 },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      setTempSettings((prev) => ({
                        ...prev,
                        focusDuration: preset.focus,
                        shortBreakDuration: preset.short,
                        longBreakDuration: preset.long,
                      }))
                    }
                    style={{
                      flex: 1,
                      padding: "0.4rem 0.5rem",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      background: "#fafafa",
                      border: "1px solid #e4e4e7",
                      borderRadius: "0",
                      cursor: "pointer",
                      color: "#334155",
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                    Focus Session (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={tempSettings.focusDuration}
                    onChange={(e) =>
                      setTempSettings({ ...tempSettings, focusDuration: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1.5px solid #d1d5db",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                    Short Break (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={tempSettings.shortBreakDuration}
                    onChange={(e) =>
                      setTempSettings({ ...tempSettings, shortBreakDuration: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1.5px solid #d1d5db",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                    Long Break (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={tempSettings.longBreakDuration}
                    onChange={(e) =>
                      setTempSettings({ ...tempSettings, longBreakDuration: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1.5px solid #d1d5db",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                    Long Break Interval (every N sessions)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tempSettings.longBreakInterval}
                    onChange={(e) =>
                      setTempSettings({ ...tempSettings, longBreakInterval: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      border: "1.5px solid #d1d5db",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#64748b",
                    fontSize: "0.825rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Reset Defaults
                </button>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    style={{
                      padding: "0.55rem 1rem",
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "0.55rem 1.25rem",
                      background: "#27272a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "0",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
