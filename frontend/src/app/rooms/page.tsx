"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StudyRoom {
  id: string;
  room_number: string;
  capacity: number;
  has_whiteboard: boolean;
  has_display: boolean;
  libraries?: {
    name: string;
    location: string;
  };
}

// Generate time options from 08:00 AM to 10:00 PM in 30-min increments
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 8; hour <= 22; hour++) {
    for (let min of [0, 30]) {
      if (hour === 22 && min === 30) break;
      const hStr = hour < 10 ? `0${hour}` : `${hour}`;
      const mStr = min === 0 ? "00" : `${min}`;
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      
      times.push({
        value: `${hStr}:${mStr}`,
        label: `${displayHour}:${mStr} ${period}`,
      });
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

export default function RoomsPage() {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);

  // Form states split into Date + Scrollable Time Dropdowns
  const [reservationDate, setReservationDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const [resMessage, setResMessage] = useState<string | null>(null);
  const [resError, setResError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/rooms");
        if (!res.ok) throw new Error(`Server status ${res.status}`);
        const data = await res.json();
        setRooms(data);
      } catch (err: any) {
        console.error("Failed to fetch rooms:", err);
        setError("Could not load study rooms.");
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, []);

  const openReservationModal = (room: StudyRoom) => {
    setSelectedRoom(room);
    setResError(null);
    setResMessage(null);
    
    // Set default reservation date to today (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0];
    setReservationDate(today);
    setStartTime("09:00");
    setEndTime("10:00");
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    if (!reservationDate || !startTime || !endTime) {
      setResError("Please select a date, start time, and end time.");
      return;
    }

    if (startTime >= endTime) {
      setResError("End time must be later than start time.");
      return;
    }

    setResMessage(null);
    setResError(null);
    setSubmitting(true);

    try {
      // Combine Date + Time strings into full ISO timestamps
      const startIso = new Date(`${reservationDate}T${startTime}:00`).toISOString();
      const endIso = new Date(`${reservationDate}T${endTime}:00`).toISOString();

      const res = await fetch("http://127.0.0.1:8000/api/reservations/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "00000000-0000-0000-0000-000000000000",
          room_id: selectedRoom.id,
          start_time: startIso,
          end_time: endIso,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to reserve room");
      }

      setResMessage("Room reserved successfully!");
      setTimeout(() => {
        setSelectedRoom(null);
        setResMessage(null);
      }, 1500);
    } catch (err: any) {
      console.error("Reservation Error:", err);
      setResError(err.message || "Could not connect to backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1>Study Rooms</h1>
        <Link href="/dashboard" style={{ color: "#0070f3", textDecoration: "none", fontWeight: "bold" }}>
          View Dashboard →
        </Link>
      </header>

      {loading && <p>Loading rooms...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <div style={{ display: "grid", gap: "1rem" }}>
          {rooms.map((room) => (
            <div
              key={room.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1.25rem",
                display: "flex",
                justify: "space-between",
                alignItems: "center",
                gap: "1rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 0.5rem 0" }}>{room.room_number}</h3>
                <p style={{ margin: "0.25rem 0", color: "#555" }}>
                  Library: {room.libraries?.name ?? "Main Campus Library"}
                </p>
                <p style={{ margin: "0.25rem 0", color: "#555" }}>Capacity: {room.capacity} people</p>
              </div>

              <div style={{ minWidth: "120px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => openReservationModal(room)}
                  style={{
                    padding: "0.5rem 1.25rem",
                    background: "#17c964",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Reserve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Reservation Modal */}
      {selectedRoom && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div style={{ background: "white", padding: "2rem", borderRadius: "10px", width: "420px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Reserve {selectedRoom.room_number}</h2>
            <p style={{ margin: "0 0 1.5rem 0", color: "#666", fontSize: "0.9rem" }}>
              {selectedRoom.libraries?.name ?? "Main Campus Library"} • Max {selectedRoom.capacity} People
            </p>

            {resMessage && <p style={{ color: "green", fontWeight: "bold" }}>{resMessage}</p>}
            {resError && <p style={{ color: "red", fontSize: "0.9rem" }}>{resError}</p>}

            <form onSubmit={handleReserve} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Date Input */}
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontWeight: "bold", fontSize: "0.9rem" }}>
                Reservation Date:
                <input
                  type="date"
                  required
                  value={reservationDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setReservationDate(e.target.value)}
                  style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.95rem" }}
                />
              </label>

              {/* Time Selection Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontWeight: "bold", fontSize: "0.9rem" }}>
                  Start Time:
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.95rem", background: "#white" }}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={`start-${t.value}`} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontWeight: "bold", fontSize: "0.9rem" }}>
                  End Time:
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.95rem", background: "#white" }}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={`end-${t.value}`} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "#0070f3",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Confirming..." : "Confirm Booking"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoom(null)}
                  style={{
                    padding: "0.75rem 1.25rem",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}