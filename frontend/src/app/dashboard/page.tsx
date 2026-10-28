"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ProductivityDrawer from "@/components/ProductivityDrawer";

interface BookLoan {
  id: string;
  due_date: string;
  status: string;
  books: {
    id: string;
    title: string;
    author: string;
    isbn: string;
  };
}

interface RoomReservation {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  study_rooms: {
    room_number: string;
    capacity: number;
  };
}

interface UserActivity {
  book_loans: BookLoan[];
  room_reservations: RoomReservation[];
}

export default function DashboardPage() {
  const [userId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("libro_user_id"),
  );
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState("");

  const [returningId, setReturningId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Cancellation Confirmation Modal (SRS Path 4)
  const [reservationToCancel, setReservationToCancel] = useState<RoomReservation | null>(null);
  const [cancellationCutoffError, setCancellationCutoffError] = useState<string | null>(null);

  // Productivity & Study Tools Drawer State
  const [isStudyDrawerOpen, setIsStudyDrawerOpen] = useState(false);
  const [taskSummary, setTaskSummary] = useState({ total: 0, pending: 0 });

  useEffect(() => {
    const updateTime = () =>
      setLiveTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    const interval = window.setInterval(updateTime, 60_000);
    updateTime();
    return () => window.clearInterval(interval);
  }, []);

  // Update study task summary
  useEffect(() => {
    const updateTaskSummary = () => {
      try {
        const stored = localStorage.getItem("libro_study_tasks");
        if (stored) {
          const tasks = JSON.parse(stored);
          if (Array.isArray(tasks)) {
            const pending = tasks.filter((t: any) => !t.completed).length;
            setTaskSummary({ total: tasks.length, pending });
          }
        }
      } catch (e) {
        // ignore
      }
    };
    updateTaskSummary();
    window.addEventListener("focus", updateTaskSummary);
    return () => window.removeEventListener("focus", updateTaskSummary);
  }, [isStudyDrawerOpen]);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!userId) {
      setError("Your session could not be verified. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/users/${userId}/activity`);
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const data = await res.json();
      setActivity(data);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError("Could not load your library activity records.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchActivity();
  }, [fetchActivity]);

  const handleReturnBook = async (loanId: string) => {
    if (!userId) return;

    setReturningId(loanId);
    setActionMessage(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/books/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          loan_id: loanId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to return book");
      }

      setActionMessage("Book returned successfully! Item marked available.");
      await fetchActivity();
    } catch (err: any) {
      console.error("Return error:", err);
      alert(err.message || "Failed to return book.");
    } finally {
      setReturningId(null);
    }
  };

  // Check 15-minute Late Cancellation Cutoff (SRS Path 6a)
  const initiateCancelReservation = (reservation: RoomReservation) => {
    setCancellationCutoffError(null);
    const startTimestamp = new Date(reservation.start_time).getTime();
    const now = Date.now();
    const minutesRemaining = (startTimestamp - now) / (1000 * 60);

    if (minutesRemaining < 15 && minutesRemaining > 0) {
      setCancellationCutoffError(
        "Online cancellation is unavailable within 15 minutes of reservation time. Please contact the service desk."
      );
      setReservationToCancel(reservation);
      return;
    }

    setReservationToCancel(reservation);
  };

  const confirmCancelReservation = async () => {
    if (!reservationToCancel) return;
    setCancellingId(reservationToCancel.id);
    setActionMessage(null);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/reservations/rooms/${reservationToCancel.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to cancel reservation");
      }

      setActionMessage("Room reservation cancelled and released back to available rooms.");
      setReservationToCancel(null);
      await fetchActivity();
    } catch (err: any) {
      console.error("Cancel error:", err);
      alert(err.message || "Failed to cancel reservation.");
    } finally {
      setCancellingId(null);
    }
  };

  const activeBookLoans = activity?.book_loans.filter((loan) => loan.status !== "returned") || [];
  const activeRoomReservations = activity?.room_reservations.filter((res) => res.status !== "cancelled") || [];

  return (
    <main className="min-h-screen bg-[#faf9f6] px-5 py-10 text-zinc-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-5 border-b border-zinc-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
              Personal workspace
            </p>
            <h1 className="text-4xl font-medium tracking-tight text-zinc-950 sm:text-5xl">
              Overview
            </h1>
            <p className="mt-3 text-sm text-zinc-500">
              Review your active book loans, upcoming study room bookings, and productivity sessions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-xs tabular-nums text-zinc-500">
              {liveTime || "—"} <span className="text-zinc-400">LOCAL</span>
            </span>
            <button
              type="button"
              onClick={() => setIsStudyDrawerOpen(true)}
              className="border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-500 hover:text-zinc-950"
            >
              Study tools
            </button>
            <button
              type="button"
              onClick={fetchActivity}
              className="px-2 py-2 text-xs font-medium text-zinc-600 transition hover:text-zinc-950"
              title="Refresh Activity"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Global Action Banner */}
        {actionMessage && (
          <div className="mb-6 flex items-center justify-between border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-800">
            <div className="flex items-center gap-2">
              <span>{actionMessage}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 border border-red-200 bg-white p-4 text-sm text-red-800">
              {error}
          </div>
        )}

        {/* Metrics Summary Strip */}
        <div className="mb-10 grid grid-cols-1 gap-0 border-y border-zinc-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-zinc-200">
          <div className="p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Active Book Loans
              </span>
            </div>
            <p className="mt-4 font-mono text-4xl font-light tabular-nums text-zinc-950">
              {loading ? "..." : activeBookLoans.length}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {activeBookLoans.length > 0 ? "Due back within 14 days" : "No books checked out"}
            </p>
          </div>

          <div className="border-t border-zinc-200 p-6 sm:border-t-0 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Room Bookings
              </span>
            </div>
            <p className="mt-4 font-mono text-4xl font-light tabular-nums text-zinc-950">
              {loading ? "..." : activeRoomReservations.length}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {activeRoomReservations.length > 0 ? "Upcoming confirmed reservations" : "No active room bookings"}
            </p>
          </div>

          <div className="border-t border-zinc-200 p-6 sm:border-t-0 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Study Objectives
              </span>
            </div>
            <p className="mt-4 font-mono text-4xl font-light tabular-nums text-zinc-950">
              {taskSummary.pending}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {taskSummary.pending} pending of {taskSummary.total} tasks
            </p>
          </div>
        </div>

        {/* Academic Productivity Session Widget (Trigger) */}
        <section className="mb-10 border-y border-zinc-200 bg-white px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-medium tracking-tight text-zinc-950">
                  Academic Productivity Session
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Study Aid
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Utilize built-in study aids during your library visit—including a customizable Pomodoro focus timer, gentle audio chimes, and a study task checklist.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStudyDrawerOpen(true)}
                className="border border-zinc-900 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-zinc-700"
              >
                Open Study Drawer →
              </button>
              <Link
                href="/study"
                className="border border-zinc-300 px-3.5 py-2.5 text-xs font-medium text-zinc-700 hover:border-zinc-500"
              >
                Full Page Mode
              </Link>
            </div>
          </div>
        </section>

        {/* Two-Column Activity Records: Books and Study Rooms */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Active Book Loans Section */}
          <section className="border-y border-zinc-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-4">
              <div>
                <h2 className="text-lg font-medium tracking-tight text-zinc-950">Checked out books</h2>
                <p className="text-xs text-zinc-500">Currently borrowed from Addlestone Library</p>
              </div>
              <Link
                href="/books"
                className="text-xs font-medium text-zinc-600 hover:text-zinc-950"
              >
                + Browse Books
              </Link>
            </div>

            {loading && (
              <div className="space-y-3">
                <div className="h-20 animate-pulse bg-zinc-100" />
                <div className="h-20 animate-pulse bg-zinc-100" />
              </div>
            )}

            {!loading && activeBookLoans.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-zinc-700">No active book loans</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Search the catalog to borrow resources for your research.
                </p>
                <Link
                  href="/books"
                  className="mt-4 inline-flex border border-zinc-300 px-3.5 py-2 text-xs font-medium text-zinc-800 hover:border-zinc-500"
                >
                  Browse Catalog
                </Link>
              </div>
            )}

            {!loading && activeBookLoans.length > 0 && (
              <div className="divide-y divide-zinc-200">
                {activeBookLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex flex-col justify-between gap-3 py-4 transition sm:flex-row sm:items-center"
                  >
                    <div>
                      <h3 className="text-sm font-medium leading-snug text-zinc-900">
                        {loan.books?.title ?? "Book Details Unavailable"}
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-500">{loan.books?.author}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                        <span>Due:</span>
                        <span className="font-mono tabular-nums text-zinc-800">
                          {new Date(loan.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReturnBook(loan.id)}
                      disabled={returningId === loan.id}
                      className="self-start border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-500 disabled:opacity-50 sm:self-auto"
                    >
                      {returningId === loan.id ? "Returning..." : "Return Book"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Room Reservations Section */}
          <section className="border-y border-zinc-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-4">
              <div>
                <h2 className="text-lg font-medium tracking-tight text-zinc-950">Study room reservations</h2>
                <p className="text-xs text-zinc-500">Upcoming scheduled bookings</p>
              </div>
              <Link
                href="/rooms"
                className="text-xs font-medium text-zinc-600 hover:text-zinc-950"
              >
                + Book a Room
              </Link>
            </div>

            {loading && (
              <div className="space-y-3">
                <div className="h-20 animate-pulse bg-zinc-100" />
                <div className="h-20 animate-pulse bg-zinc-100" />
              </div>
            )}

            {!loading && activeRoomReservations.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-zinc-700">No upcoming reservations</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Reserve a quiet room or group collaborative space.
                </p>
                <Link
                  href="/rooms"
                  className="mt-4 inline-flex border border-zinc-900 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-zinc-700"
                >
                  Reserve a Room
                </Link>
              </div>
            )}

            {!loading && activeRoomReservations.length > 0 && (
              <div className="divide-y divide-zinc-200">
                {activeRoomReservations.map((res) => (
                  <div
                    key={res.id}
                    className="flex flex-col justify-between gap-3 py-4 transition sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-zinc-900">
                          {res.study_rooms?.room_number?.toLowerCase().startsWith("room")
                            ? res.study_rooms.room_number
                            : `Room ${res.study_rooms?.room_number ?? "N/A"}`}
                        </h3>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-800">
                          Confirmed
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Capacity: {res.study_rooms?.capacity} people
                      </p>
                      <div className="mt-1 font-mono text-xs tabular-nums text-zinc-700">
                        <span>{new Date(res.start_time).toLocaleDateString()}</span> •{" "}
                        <span>
                          {new Date(res.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} –{" "}
                          {new Date(res.end_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => initiateCancelReservation(res)}
                      className="self-start border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-500 sm:self-auto"
                    >
                      Cancel Reservation
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Cancellation Confirmation Modal (SRS Path 4, 5a, 6a) */}
        {reservationToCancel && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !cancellingId) {
                setReservationToCancel(null);
              }
            }}
          >
            <div className="w-full max-w-md border border-zinc-200 bg-white p-6">
              <h3 className="text-lg font-medium text-zinc-950">
                Cancel Study Room Reservation?
              </h3>
              <p className="mt-2 text-xs leading-6 text-zinc-600">
                Are you sure you want to cancel your booking for{" "}
                <strong>
                  {reservationToCancel.study_rooms?.room_number?.toLowerCase().startsWith("room")
                    ? reservationToCancel.study_rooms.room_number
                    : `Room ${reservationToCancel.study_rooms?.room_number}`}
                </strong>? The room will be released back into the public availability pool immediately.
              </p>

              {cancellationCutoffError && (
                <div className="mt-4 border border-amber-200 bg-white p-3 text-xs text-amber-800">
                  {cancellationCutoffError}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                {/* Alternative Path 5a: Keep Reservation */}
                <button
                  type="button"
                  onClick={() => setReservationToCancel(null)}
                  disabled={cancellingId !== null}
                  className="border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-500"
                >
                  Keep Reservation
                </button>

                {!cancellationCutoffError && (
                  <button
                    type="button"
                    onClick={confirmCancelReservation}
                    disabled={cancellingId !== null}
                    className="border border-zinc-900 bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {cancellingId ? "Cancelling..." : "Yes, Cancel Booking"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Slide-out Productivity Drawer */}
        <ProductivityDrawer
          isOpen={isStudyDrawerOpen}
          onClose={() => setIsStudyDrawerOpen(false)}
        />
      </div>
    </main>
  );
}