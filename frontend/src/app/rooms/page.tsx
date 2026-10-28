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
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏛️</span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Study Room Reservations
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Reserve quiet individual study spaces and collaborative group rooms at Addlestone Library.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span>📋 View Your Reservations</span>
            <span>→</span>
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Filter and Criteria Card */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4 md:items-end">
            {/* Search room number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
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
              <div key={n} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredRooms.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <span className="text-4xl">🏛️</span>
            <h3 className="mt-3 text-base font-semibold text-slate-900">No study rooms match your filters</h3>
            <p className="mt-1 text-xs text-slate-500">
              Try adjusting your capacity requirements or clearing selected amenities.
            </p>
          </div>
        )}

        {/* Room Grid */}
        {!loading && filteredRooms.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">
                        {room.libraries?.name || "Addlestone Library"}
                      </span>
                      <h3 className="mt-1 text-xl font-bold text-slate-900">
                        {room.room_number.toLowerCase().startsWith("room")
                          ? room.room_number
                          : `Room ${room.room_number}`}
                      </h3>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      👥 Seats {room.capacity}
                    </span>
                  </div>

                  {/* Amenities Badges */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {room.has_whiteboard && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 border border-blue-200">
                        <span>🖊️</span> Whiteboard
                      </span>
                    )}
                    {room.has_display && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-[11px] font-medium text-purple-700 border border-purple-200">
                        <span>🖥️</span> Display Screen
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                      <span>♿</span> Accessible
                    </span>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    Location: {room.libraries?.location || "2nd & 3rd Floor Quiet Zones"}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openReservationModal(room)}
                    className="w-full rounded-xl bg-teal-600 py-2.5 text-center text-xs font-bold text-white shadow-sm transition hover:bg-teal-500"
                  >
                    Select & Reserve Room →
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !submitting) {
                setSelectedRoom(null);
              }
            }}
          >
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              {/* If booked successfully, show confirmation screen */}
              {bookingConfirmationId ? (
                <div className="text-center py-4">
                  <span className="text-4xl">🎉</span>
                  <h3 className="mt-3 text-xl font-bold text-slate-900">
                    Reservation Confirmed!
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Room {selectedRoom.room_number} is reserved for you.
                  </p>

                  <div className="mt-5 rounded-xl bg-slate-50 p-4 text-left text-xs space-y-2 border border-slate-200">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">Confirmation Ref:</span>
                      <span className="font-mono font-bold text-slate-800">{bookingConfirmationId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">Date:</span>
                      <span className="font-bold text-slate-800">{reservationDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">Time Window:</span>
                      <span className="font-bold text-slate-800">
                        {TIME_OPTIONS.find((t) => t.value === startTime)?.label} –{" "}
                        {TIME_OPTIONS.find((t) => t.value === endTime)?.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRoom(null)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Book Another Room
                    </button>
                    <Link
                      href="/dashboard"
                      className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white text-center hover:bg-teal-500"
                    >
                      View in Your Activity →
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReserve}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-teal-700 uppercase">Booking Workflow</span>
                      <h3 className="mt-1 text-xl font-bold text-slate-900">
                        Reserve {selectedRoom.room_number.toLowerCase().startsWith("room")
                          ? selectedRoom.room_number
                          : `Room ${selectedRoom.room_number}`}
                      </h3>
                      <p className="text-xs text-slate-500">
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
                      ⚠️ {resError}
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
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
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
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
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
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={`end-${t.value}`} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 leading-relaxed">
                      💡 Policy notice: Reservations can be cancelled online up to 15 minutes before the start time. Check in with library staff at the 1st floor desk if you need assistance.
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRoom(null)}
                      disabled={submitting}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50"
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
