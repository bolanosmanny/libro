"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import ReserveRoomsMap from "@/components/reserve-rooms-map";
import { supabase } from "@/lib/supabase";

type StudyRoom = {
  id: string;
  room_number: string;
  capacity: number;
  has_whiteboard: boolean;
  has_display: boolean;
  libraries?: {
    name: string;
    location: string;
  };
};

const API_BASE = "http://127.0.0.1:8000";

const TIME_OPTIONS = Array.from({ length: 29 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const label = `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${
    hour >= 12 ? "PM" : "AM"
  }`;

  return { value, label };
});

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [reservationDate, setReservationDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [submitting, setSubmitting] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reservationMessage, setReservationMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRooms() {
      try {
        const response = await fetch(`${API_BASE}/api/rooms`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Server status ${response.status}`);
        }

        const data: StudyRoom[] = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid room response");
        }

        setRooms(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Could not load rooms:", error);
          setLoadError("Could not load study rooms.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadRooms();
    return () => controller.abort();
  }, []);

  const visibleRooms = rooms.filter((room) =>
    `${room.room_number} ${room.libraries?.name ?? ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  function selectRoom(room: StudyRoom) {
    setSelectedRoom(room);
    setReservationError(null);
    setReservationMessage(null);

    const defaultDate = new Date();
    if (defaultDate.getHours() >= 9) {
      defaultDate.setDate(defaultDate.getDate() + 1);
    }

    setReservationDate(localDateString(defaultDate));
    setStartTime("09:00");
    setEndTime("10:00");
  }

  async function handleReserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRoom || submitting) return;

    if (!reservationDate || startTime >= endTime) {
      setReservationError("Choose a date and an end time after the start time.");
      return;
    }

    const start = new Date(`${reservationDate}T${startTime}:00`);
    const end = new Date(`${reservationDate}T${endTime}:00`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start <= new Date()
    ) {
      setReservationError("Choose a valid future time.");
      return;
    }

    setSubmitting(true);
    setReservationError(null);
    setReservationMessage(null);

    try {
      if (!supabase) {
        throw new Error("Authentication is not configured.");
      }

      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        throw new Error("Log in before reserving a room.");
      }

      const response = await fetch(`${API_BASE}/api/reservations/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          room_id: selectedRoom.id,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        }),
      });

      const result: { detail?: string } = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Could not reserve the room."
        );
      }

      setReservationMessage(
        `${selectedRoom.room_number} reserved. You can view it on your dashboard.`
      );
    } catch (error) {
      setReservationError(
        error instanceof Error ? error.message : "Could not reserve the room."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#E7F1F6] px-5 py-8 text-[#10263F] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#526B7D] hover:text-[#10263F]"
        >
          ← Back to dashboard
        </Link>

        <header className="mb-7 mt-7 border-b border-[#C9DEE6] pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0D8F91]">
            Libro study spaces
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Reserve a study room
          </h1>
          <p className="mt-2 text-[#526B7D]">
            Choose a room on the map or from the room list, then select a time.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.5fr)]">
          <section className="rounded-2xl border border-[#C9DEE6] bg-[#F4FAFC] p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Study rooms</h2>
                <p className="mt-1 text-sm text-[#526B7D]">
                  Map rooms are at Addlestone. The list includes every library.
                </p>
              </div>
              {!loading && !loadError && (
                <span className="text-sm text-[#526B7D]">
                  {rooms.length} rooms
                </span>
              )}
            </div>

            {loading && (
              <p className="mt-6 text-[#526B7D]" role="status">
                Loading rooms...
              </p>
            )}

            {loadError && (
              <p className="mt-6 text-red-700" role="alert">
                {loadError}
              </p>
            )}

            {!loading && !loadError && (
              <>
                <ReserveRoomsMap
                  databaseRooms={rooms}
                  selectedRoomId={selectedRoom?.id ?? null}
                  onSelectRoom={selectRoom}
                />

                <div className="mt-8 border-t border-[#C9DEE6] pt-6">
                  <h3 className="text-lg font-semibold">All rooms</h3>

                  <label
                    htmlFor="room-search"
                    className="mt-4 block text-sm font-medium"
                  >
                    Search rooms or libraries
                  </label>
                  <input
                    id="room-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Room 201, Lab Room A..."
                    className="mt-2 w-full rounded-xl border border-[#C9DEE6] bg-white px-4 py-3 outline-none placeholder:text-[#71818A] focus:border-[#0D8F91] focus:ring-2 focus:ring-[#0D8F91]/20"
                  />

                  <div className="mt-5 grid max-h-[26rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                    {visibleRooms.map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => selectRoom(room)}
                        aria-pressed={selectedRoom?.id === room.id}
                        className={`rounded-xl border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D8F91] ${
                          selectedRoom?.id === room.id
                            ? "border-[#0D8F91] bg-[#D9F0F1]"
                            : "border-[#DDE8EB] bg-white hover:border-[#8ECFD0]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-semibold">{room.room_number}</h4>
                          <span className="text-xs font-semibold text-[#0D8F91]">
                            Select →
                          </span>
                        </div>

                        {room.libraries?.name && (
                          <p className="mt-1 text-sm text-[#526B7D]">
                            {room.libraries.name}
                          </p>
                        )}

                        <p className="mt-3 text-sm text-[#526B7D]">
                          Seats up to {room.capacity}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {room.has_whiteboard && (
                            <span className="rounded-full bg-[#E7F1F6] px-2.5 py-1 text-xs">
                              Whiteboard
                            </span>
                          )}
                          {room.has_display && (
                            <span className="rounded-full bg-[#E7F1F6] px-2.5 py-1 text-xs">
                              Display
                            </span>
                          )}
                        </div>
                      </button>
                    ))}

                    {visibleRooms.length === 0 && (
                      <p className="col-span-full rounded-xl border border-dashed border-[#C9DEE6] p-6 text-[#526B7D]">
                        No rooms match that search.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>

          <aside className="h-fit rounded-2xl border border-[#C9DEE6] bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
            {selectedRoom ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0D8F91]">
                  Selected room
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {selectedRoom.room_number}
                </h2>
                <p className="mt-1 text-sm text-[#526B7D]">
                  Seats up to {selectedRoom.capacity}
                  {selectedRoom.libraries?.name
                    ? ` · ${selectedRoom.libraries.name}`
                    : ""}
                </p>

                {reservationMessage && (
                  <p
                    className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800"
                    role="status"
                  >
                    {reservationMessage}
                  </p>
                )}
                {reservationError && (
                  <p
                    className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800"
                    role="alert"
                  >
                    {reservationError}
                  </p>
                )}

                <form onSubmit={handleReserve} className="mt-6 space-y-4">
                  <label className="block text-sm font-medium">
                    Date
                    <input
                      type="date"
                      required
                      value={reservationDate}
                      min={localDateString(new Date())}
                      onChange={(event) =>
                        setReservationDate(event.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-[#C9DEE6] bg-white px-3 py-2"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm font-medium">
                      Start time
                      <select
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-[#C9DEE6] bg-white px-3 py-2"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time.value} value={time.value}>
                            {time.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium">
                      End time
                      <select
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-[#C9DEE6] bg-white px-3 py-2"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time.value} value={time.value}>
                            {time.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <p className="text-xs text-[#526B7D]">
                    Time choices are requests. The backend checks for overlapping
                    reservations when you submit.
                  </p>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-[#0D8F91] px-4 py-3 font-semibold text-white hover:bg-[#08797B] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Confirming..." : "Reserve room"}
                  </button>
                </form>
              </>
            ) : (
              <div className="py-8 text-center">
                <h2 className="text-xl font-semibold">Choose a room</h2>
                <p className="mt-2 text-sm text-[#526B7D]">
                  Select a map marker or a room from the list.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
