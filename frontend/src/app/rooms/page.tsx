"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

// Generate 30-min interval times from 08:00 AM to 10:00 PM
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
  const router = useRouter();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [capacityFilter, setCapacityFilter] = useState<"all" | "small" | "medium" | "large">("all");
  const [requireWhiteboard, setRequireWhiteboard] = useState(false);
  const [requireDisplay, setRequireDisplay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Reservation Modal state
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [reservationDate, setReservationDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [resMessage, setResMessage] = useState<string | null>(null);
  const [resError, setResError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmationId, setBookingConfirmationId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRooms() {
      setLoading(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/api/rooms");
        if (!res.ok) throw new Error(`Server status ${res.status}`);
        const data = await res.json();
        setRooms(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error("Failed to fetch rooms:", err);
        setError("Could not load study rooms from library system.");
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
    setBookingConfirmationId(null);

    const today = new Date().toISOString().split("T")[0];
    setReservationDate(today);
    setStartTime("10:00");
    setEndTime("11:00");
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    if (!reservationDate || !startTime || !endTime) {
      setResError("Please select a valid date, start time, and end time.");
      return;
    }

    if (startTime >= endTime) {
      setResError("End time must be later than the start time.");
      return;
    }

    setResMessage(null);
    setResError(null);
    setSubmitting(true);

    const activeUserId =
      typeof window !== "undefined"
        ? localStorage.getItem("libro_user_id") || "00000000-0000-0000-0000-000000000000"
        : "00000000-0000-0000-0000-000000000000";

    try {
      const startIso = new Date(`${reservationDate}T${startTime}:00`).toISOString();
      const endIso = new Date(`${reservationDate}T${endTime}:00`).toISOString();

      const res = await fetch("http://127.0.0.1:8000/api/reservations/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: activeUserId,
          room_id: selectedRoom.id,
          start_time: startIso,
          end_time: endIso,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Room is already reserved for this slot.");
      }

      const refId = data?.data?.[0]?.id || `RSV-${Date.now().toString().slice(-6)}`;
      setBookingConfirmationId(refId);
      setResMessage("Study room reserved successfully! Appended to your activity feed.");
    } catch (err: any) {
      console.error("Reservation Error:", err);
      setResError(err.message || "Failed to complete room reservation.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!room.room_number.toLowerCase().includes(q)) return false;
      }

      // 2. Capacity
      if (capacityFilter === "small" && (room.capacity < 1 || room.capacity > 2)) return false;
      if (capacityFilter === "medium" && (room.capacity < 3 || room.capacity > 4)) return false;
      if (capacityFilter === "large" && room.capacity < 5) return false;

      // 3. Amenities
      if (requireWhiteboard && !room.has_whiteboard) return false;
      if (requireDisplay && !room.has_display) return false;

      return true;
    });
  }, [rooms, searchQuery, capacityFilter, requireWhiteboard, requireDisplay]);

  return (
    <main className="min-h-screen bg-[#faf9f6] px-5 py-10 text-zinc-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-5 border-b border-zinc-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">Spaces</p>
            <h1 className="text-4xl font-medium tracking-tight text-zinc-950 sm:text-5xl">
              Study rooms
            </h1>
            <p className="mt-3 text-sm text-zinc-500">
              Reserve quiet individual study spaces and collaborative group rooms at Addlestone Library.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="self-start border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-500 hover:text-zinc-950"
          >
            View reservations <span aria-hidden="true">→</span>
          </Link>
        </div>

        {error && (
          <div className="mb-6 border border-red-200 bg-white p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Filter and Criteria Card */}
        <div className="mb-8 border-y border-zinc-200 bg-white p-5">
          <div className="grid gap-4 md:grid-cols-4 md:items-end">
            {/* Search room number */}
            <div>
              <label               className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Room Number
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. 201, 305..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            {/* Capacity Filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Capacity
              </label>
              <select
                value={capacityFilter}
                onChange={(e) => setCapacityFilter(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="all">Any Capacity</option>
                <option value="small">Individual (1 - 2 Seats)</option>
                <option value="medium">Medium Group (3 - 4 Seats)</option>
                <option value="large">Large Group (5+ Seats)</option>
              </select>
            </div>

            {/* Amenities Checkboxes */}
            <div className="flex flex-col gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Amenities
              </label>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-700 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireWhiteboard}
                    onChange={(e) => setRequireWhiteboard(e.target.checked)}
                    className="h-4 w-4 rounded accent-teal-600 cursor-pointer"
                  />
                  <span>Whiteboard</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireDisplay}
                    onChange={(e) => setRequireDisplay(e.target.checked)}
                    className="h-4 w-4 rounded accent-teal-600 cursor-pointer"
                  />
                  <span>Display Screen</span>
                </label>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex justify-end">
              {(searchQuery || capacityFilter !== "all" || requireWhiteboard || requireDisplay) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCapacityFilter("all");
                    setRequireWhiteboard(false);
                    setRequireDisplay(false);
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-16 animate-pulse border-b border-zinc-200 bg-white" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredRooms.length === 0 && (
          <div className="border-y border-zinc-200 bg-white p-12 text-center">
            <h3 className="text-base font-medium text-zinc-900">No study rooms match your filters</h3>
            <p className="mt-2 text-xs text-zinc-500">
              Try adjusting your capacity requirements or clearing selected amenities.
            </p>
          </div>
        )}

        {/* Room Grid */}
        {!loading && filteredRooms.length > 0 && (
          <div className="divide-y divide-zinc-200 border-y border-zinc-200 bg-white">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="grid gap-5 px-5 py-5 transition-colors hover:bg-zinc-50/70 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                        {room.libraries?.name || "Addlestone Library"}
                      </span>
                      <h3 className="mt-1 text-lg font-medium tracking-tight text-zinc-950">
                        {room.room_number.toLowerCase().startsWith("room")
                          ? room.room_number
                          : `Room ${room.room_number}`}
                      </h3>
                    </div>

                    <span className="font-mono text-xs tabular-nums text-zinc-600">
                      {room.capacity} seats
                    </span>
                  </div>

                  {/* Amenities Badges */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                    {room.has_whiteboard && (
                      <span className="text-xs text-zinc-600">
                        Whiteboard
                      </span>
                    )}
                    {room.has_display && (
                      <span className="text-xs text-zinc-600">
                        Display
                      </span>
                    )}
                    <span className="text-xs text-zinc-600">Accessible</span>
                  </div>

                  <p className="mt-2 text-xs text-zinc-500">
                    {room.libraries?.location || "2nd & 3rd Floor Quiet Zones"}
                  </p>
                </div>

                <div className="sm:w-44">
                  <button
                    type="button"
                    onClick={() => openReservationModal(room)}
                    className="w-full border border-zinc-900 bg-zinc-900 py-2.5 text-center text-xs font-medium text-white transition hover:bg-zinc-700"
                  >
                    Reserve room <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reservation Modal */}
        {selectedRoom && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !submitting) {
                setSelectedRoom(null);
              }
            }}
          >
            <div className="w-full max-w-lg border border-zinc-200 bg-[#faf9f6] p-6">
              {/* If booked successfully, show confirmation screen */}
              {bookingConfirmationId ? (
                <div className="text-center py-4">
                  <h3 className="text-xl font-medium tracking-tight text-zinc-950">
                    Reservation Confirmed!
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600">
                    Room {selectedRoom.room_number} is reserved for you.
                  </p>

                  <div className="mt-5 space-y-2 border-y border-zinc-200 bg-white p-4 text-left text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Confirmation ref.</span>
                      <span className="font-mono text-zinc-800">{bookingConfirmationId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Date</span>
                      <span className="font-mono text-zinc-800">{reservationDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Time</span>
                      <span className="font-mono text-zinc-800">
                        {TIME_OPTIONS.find((t) => t.value === startTime)?.label} –{" "}
                        {TIME_OPTIONS.find((t) => t.value === endTime)?.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRoom(null)}
                      className="flex-1 border border-zinc-300 py-2.5 text-xs font-medium text-zinc-700 hover:border-zinc-500"
                    >
                      Book Another Room
                    </button>
                    <Link
                      href="/dashboard"
                      className="flex-1 border border-zinc-900 bg-zinc-900 py-2.5 text-center text-xs font-medium text-white hover:bg-zinc-700"
                    >
                      View in activity <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReserve}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Reservation</span>
                      <h3 className="mt-1 text-xl font-medium tracking-tight text-zinc-950">
                        Reserve {selectedRoom.room_number.toLowerCase().startsWith("room")
                          ? selectedRoom.room_number
                          : `Room ${selectedRoom.room_number}`}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Capacity: {selectedRoom.capacity} people • {selectedRoom.libraries?.name || "Addlestone Library"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRoom(null)}
                      className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>

                  {resError && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                      {resError}
                    </div>
                  )}

                  <div className="mt-5 space-y-4">
                    {/* Date picker */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Reservation Date
                      </label>
                      <input
                        type="date"
                        value={reservationDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setReservationDate(e.target.value)}
                        required
                        className="w-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
                      />
                    </div>

                    {/* Start Time & End Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Start Time
                        </label>
                        <select
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={`start-${t.value}`} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          End Time
                        </label>
                        <select
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={`end-${t.value}`} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="border-l-2 border-zinc-300 bg-white p-3 text-[11px] leading-relaxed text-zinc-500">
                      Policy notice: Reservations can be cancelled online up to 15 minutes before the start time. Check in with library staff at the 1st floor desk if you need assistance.
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRoom(null)}
                      disabled={submitting}
                      className="border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="border border-zinc-900 bg-zinc-900 px-5 py-2 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {submitting ? "Verifying Availability..." : "Confirm Reservation"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
