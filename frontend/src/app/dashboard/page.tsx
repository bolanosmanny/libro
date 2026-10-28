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
  const [userId, setUserId] = useState<string>("00000000-0000-0000-0000-000000000000");
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [returningId, setReturningId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Cancellation Confirmation Modal (SRS Path 4)
  const [reservationToCancel, setReservationToCancel] = useState<RoomReservation | null>(null);
  const [cancellationCutoffError, setCancellationCutoffError] = useState<string | null>(null);

  // Productivity & Study Tools Drawer State
  const [isStudyDrawerOpen, setIsStudyDrawerOpen] = useState(false);
  const [taskSummary, setTaskSummary] = useState({ total: 0, pending: 0 });

  // Retrieve user ID from localStorage on client render
  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeUser = localStorage.getItem("libro_user_id");
      if (activeUser) {
        setUserId(activeUser);
      }
    }
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
    fetchActivity();
  }, [fetchActivity]);

  const handleReturnBook = async (loanId: string) => {
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
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Your Activity & Dashboard
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Review your active book loans, upcoming study room bookings, and productivity sessions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStudyDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-500"
            >
              <span>⏱️ Study Tools</span>
            </button>
            <button
              type="button"
              onClick={fetchActivity}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              title="Refresh Activity"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Global Action Banner */}
        {actionMessage && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <span>✅</span>
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
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            ⚠️ {error}
          </div>
        )}

        {/* Metrics Summary Strip */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Book Loans
              </span>
              <span className="text-xl">📖</span>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {loading ? "..." : activeBookLoans.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {activeBookLoans.length > 0 ? "Due back within 14 days" : "No books checked out"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Room Bookings
              </span>
              <span className="text-xl">🏛️</span>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {loading ? "..." : activeRoomReservations.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {activeRoomReservations.length > 0 ? "Upcoming confirmed reservations" : "No active room bookings"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Study Objectives
              </span>
              <span className="text-xl">🎯</span>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {taskSummary.pending}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {taskSummary.pending} pending of {taskSummary.total} tasks
            </p>
          </div>
        </div>

        {/* Academic Productivity Session Widget (Trigger) */}
        <section className="mb-8 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-teal-50/70 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏱️</span>
                <h2 className="text-lg font-bold text-slate-900">
                  Academic Productivity Session
                </h2>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                  Study Aid
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Utilize built-in study aids during your library visit—including a customizable Pomodoro focus timer, gentle audio chimes, and a study task checklist.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStudyDrawerOpen(true)}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500"
              >
                Open Study Drawer →
              </button>
              <Link
                href="/study"
                className="rounded-xl border border-blue-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                Full Page Mode
              </Link>
            </div>
          </div>
        </section>

        {/* Two-Column Activity Records: Books and Study Rooms */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Active Book Loans Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Checked Out Books</h2>
                <p className="text-xs text-slate-500">Currently borrowed from Addlestone Library</p>
              </div>
              <Link
                href="/books"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                + Browse Books
              </Link>
            </div>

            {loading && (
              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              </div>
            )}

            {!loading && activeBookLoans.length === 0 && (
              <div className="py-10 text-center">
                <span className="text-3xl">📖</span>
                <p className="mt-2 text-sm font-medium text-slate-700">No active book loans</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Search the catalog to borrow resources for your research.
                </p>
                <Link
                  href="/books"
                  className="mt-4 inline-flex rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Browse Catalog
                </Link>
              </div>
            )}

            {!loading && activeBookLoans.length > 0 && (
              <div className="space-y-3">
                {activeBookLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 transition sm:flex-row sm:items-center hover:border-slate-300"
                  >
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug">
                        {loan.books?.title ?? "Book Details Unavailable"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Author: {loan.books?.author}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                        <span>Due:</span>
                        <span className="font-semibold text-slate-800">
                          {new Date(loan.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReturnBook(loan.id)}
                      disabled={returningId === loan.id}
                      className="self-start sm:self-auto rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      {returningId === loan.id ? "Returning..." : "Return Book"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Room Reservations Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Study Room Reservations</h2>
                <p className="text-xs text-slate-500">Upcoming scheduled bookings</p>
              </div>
              <Link
                href="/rooms"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                + Book a Room
              </Link>
            </div>

            {loading && (
              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              </div>
            )}

            {!loading && activeRoomReservations.length === 0 && (
              <div className="py-10 text-center">
                <span className="text-3xl">🏛️</span>
                <p className="mt-2 text-sm font-medium text-slate-700">No upcoming reservations</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Reserve a quiet room or group collaborative space.
                </p>
                <Link
                  href="/rooms"
                  className="mt-4 inline-flex rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-500"
                >
                  Reserve a Room
                </Link>
              </div>
            )}

            {!loading && activeRoomReservations.length > 0 && (
              <div className="space-y-3">
                {activeRoomReservations.map((res) => (
                  <div
                    key={res.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 transition sm:flex-row sm:items-center hover:border-slate-300"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">
                          {res.study_rooms?.room_number?.toLowerCase().startsWith("room")
                            ? res.study_rooms.room_number
                            : `Room ${res.study_rooms?.room_number ?? "N/A"}`}
                        </h3>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          Confirmed
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Capacity: {res.study_rooms?.capacity} people
                      </p>
                      <div className="mt-1 text-xs text-slate-700">
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
                      className="self-start sm:self-auto rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
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
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <span className="text-3xl">⚠️</span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">
                Cancel Study Room Reservation?
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Are you sure you want to cancel your booking for{" "}
                <strong>
                  {reservationToCancel.study_rooms?.room_number?.toLowerCase().startsWith("room")
                    ? reservationToCancel.study_rooms.room_number
                    : `Room ${reservationToCancel.study_rooms?.room_number}`}
                </strong>? The room will be released back into the public availability pool immediately.
              </p>

              {cancellationCutoffError && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  {cancellationCutoffError}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                {/* Alternative Path 5a: Keep Reservation */}
                <button
                  type="button"
                  onClick={() => setReservationToCancel(null)}
                  disabled={cancellingId !== null}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Keep Reservation
                </button>

                {!cancellationCutoffError && (
                  <button
                    type="button"
                    onClick={confirmCancelReservation}
                    disabled={cancellingId !== null}
                    className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
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