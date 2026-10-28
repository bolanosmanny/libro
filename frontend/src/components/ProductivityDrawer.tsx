"use client";

import { useState, useEffect } from "react";
import PomodoroTimer from "./PomodoroTimer";
import StudyChecklist from "./StudyChecklist";

interface ProductivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductivityDrawer({ isOpen, onClose }: ProductivityDrawerProps) {
  const [activeTab, setActiveTab] = useState<"both" | "timer" | "tasks">("both");
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport for layout adaptations
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Academic Productivity Tools"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
        backgroundColor: "rgba(24, 24, 27, 0.35)",
        transition: "opacity 0.25s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: isMobile ? "100%" : "640px",
          maxWidth: "100%",
          height: "100%",
          backgroundColor: "#faf9f6",
          borderLeft: "1px solid #e4e4e7",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxSizing: "border-box",
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e4e4e7",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#faf9f6",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "#18181b",
                  lineHeight: 1.2,
                }}
              >
                Study Tools & Pomodoro
              </h2>
              <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.8rem", color: "#71717a" }}>
                Focus session timer and study checklist
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Productivity Drawer"
            style={{
              background: "transparent",
              border: "none",
              borderRadius: "8px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              color: "#475569",
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
          >
            ✕
          </button>
        </div>

        {/* View Switcher Tabs (especially helpful on smaller screens) */}
        <div
          style={{
            padding: "0.75rem 1.5rem",
            background: "#faf9f6",
            borderBottom: "1px solid #e4e4e7",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "0.35rem", background: "transparent", padding: "0.25rem 0" }}>
            <button
              type="button"
              onClick={() => setActiveTab("both")}
              style={{
                border: "none",
                background: activeTab === "both" ? "#f4f4f5" : "transparent",
                color: activeTab === "both" ? "#18181b" : "#71717a",
                fontWeight: activeTab === "both" ? 700 : 500,
                fontSize: "0.825rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "0",
                cursor: "pointer",
                boxShadow: "none",
              }}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("timer")}
              style={{
                border: "none",
                background: activeTab === "timer" ? "#f4f4f5" : "transparent",
                color: activeTab === "timer" ? "#18181b" : "#71717a",
                fontWeight: activeTab === "timer" ? 700 : 500,
                fontSize: "0.825rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "0",
                cursor: "pointer",
                boxShadow: "none",
              }}
            >
              Timer Only
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              style={{
                border: "none",
                background: activeTab === "tasks" ? "#f4f4f5" : "transparent",
                color: activeTab === "tasks" ? "#18181b" : "#71717a",
                fontWeight: activeTab === "tasks" ? 700 : 500,
                fontSize: "0.825rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "0",
                cursor: "pointer",
                boxShadow: "none",
              }}
            >
              Tasks Only
            </button>
          </div>

          <a
            href="/study"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.8rem",
              color: "#52525b",
              textDecoration: "none",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            Open in Full Tab ↗
          </a>
        </div>

        {/* Drawer Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "2rem",
          }}
        >
          {/* Pomodoro Timer Section */}
          {(activeTab === "both" || activeTab === "timer") && (
            <section
              aria-label="Pomodoro Timer"
              style={{
                background: "#ffffff",
                padding: "1.5rem",
                borderRadius: "0",
                border: "1px solid #e4e4e7",
              }}
            >
              <PomodoroTimer />
            </section>
          )}

          {/* Study Checklist Section */}
          {(activeTab === "both" || activeTab === "tasks") && (
            <section
              aria-label="Study Task Checklist"
              style={{
                background: "#ffffff",
                padding: activeTab === "tasks" ? "0.5rem" : "0",
                borderRadius: "12px",
              }}
            >
              <StudyChecklist />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
