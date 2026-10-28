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
      focus: "🎯 Focus",
      shortBreak: "☕ Short Break",
      longBreak: "🌿 Long Break",
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
        const title = mode === "focus" ? "🎉 Focus Session Finished!" : "⏰ Break Finished!";
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
        title: "🎉 Focus Session Complete!",
        message: isLongBreakTime
          ? `Outstanding! You've finished ${newCount} focus sessions. Time for an extended ${settings.longBreakDuration}-minute break!`
          : `Great job! You've finished session #${newCount}. Take a short ${settings.shortBreakDuration}-minute break to recharge.`,
      });
    } else {
      onSessionComplete?.(mode, completedSessions);
      setPromptModal({
        isOpen: true,
        type: "breakCompleted",
        title: "☕ Break Complete!",
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

  // Circular Timer Bar geometry (SVG)
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Theme styling based on mode
  const modeColors = {
    focus: {
      primary: "#2563eb",
      light: "#eff6ff",
      accent: "#3b82f6",
      text: "#1e40af",
      badge: "Focus Session",
      badgeBg: "#dbeafe",
    },
    shortBreak: {
      primary: "#10b981",
      light: "#ecfdf5",
      accent: "#34d399",
      text: "#065f46",
      badge: "Short Break",
      badgeBg: "#d1fae5",
    },
    longBreak: {
      primary: "#8b5cf6",
      light: "#f5f3ff",
      accent: "#a78bfa",
      text: "#5b21b6",
      badge: "Long Break",
      badgeBg: "#ede9fe",
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
          background: "#f1f5f9",
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
            color: mode === "focus" ? "#1e40af" : "#64748b",
            background: mode === "focus" ? "#ffffff" : "transparent",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: mode === "focus" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
            whiteSpace: "nowrap",
          }}
        >
          🎯 Focus ({settings.focusDuration}m)
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
            color: mode === "shortBreak" ? "#065f46" : "#64748b",
            background: mode === "shortBreak" ? "#ffffff" : "transparent",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: mode === "shortBreak" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
            whiteSpace: "nowrap",
          }}
        >
          ☕ Short ({settings.shortBreakDuration}m)
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
            color: mode === "longBreak" ? "#5b21b6" : "#64748b",
            background: mode === "longBreak" ? "#ffffff" : "transparent",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: mode === "longBreak" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
            whiteSpace: "nowrap",
          }}
        >
          🌿 Long ({settings.longBreakDuration}m)
        </button>
      </div>

      {/* Visual Timer: Circular Bar & Digital Countdown Display */}
      <div
        style={{
          position: "relative",
          width: "240px",
          height: "240px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1rem",
        }}
      >
        <svg
          width="240"
          height="240"
          viewBox="0 0 240 240"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        >
          {/* Background Track */}
          <circle
            cx="120"
            cy="120"
            r={radius}
            stroke="#e2e8f0"
            strokeWidth="12"
            fill="transparent"
          />
          {/* Visual Timer Bar (Progress Circle) */}
          <circle
            cx="120"
            cy="120"
            r={radius}
            stroke={modeColors.primary}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: isRunning ? "stroke-dashoffset 0.3s ease" : "stroke-dashoffset 0.15s ease",
            }}
          />
        </svg>

        {/* Center Digital Display */}
        <div
          style={{
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {/* Mode status badge */}
          <span
            style={{
              background: modeColors.badgeBg,
              color: modeColors.text,
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "0.2rem 0.6rem",
              borderRadius: "999px",
              marginBottom: "0.35rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {modeColors.badge}
          </span>

          {/* Time digits */}
          <span
            style={{
              fontSize: "3.25rem",
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              fontFamily: "monospace, sans-serif",
            }}
          >
            {formattedTime}
          </span>

          {/* Running/Paused indicator */}
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: isRunning ? modeColors.primary : "#94a3b8",
              marginTop: "0.4rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isRunning ? modeColors.primary : "#cbd5e1",
                display: "inline-block",
                boxShadow: isRunning ? `0 0 8px ${modeColors.primary}` : "none",
              }}
            />
            {isRunning ? "Running" : timeLeft === totalSeconds ? "Ready" : "Paused"}
          </span>
        </div>
      </div>

      {/* Visual Linear Progress Bar */}
      <div
        style={{
          width: "100%",
          maxWidth: "340px",
          height: "6px",
          background: "#e2e8f0",
          borderRadius: "999px",
          overflow: "hidden",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            background: modeColors.primary,
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
            background: "#f1f5f9",
            color: "#475569",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
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
            background: isRunning ? "#ef4444" : modeColors.primary,
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "1.05rem",
            cursor: "pointer",
            boxShadow: `0 4px 12px ${isRunning ? "rgba(239,68,68,0.25)" : "rgba(37,99,235,0.25)"}`,
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          {isRunning ? "⏸ Pause" : timeLeft === totalSeconds ? "▶ Start Session" : "▶ Resume"}
        </button>

        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkipNext}
          title="Skip to next phase"
          style={{
            padding: "0.75rem 1rem",
            background: "#f1f5f9",
            color: "#475569",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
        >
          <span>⏭ Skip</span>
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
          borderTop: "1px solid #f1f5f9",
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
            color: "#2563eb",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "0.3rem 0.5rem",
            borderRadius: "6px",
          }}
        >
          ⚙️ Customize Intervals
        </button>

        {/* Sound Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={handleToggleSound}
            title={soundEnabled ? "Mute audio alert chime" : "Unmute audio alert chime"}
            style={{
              background: soundEnabled ? "#f0fdf4" : "#fef2f2",
              color: soundEnabled ? "#166534" : "#991b1b",
              border: `1px solid ${soundEnabled ? "#bbf7d0" : "#fecaca"}`,
              padding: "0.25rem 0.5rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: "0.8rem",
            }}
          >
            {soundEnabled ? "🔔 Chime: On" : "🔕 Chime: Off"}
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
            backgroundColor: "rgba(15, 23, 42, 0.6)",
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
              borderRadius: "16px",
              maxWidth: "440px",
              width: "100%",
              padding: "2rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              textAlign: "center",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <div
              style={{
                fontSize: "3rem",
                marginBottom: "0.75rem",
              }}
            >
              {promptModal.type === "focusCompleted" ? "🎉" : "☕"}
            </div>

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
                      background: "#10b981",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
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
                      background: "#8b5cf6",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
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
                      color: "#2563eb",
                      border: "1px solid #bfdbfe",
                      borderRadius: "10px",
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
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
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
            backgroundColor: "rgba(15, 23, 42, 0.5)",
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
              borderRadius: "16px",
              maxWidth: "420px",
              width: "100%",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
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
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
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
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
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

