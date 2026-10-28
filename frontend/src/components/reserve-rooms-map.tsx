"use client";

import { useMemo, useState } from "react";

type Floor = 1 | 2 | 3;
type Room = {
  number: number;
  floor: Floor;
  capacity: number;
  x: number;
  y: number;
  width: number;
};

const rooms: Room[] = [
  { number: 136, floor: 1, capacity: 8, x: 73, y: 29, width: 10 },
  { number: 227, floor: 2, capacity: 20, x: 12, y: 24, width: 12 },
  { number: 228, floor: 2, capacity: 5, x: 24, y: 29, width: 5 },
  { number: 229, floor: 2, capacity: 5, x: 29, y: 29, width: 5 },
  { number: 230, floor: 2, capacity: 5, x: 34, y: 29, width: 5 },
  { number: 231, floor: 2, capacity: 5, x: 39, y: 29, width: 5 },
  { number: 232, floor: 2, capacity: 5, x: 44, y: 29, width: 5 },
  { number: 233, floor: 2, capacity: 5, x: 49, y: 29, width: 5 },
  { number: 234, floor: 2, capacity: 5, x: 54, y: 29, width: 5 },
  { number: 236, floor: 2, capacity: 8, x: 75, y: 29, width: 10 },
  { number: 327, floor: 3, capacity: 5, x: 10, y: 23, width: 5 },
  { number: 328, floor: 3, capacity: 5, x: 15, y: 23, width: 5 },
  { number: 329, floor: 3, capacity: 5, x: 20, y: 23, width: 5 },
  { number: 330, floor: 3, capacity: 5, x: 25, y: 23, width: 5 },
  { number: 331, floor: 3, capacity: 5, x: 30, y: 23, width: 5 },
  { number: 332, floor: 3, capacity: 5, x: 35, y: 23, width: 5 },
  { number: 333, floor: 3, capacity: 5, x: 40, y: 23, width: 5 },
  { number: 334, floor: 3, capacity: 5, x: 45, y: 23, width: 5 },
  { number: 335, floor: 3, capacity: 5, x: 50, y: 23, width: 5 },
  { number: 336, floor: 3, capacity: 5, x: 55, y: 23, width: 5 },
  { number: 337, floor: 3, capacity: 5, x: 60, y: 23, width: 5 },
];

const HOURS_CALENDAR_DAYS = 7;
const MAX_RESERVATION_DAYS = 14;
const REGULAR_OPEN_MINUTES = 7 * 60 + 30;
const REGULAR_CLOSE_MINUTES = 24 * 60;

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function displayDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString([], options);
}

function displayTime(minutes: number): string {
  return new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function reservationKey(roomNumber: number, date: string, startMinutes: number): string {
  return `${roomNumber}:${date}:${startMinutes}`;
}

const floorNames: Record<Floor, string> = {
  1: "First",
  2: "Second",
  3: "Third",
};

function FloorPlan({ floor }: { floor: Floor }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1000 560"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
    >
      <rect width="1000" height="560" fill="#f7f5ef" />
      <text x="500" y="34" textAnchor="middle" className="fill-[#526b7d] text-[20px] font-semibold tracking-[5px]">CALHOUN STREET</text>
      <text x="500" y="540" textAnchor="middle" className="fill-[#526b7d] text-[20px] font-semibold tracking-[5px]">RIVERS GREEN</text>
      <text x="22" y="282" textAnchor="middle" transform="rotate(-90 22 282)" className="fill-[#526b7d] text-[17px] font-semibold tracking-[4px]">PITT STREET</text>
      <text x="978" y="282" textAnchor="middle" transform="rotate(90 978 282)" className="fill-[#526b7d] text-[17px] font-semibold tracking-[4px]">COMING STREET</text>

      <path d="M72 85 H928 V465 H72 Z" fill="#fff" stroke="#74818a" strokeWidth="8" />
      <path d="M90 105 H910 V445 H90 Z" fill="none" stroke="#c5c6c1" strokeWidth="3" />
      <path d="M92 180 H908 M92 365 H908" stroke="#c5c6c1" strokeWidth="5" />
      <path d="M245 105 V180 M475 105 V180 M700 105 V180 M245 365 V445 M475 365 V445 M700 365 V445" stroke="#c5c6c1" strokeWidth="4" />
      <path d="M90 180 H245 V365 H90 Z" fill="#e6e1d4" stroke="#b4ad9c" strokeWidth="2" />
      <path d="M700 180 H908 V365 H700 Z" fill="#e6e1d4" stroke="#b4ad9c" strokeWidth="2" />
      <path d="M245 180 H475 V365 H245 Z" fill="#f2f0e9" stroke="#c5c6c1" strokeWidth="2" />
      <path d="M475 180 H700 V365 H475 Z" fill="#f2f0e9" stroke="#c5c6c1" strokeWidth="2" />

      {floor === 1 && (
        <>
          <path d="M105 115 H390 V170 H105 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="245" y="145" textAnchor="middle" className="fill-[#526b7d] text-[18px] font-semibold">HENRY BROWN WING</text>
          <path d="M310 230 H670 V355 H310 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="490" y="290" textAnchor="middle" className="fill-[#526b7d] text-[18px] font-semibold">RIVERS COLLECTION</text>
          <circle cx="590" cy="282" r="58" fill="#fff" stroke="#c5c6c1" strokeWidth="3" />
          <text x="164" y="278" textAnchor="middle" className="fill-[#526b7d] text-[17px] font-semibold">STUDENT</text>
          <text x="164" y="302" textAnchor="middle" className="fill-[#526b7d] text-[17px] font-semibold">LEARNING</text>
          <text x="164" y="326" textAnchor="middle" className="fill-[#526b7d] text-[17px] font-semibold">CENTER</text>
          <rect x="730" y="210" width="145" height="110" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="802" y="260" textAnchor="middle" className="fill-[#526b7d] text-[17px] font-semibold">ACCESS</text>
          <text x="802" y="284" textAnchor="middle" className="fill-[#526b7d] text-[17px] font-semibold">SERVICES</text>
        </>
      )}
      {floor === 2 && (
        <>
          <path d="M115 108 H238 V172 H115 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="176" y="137" textAnchor="middle" className="fill-[#526b7d] text-[16px] font-semibold">227</text>
          <text x="176" y="158" textAnchor="middle" className="fill-[#526b7d] text-[11px] font-semibold">CONFERENCE</text>
          <path d="M115 205 H420 V350 H115 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <path d="M700 205 H875 V350 H700 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="265" y="273" textAnchor="middle" className="fill-[#526b7d] text-[21px] font-semibold">BOOK STACKS</text>
          <text x="788" y="273" textAnchor="middle" className="fill-[#526b7d] text-[21px] font-semibold">BOOK STACKS</text>
          <circle cx="575" cy="282" r="62" fill="#fff" stroke="#c5c6c1" strokeWidth="3" />
          <text x="350" y="420" textAnchor="middle" className="fill-[#526b7d] text-[18px] font-semibold">COLLECTION &amp; CONTENT SERVICES</text>
          <text x="780" y="420" textAnchor="middle" className="fill-[#526b7d] text-[18px] font-semibold">LIBRARY ADMINISTRATION</text>
          <path d="M350 385 H575 M575 385 H780" stroke="#c5c6c1" strokeWidth="4" />
        </>
      )}
      {floor === 3 && (
        <>
          <path d="M112 200 H420 V350 H112 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <path d="M700 180 H900 V365 H700 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="264" y="263" textAnchor="middle" className="fill-[#526b7d] text-[19px] font-semibold">BOUND JOURNALS</text>
          <text x="264" y="290" textAnchor="middle" className="fill-[#526b7d] text-[19px] font-semibold">&amp; PERIODICALS</text>
          <text x="800" y="255" textAnchor="middle" className="fill-[#526b7d] text-[18px] font-semibold">SPECIAL COLLECTIONS</text>
          <text x="800" y="281" textAnchor="middle" className="fill-[#526b7d] text-[18px] font-semibold">&amp; ARCHIVES</text>
          <path d="M115 115 H530 V170 H115 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="322" y="148" textAnchor="middle" className="fill-[#526b7d] text-[18px] font-semibold">ARCHIVAL STORAGE</text>
          <circle cx="620" cy="285" r="57" fill="#fff" stroke="#c5c6c1" strokeWidth="3" />
          <text x="490" y="420" textAnchor="middle" className="fill-[#526b7d] text-[19px] font-semibold">READING ROOM</text>
        </>
      )}

      <g fill="#d8d8d3" stroke="#929a9e" strokeWidth="2">
        <rect x="78" y="92" width="36" height="10" /><rect x="150" y="92" width="36" height="10" />
        <rect x="222" y="92" width="36" height="10" /><rect x="294" y="92" width="36" height="10" />
        <rect x="366" y="92" width="36" height="10" /><rect x="438" y="92" width="36" height="10" />
        <rect x="510" y="92" width="36" height="10" /><rect x="582" y="92" width="36" height="10" />
        <rect x="654" y="92" width="36" height="10" /><rect x="726" y="92" width="36" height="10" />
        <rect x="798" y="92" width="36" height="10" /><rect x="870" y="92" width="36" height="10" />
        <rect x="78" y="448" width="36" height="10" /><rect x="150" y="448" width="36" height="10" />
        <rect x="222" y="448" width="36" height="10" /><rect x="294" y="448" width="36" height="10" />
        <rect x="366" y="448" width="36" height="10" /><rect x="438" y="448" width="36" height="10" />
        <rect x="510" y="448" width="36" height="10" /><rect x="582" y="448" width="36" height="10" />
        <rect x="654" y="448" width="36" height="10" /><rect x="726" y="448" width="36" height="10" />
        <rect x="798" y="448" width="36" height="10" /><rect x="870" y="448" width="36" height="10" />
      </g>
      <g fill="#e2e4e3" stroke="#74818a" strokeWidth="3">
        <rect x="45" y="228" width="27" height="95" />
        <rect x="928" y="228" width="27" height="95" />
      </g>
      <text x="58" y="278" textAnchor="middle" className="fill-[#526b7d] text-[12px] font-semibold">LIFT</text>
      <text x="942" y="278" textAnchor="middle" className="fill-[#526b7d] text-[12px] font-semibold">LIFT</text>
    </svg>
  );
}

export default function ReserveRoomsMap() {
  const [floor, setFloor] = useState<Floor>(2);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => localDateString(new Date()));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [selectedStartMinutes, setSelectedStartMinutes] = useState<number | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(() => new Set());
  const [bookingMessage, setBookingMessage] = useState("");
  const floorRooms = useMemo(() => rooms.filter((room) => room.floor === floor), [floor]);
  const selectedRoom = rooms.find((room) => room.number === selectedRoomNumber);
  const today = localDateString(new Date());
  const maxDate = localDateString(addDays(new Date(), MAX_RESERVATION_DAYS - 1));
  const hoursCalendarDays = useMemo(
    () => Array.from({ length: HOURS_CALENDAR_DAYS }, (_, index) => addDays(new Date(`${today}T12:00:00`), index)),
    [today],
  );
  const timeSlots = useMemo(() => {
    if (!selectedRoom || selectedRoom.number === 227) return [];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const firstStart = selectedDate === today
      ? Math.max(REGULAR_OPEN_MINUTES, Math.ceil(currentMinutes / 30) * 30)
      : REGULAR_OPEN_MINUTES;
    const slots: number[] = [];
    for (let start = firstStart; start + durationMinutes <= REGULAR_CLOSE_MINUTES; start += 30) {
      slots.push(start);
    }
    return slots;
  }, [durationMinutes, selectedDate, selectedRoom, today]);

  function chooseFloor(nextFloor: Floor) {
    setFloor(nextFloor);
    setSelectedRoomNumber(null);
    setSelectedStartMinutes(null);
    setBookingMessage("");
  }

  function chooseRoom(roomNumber: number) {
    setSelectedRoomNumber(roomNumber);
    setSelectedStartMinutes(null);
    setBookingMessage("");
  }

  function makeReservation() {
    if (!selectedRoom || selectedStartMinutes === null) return;
    const key = reservationKey(selectedRoom.number, selectedDate, selectedStartMinutes);
    setBookedSlots((current) => new Set(current).add(key));
    setBookingMessage(
      `Demo reservation saved: Room ${selectedRoom.number}, ${displayDate(new Date(`${selectedDate}T12:00:00`), { month: "short", day: "numeric" })}, ${displayTime(selectedStartMinutes)}–${displayTime(selectedStartMinutes + durationMinutes)}.`,
    );
    setSelectedStartMinutes(null);
  }

  return (
    <section id="study-rooms" className="scroll-mt-8 border border-[#C9DEE6] bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0D8F91]">Addlestone Library</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#10263F]">Reserve a study room</h2>
          <p className="mt-2 max-w-2xl text-sm text-[#526B7D]">Choose a floor and room, then open that room’s schedule to see available times.</p>
        </div>
        <div className="flex border-b border-[#C9DEE6]" role="group" aria-label="Choose floor">
          {([1, 2, 3] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => chooseFloor(level)}
              aria-pressed={floor === level}
              className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${floor === level ? "border-[#0D8F91] text-[#10263F]" : "border-transparent text-[#526B7D] hover:text-[#10263F]"}`}
            >
              Floor {level}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-6 border border-[#C9DEE6] bg-[#F4FAFC] p-4" aria-label="Library hours calendar">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="font-semibold text-[#10263F]">Library hours</h3>
            <p className="mt-1 text-xs text-[#526B7D]">Regular schedule · special hours may vary</p>
          </div>
          <a
            href="https://library.charleston.edu/hours/"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-[#08797B] underline underline-offset-2"
          >
            Full library hours ↗
          </a>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {hoursCalendarDays.map((date) => {
            return (
              <div key={localDateString(date)} className="border border-[#DDE8EB] bg-white px-3 py-2 text-left">
                <span className="block text-xs font-semibold text-[#526B7D]">{displayDate(date, { weekday: "short" })}</span>
                <span className="mt-1 block text-sm font-semibold text-[#10263F]">{displayDate(date, { month: "short", day: "numeric" })}</span>
                <span className="mt-1 block text-[11px] text-[#526B7D]">7:30 AM–12 AM</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-[#526B7D]">Addlestone’s regular hours are shown as a guide. Holiday and special-event hours may differ.</p>
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.8fr)]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-[#10263F]">{floorNames[floor]} floor plan</h3>
            <span className="text-xs text-[#526B7D]">{floorRooms.length} rooms listed</span>
          </div>
          <div className="relative aspect-[1000/560] overflow-hidden border border-[#D7D6D0] bg-[#f7f5ef]">
            <FloorPlan floor={floor} />
            {floorRooms.map((room) => (
              <button
                key={room.number}
                type="button"
                aria-label={`Room ${room.number}${room.number === 227 ? ", conference room" : `, capacity ${room.capacity}`}${selectedRoomNumber === room.number ? ", selected" : ""}`}
                aria-pressed={selectedRoomNumber === room.number}
                onClick={() => chooseRoom(room.number)}
                style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.width}%` }}
                className={`absolute flex h-[9%] -translate-y-1/2 items-center justify-center border text-[clamp(0.55rem,1.2vw,0.85rem)] font-bold transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-[#0D8F91] ${selectedRoomNumber === room.number ? "border-[#0D8F91] bg-[#0D8F91] text-white" : "border-[#146A70] bg-[#D9F0F1]/95 text-[#10263F] hover:bg-[#BCE5E6]"}`}
              >
                {room.number}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#526B7D]">
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 border border-[#146A70] bg-[#D9F0F1]" /> Select a room marker</span>
            <span>Choose a room to see its available times.</span>
          </div>
        </div>

        <aside className="flex flex-col border border-[#C9DEE6] bg-[#F4FAFC] p-4" aria-label="Rooms on this floor">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-[#10263F]">Rooms on this floor</h3>
            <span className="text-xs text-[#526B7D]">{floorRooms.length} total</span>
          </div>
          <div className="mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
            {floorRooms.map((room) => (
              <button
                key={room.number}
                type="button"
                onClick={() => chooseRoom(room.number)}
                aria-pressed={selectedRoomNumber === room.number}
                className={`flex w-full items-center justify-between border p-3 text-left transition-colors ${selectedRoomNumber === room.number ? "border-[#0D8F91] bg-[#D9F0F1]" : "border-[#DDE8EB] bg-white hover:border-[#8ECFD0]"}`}
              >
                <span>
                  <span className="block font-semibold text-[#10263F]">Room {room.number}</span>
                  <span className="mt-0.5 block text-xs text-[#526B7D]">{room.number === 227 ? "Conference room · drop-in use" : `Capacity ${room.capacity}`}</span>
                </span>
                <span className="text-xs font-medium text-[#526B7D]">{room.number === 227 ? "Drop-in" : "Choose"}</span>
              </button>
            ))}
          </div>

          {selectedRoom ? (
            <div className="mt-4 border border-[#C9DEE6] bg-white p-4" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0D8F91]">Selected room</p>
              <p className="mt-1 text-xl font-semibold text-[#10263F]">Room {selectedRoom.number}</p>
              <p className="mt-1 text-sm text-[#526B7D]">{floorNames[selectedRoom.floor]} floor · {selectedRoom.number === 227 ? "Conference room · drop-in use when not in library instruction" : `Seats up to ${selectedRoom.capacity}`}</p>
              {selectedRoom.number === 227 ? (
                <p className="mt-3 border-l-2 border-[#8A6D3B] bg-[#F7F4EC] px-3 py-2 text-xs leading-relaxed text-[#526B7D]">Room 227 is collaborative drop-in space when it is not being used for library instruction, so it cannot be reserved here.</p>
              ) : (
                <>
                  <label className="mt-4 block text-sm font-medium text-[#10263F]" htmlFor="reservation-date">Date</label>
                  <input
                    id="reservation-date"
                    type="date"
                    value={selectedDate}
                    min={today}
                    max={maxDate}
                    onChange={(event) => {
                      setSelectedDate(event.target.value);
                      setSelectedStartMinutes(null);
                      setBookingMessage("");
                    }}
                    className="mt-1 w-full border border-[#C9DEE6] bg-white px-3 py-2 text-sm text-[#10263F]"
                  />
                  <label className="mt-3 block text-sm font-medium text-[#10263F]" htmlFor="reservation-duration">Length</label>
                  <select
                    id="reservation-duration"
                    value={durationMinutes}
                    onChange={(event) => {
                      setDurationMinutes(Number(event.target.value));
                      setSelectedStartMinutes(null);
                    }}
                    className="mt-1 w-full border border-[#C9DEE6] bg-white px-3 py-2 text-sm text-[#10263F]"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1 hour 30 minutes</option>
                    <option value={120}>2 hours (maximum)</option>
                  </select>

                  <p className="mt-4 text-sm font-semibold text-[#10263F]">Choose a start time</p>
                  <p className="mt-1 text-xs text-[#8A6D3B]">Demo schedule — sample slots, not live library availability.</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {timeSlots.map((startMinutes) => {
                      const key = reservationKey(selectedRoom.number, selectedDate, startMinutes);
                      const isBooked = bookedSlots.has(key);
                      const isSelected = selectedStartMinutes === startMinutes;
                      return (
                        <button
                          key={startMinutes}
                          type="button"
                          disabled={isBooked}
                          aria-pressed={isSelected}
                          onClick={() => {
                            setSelectedStartMinutes(startMinutes);
                            setBookingMessage("");
                          }}
                          className={`border px-2 py-2 text-sm ${isBooked ? "cursor-not-allowed border-[#E3E5E5] bg-[#F1F2F1] text-[#8A9292] line-through" : isSelected ? "border-[#0D8F91] bg-[#D9F0F1] font-semibold text-[#10263F]" : "border-[#DDE8EB] bg-white text-[#385769] hover:border-[#0D8F91]"}`}
                        >
                          {displayTime(startMinutes)}{isBooked ? " · reserved" : ""}
                        </button>
                      );
                    })}
                  </div>
                  {timeSlots.length === 0 && <p className="mt-2 text-sm text-[#526B7D]">No remaining start times today. Try another date.</p>}
                  <button
                    type="button"
                    disabled={selectedStartMinutes === null}
                    onClick={makeReservation}
                    className="mt-4 w-full border border-[#0D8F91] bg-[#0D8F91] px-4 py-3 text-sm font-semibold text-white hover:bg-[#08797B] disabled:cursor-not-allowed disabled:border-[#B9CFD5] disabled:bg-[#DDE8EB] disabled:text-[#71818A]"
                  >
                    Reserve room
                  </button>
                  {bookingMessage && <p role="status" className="mt-3 border-l-2 border-[#287545] bg-[#F0F7F1] px-3 py-2 text-xs text-[#28583A]">{bookingMessage}</p>}
                  <p className="mt-3 text-[11px] leading-relaxed text-[#687B86]">Prototype only: reservations are stored in this browser session, not sent to the library.</p>
                </>
              )}
            </div>
          ) : (
            <p className="mt-4 border border-dashed border-[#B9CFD5] p-4 text-sm text-[#526B7D]">Select a room on the plan or from this list to see details.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
