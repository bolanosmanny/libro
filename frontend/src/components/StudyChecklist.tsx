"use client";

import { useState, useEffect } from "react";

export interface StudyTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

interface StudyChecklistProps {
  onTaskChange?: (tasks: StudyTask[]) => void;
}

export default function StudyChecklist({ onTaskChange }: StudyChecklistProps) {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load tasks from localStorage on initial render
  useEffect(() => {
    try {
      const stored = localStorage.getItem("libro_study_tasks");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTasks(parsed);
          onTaskChange?.(parsed);
        }
      } else {
        // Helpful starter suggestions for a library patron
        const defaults: StudyTask[] = [
          { id: "1", title: "Review Chapter 4 lecture notes", completed: false, createdAt: Date.now() - 3600000 },
          { id: "2", title: "Outline research paper bibliography", completed: true, createdAt: Date.now() - 7200000 },
        ];
        setTasks(defaults);
        localStorage.setItem("libro_study_tasks", JSON.stringify(defaults));
        onTaskChange?.(defaults);
      }
    } catch (e) {
      console.error("Failed to load study tasks from storage:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save tasks to localStorage when updated
  const saveTasks = (updated: StudyTask[]) => {
    setTasks(updated);
    onTaskChange?.(updated);
    try {
      localStorage.setItem("libro_study_tasks", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save study tasks:", e);
    }
  };

  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;

    const newTask: StudyTask = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      title: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    const updated = [newTask, ...tasks];
    saveTasks(updated);
    setNewTaskTitle("");
  };

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveTasks(updated);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((task) => task.id !== id);
    saveTasks(updated);
  };

  // Alternative Path 6a: Clear Completed Tasks
  const handleClearCompleted = () => {
    const updated = tasks.filter((task) => !task.completed);
    saveTasks(updated);
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTasks = tasks.filter((task) => {
    if (filter === "pending") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  if (!isLoaded) {
    return (
      <div style={{ padding: "1.5rem", textAlign: "center", color: "#6b7280" }}>
        Loading study checklist...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "1.25rem" }}>
      {/* Header and Summary */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#111827" }}>
            Study Objectives
          </h3>
          <span style={{ fontSize: "0.85rem", color: "#4b5563", fontWeight: 600 }}>
            {completedCount} / {totalCount} done ({progressPercent}%)
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            height: "6px",
            background: "#e5e7eb",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: progressPercent === 100 ? "#10b981" : "#3b82f6",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Input Form: Add Task */}
      <form
        onSubmit={handleAddTask}
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "stretch",
        }}
      >
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="e.g. Read 20 pages of Organic Chemistry..."
          aria-label="Target study objective"
          style={{
            flex: 1,
            padding: "0.65rem 0.85rem",
            fontSize: "0.925rem",
            border: "1.5px solid #d1d5db",
            borderRadius: "8px",
            outline: "none",
            backgroundColor: "#fff",
            color: "#111827",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
          onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
        />
        <button
          type="submit"
          disabled={!newTaskTitle.trim()}
          style={{
            padding: "0.65rem 1.15rem",
            background: newTaskTitle.trim() ? "#2563eb" : "#9ca3af",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: newTaskTitle.trim() ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
            transition: "background-color 0.2s ease",
          }}
        >
          Add Task
        </button>
      </form>

      {/* Filter Tabs and Bulk Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
          fontSize: "0.85rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.25rem", background: "#f3f4f6", padding: "0.2rem", borderRadius: "6px" }}>
          {(["all", "pending", "completed"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              style={{
                border: "none",
                background: filter === tab ? "#ffffff" : "transparent",
                color: filter === tab ? "#111827" : "#6b7280",
                fontWeight: filter === tab ? 600 : 500,
                padding: "0.25rem 0.65rem",
                borderRadius: "5px",
                cursor: "pointer",
                boxShadow: filter === tab ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Alternative Path 6a: Clear Completed */}
        {completedCount > 0 && (
          <button
            type="button"
            onClick={handleClearCompleted}
            title="Purge checked items while maintaining remaining pending tasks"
            style={{
              background: "transparent",
              color: "#dc2626",
              border: "1px solid #fca5a5",
              borderRadius: "6px",
              padding: "0.25rem 0.6rem",
              fontSize: "0.8rem",
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <span>🗑️ Clear Completed ({completedCount})</span>
          </button>
        )}
      </div>

      {/* Task List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: "180px",
          maxHeight: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          paddingRight: "0.25rem",
        }}
      >
        {filteredTasks.length === 0 ? (
          <div
            style={{
              margin: "auto 0",
              textAlign: "center",
              padding: "2rem 1rem",
              color: "#9ca3af",
              background: "#f9fafb",
              borderRadius: "8px",
              border: "1px dashed #e5e7eb",
            }}
          >
            <p style={{ margin: "0 0 0.25rem 0", fontWeight: 600, fontSize: "0.95rem" }}>
              {filter === "completed"
                ? "No completed tasks yet."
                : filter === "pending"
                ? "All caught up! No pending tasks."
                : "No tasks yet."}
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem" }}>
              {filter === "all" ? "Add study goals above to track your session progress." : ""}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.65rem 0.85rem",
                background: task.completed ? "#f9fafb" : "#ffffff",
                border: task.completed ? "1px solid #e5e7eb" : "1px solid #e2e8f0",
                borderRadius: "8px",
                transition: "all 0.15s ease",
                boxShadow: task.completed ? "none" : "0 1px 2px rgba(0,0,0,0.03)",
              }}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggleTask(task.id)}
                aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
                style={{
                  width: "1.15rem",
                  height: "1.15rem",
                  cursor: "pointer",
                  accentColor: "#2563eb",
                  flexShrink: 0,
                }}
              />

              {/* Title */}
              <span
                onClick={() => handleToggleTask(task.id)}
                style={{
                  flex: 1,
                  fontSize: "0.925rem",
                  color: task.completed ? "#9ca3af" : "#1f2937",
                  textDecoration: task.completed ? "line-through" : "none",
                  cursor: "pointer",
                  wordBreak: "break-word",
                  userSelect: "none",
                }}
              >
                {task.title}
              </span>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleDeleteTask(task.id)}
                title="Remove task"
                aria-label="Remove task"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  padding: "0.2rem 0.4rem",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  lineHeight: 1,
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

