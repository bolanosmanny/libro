"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

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

  // Retrieve user ID from localStorage on client render
  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeUser = localStorage.getItem("libro_user_id");
      if (activeUser) {
        setUserId(activeUser);
      }
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/users/${userId}/activity`);
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const data = await res.json();
      setActivity(data);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError("Could not load user activity.");
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

      setActionMessage("Book returned successfully!");
      await fetchActivity();
    } catch (err: any) {
      console.error("Return error:", err);
      alert(err.message || "Failed to return book.");
    } finally {
      setReturningId(null);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm("Are you sure you want to cancel this study room reservation?")) return;

    setCancellingId(reservationId);
    setActionMessage(null);

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/reservations/rooms/${reservationId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to cancel reservation");
      }

      setActionMessage("Reservation cancelled successfully!");
      await fetchActivity();
    } catch (err: any) {
      console.error("Cancel error:", err);
      alert(err.message || "Failed to cancel reservation.");
    } finally {
      setCancellingId(null);
    }
  };

  // Filter out returned book loans and cancelled room reservations
  const activeBookLoans = activity?.book_loans.filter((loan) => loan.status !== "returned") || [];
  const activeRoomReservations = activity?.room_reservations.filter((res) => res.status !== "cancelled") || [];

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Patron Activity Dashboard</h1>
        <Link href="/" style={{ textDecoration: "none", color: "#0070f3", fontWeight: "bold" }}>← Back Home</Link>
      </header>

      {actionMessage && (
        <div style={{ background: "#dcfce7", color: "#15803d", padding: "1rem", borderRadius: "6px", marginBottom: "1.5rem" }}>
          {actionMessage}
        </div>
      )}

      {loading && <p>Loading your activity...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && activity && (
        <div style={{ display: "grid", gap: "2rem" }}>
          {/* Active Book Loans Section */}
          <section>
            <h2>Checked Out Books</h2>
            {activeBookLoans.length === 0 ? (
              <p style={{ color: "#666" }}>No active book loans. <Link href="/books">Browse books</Link> to check one out.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {activeBookLoans.map((loan) => (
                  <li
                    key={loan.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "1.25rem",
                      marginBottom: "1rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 0.5rem 0" }}>{loan.books?.title ?? "Book Details Unavailable"}</h3>
                      <p style={{ margin: "0.25rem 0", color: "#555" }}>Author: {loan.books?.author}</p>
                      <p style={{ margin: "0.25rem 0" }}>
                        Due Date: <strong>{new Date(loan.due_date).toLocaleDateString()}</strong>
                      </p>
                      <span
                        style={{
                          background: "#e0f2fe",
                          color: "#0369a1",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                          fontWeight: "bold",
                          display: "inline-block",
                          marginTop: "0.5rem",
                        }}
                      >
                        {loan.status}
                      </span>
                    </div>

                    <div style={{ minWidth: "120px", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => handleReturnBook(loan.id)}
                        disabled={returningId === loan.id}
                        style={{
                          padding: "0.5rem 1.25rem",
                          background: "#0070f3",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: returningId === loan.id ? "not-allowed" : "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        {returningId === loan.id ? "Returning..." : "Return Book"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Room Reservations Section */}
          <section>
            <h2>Study Room Reservations</h2>
            {activeRoomReservations.length === 0 ? (
              <p style={{ color: "#666" }}>No upcoming reservations. <Link href="/rooms">Reserve a room</Link> now.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {activeRoomReservations.map((res) => (
                  <li
                    key={res.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "1.25rem",
                      marginBottom: "1rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 0.5rem 0" }}>Room {res.study_rooms?.room_number ?? "Details Unavailable"}</h3>
                      <p style={{ margin: "0.25rem 0", color: "#555" }}>Capacity: {res.study_rooms?.capacity} people</p>
                      <p style={{ margin: "0.25rem 0", color: "#555" }}>
                        Start: {new Date(res.start_time).toLocaleString()}
                      </p>
                      <p style={{ margin: "0.25rem 0", color: "#555" }}>
                        End: {new Date(res.end_time).toLocaleString()}
                      </p>
                      <span
                        style={{
                          background: "#dcfce7",
                          color: "#15803d",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                          fontWeight: "bold",
                          display: "inline-block",
                          marginTop: "0.5rem",
                        }}
                      >
                        {res.status}
                      </span>
                    </div>

                    <div style={{ minWidth: "120px", display: "flex", justifyContent: "flex-end" }}>
                      {res.status === "confirmed" && (
                        <button
                          onClick={() => handleCancelReservation(res.id)}
                          disabled={cancellingId === res.id}
                          style={{
                            padding: "0.5rem 1.25rem",
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: cancellingId === res.id ? "not-allowed" : "pointer",
                            fontWeight: "bold",
                          }}
                        >
                          {cancellingId === res.id ? "Cancelling..." : "Cancel"}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}