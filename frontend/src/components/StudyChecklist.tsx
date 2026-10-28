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

  useEffect(() => {
    try {
      const stored = localStorage.getItem("libro_study_tasks");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTasks(parsed);
          onTaskChange?.(parsed);
        }
      } else {
        const defaults: StudyTask[] = [
          {
            id: "1",
            title: "Review Chapter 4 lecture notes",
            completed: false,
            createdAt: Date.now() - 3_600_000,
          },
          {
            id: "2",
            title: "Outline research paper bibliography",
            completed: true,
            createdAt: Date.now() - 7_200_000,
          },
        ];
        setTasks(defaults);
        localStorage.setItem("libro_study_tasks", JSON.stringify(defaults));
        onTaskChange?.(defaults);
      }
    } catch (error) {
      console.error("Failed to load study tasks from storage:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveTasks = (updated: StudyTask[]) => {
    setTasks(updated);
    onTaskChange?.(updated);
    try {
      localStorage.setItem("libro_study_tasks", JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save study tasks:", error);
    }
  };

  const handleAddTask = (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;

    const newTask: StudyTask = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      title: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    saveTasks([newTask, ...tasks]);
    setNewTaskTitle("");
  };

  const handleToggleTask = (id: string) => {
    saveTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const handleDeleteTask = (id: string) => {
    saveTasks(tasks.filter((task) => task.id !== id));
  };

  const handleClearCompleted = () => {
    saveTasks(tasks.filter((task) => !task.completed));
  };

  const completedCount = tasks.filter((task) => task.completed).length;
  const totalCount = tasks.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const filteredTasks = tasks.filter((task) => {
    if (filter === "pending") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  if (!isLoaded) {
    return (
      <p role="status" className="py-6 text-center text-sm text-zinc-500">
        Loading study checklist…
      </p>
    );
  }

  return (
    <section className="flex h-full flex-col gap-5">
      <header>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Session plan
            </p>
            <h3 className="mt-1 text-lg font-medium tracking-tight text-zinc-950">
              Study objectives
            </h3>
          </div>
          <span className="font-mono text-xs tabular-nums text-zinc-500">
            {completedCount} / {totalCount}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Study objectives completed"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1 bg-zinc-100"
        >
          <div
            className="h-full bg-zinc-800 transition-[width] duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      <form onSubmit={handleAddTask} className="flex gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(event) => setNewTaskTitle(event.target.value)}
          placeholder="Add an objective"
          aria-label="Target study objective"
          className="min-w-0 flex-1 border-b border-zinc-300 bg-transparent px-1 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900"
        />
        <button
          type="submit"
          disabled={!newTaskTitle.trim()}
          className="border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <div className="flex gap-4 text-xs text-zinc-500">
          {(["all", "pending", "completed"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              aria-pressed={filter === tab}
              className={`capitalize transition-colors ${
                filter === tab
                  ? "font-medium text-zinc-950"
                  : "hover:text-zinc-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {completedCount > 0 && (
          <button
            type="button"
            onClick={handleClearCompleted}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-950"
          >
            Clear completed ({completedCount})
          </button>
        )}
      </div>

      <div className="min-h-44 max-h-80 flex-1 divide-y divide-zinc-100 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="py-8 text-sm text-zinc-500">
            <p className="font-medium text-zinc-700">
              {filter === "completed"
                ? "No completed tasks yet."
                : filter === "pending"
                  ? "All caught up."
                  : "No tasks yet."}
            </p>
            {filter === "all" && (
              <p className="mt-1 text-xs">
                Add an objective above to plan your session.
              </p>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-3 py-3"
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggleTask(task.id)}
                aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
                className="h-4 w-4 shrink-0 cursor-pointer appearance-none border border-zinc-300 checked:border-zinc-800 checked:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-700"
              />
              <button
                type="button"
                onClick={() => handleToggleTask(task.id)}
                className={`min-w-0 flex-1 break-words text-left text-sm transition-colors ${
                  task.completed
                    ? "text-zinc-400 line-through"
                    : "text-zinc-800"
                }`}
              >
                {task.title}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTask(task.id)}
                title="Remove task"
                aria-label="Remove task"
                className="px-1 text-lg leading-none text-zinc-400 transition-colors hover:text-zinc-900"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
