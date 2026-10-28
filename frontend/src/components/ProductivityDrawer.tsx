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
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
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
          backgroundColor: "#ffffff",
          boxShadow: "-8px 0 25px rgba(0, 0, 0, 0.15)",
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
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.5rem" }}>⏱️</span>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.2,
                }}
              >
                Study Tools & Pomodoro
              </h2>
              <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                Focus session timer and study checklist
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Productivity Drawer"
            style={{
              background: "#f1f5f9",
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
            background: "#ffffff",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "0.35rem", background: "#f1f5f9", padding: "0.25rem", borderRadius: "8px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("both")}
              style={{
                border: "none",
                background: activeTab === "both" ? "#ffffff" : "transparent",
                color: activeTab === "both" ? "#0f172a" : "#64748b",
                fontWeight: activeTab === "both" ? 700 : 500,
                fontSize: "0.825rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: activeTab === "both" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              }}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("timer")}
              style={{
                border: "none",
                background: activeTab === "timer" ? "#ffffff" : "transparent",
                color: activeTab === "timer" ? "#0f172a" : "#64748b",
                fontWeight: activeTab === "timer" ? 700 : 500,
                fontSize: "0.825rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: activeTab === "timer" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              }}
            >
              Timer Only
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              style={{
                border: "none",
                background: activeTab === "tasks" ? "#ffffff" : "transparent",
                color: activeTab === "tasks" ? "#0f172a" : "#64748b",
                fontWeight: activeTab === "tasks" ? 700 : 500,
                fontSize: "0.825rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: activeTab === "tasks" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
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
              color: "#2563eb",
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
                background: "#f8fafc",
                padding: "1.5rem",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
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

