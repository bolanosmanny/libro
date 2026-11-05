"use client";

import { useMemo, useState } from "react";

type Floor = 1 | 2 | 3;

type MapRoom = {
  number: number;
  floor: Floor;
  x: number;
  y: number;
  width: number;
};

type DatabaseRoom = {
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

type ReserveRoomsMapProps = {
  databaseRooms: DatabaseRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (room: DatabaseRoom) => void;
};

const mapRooms: MapRoom[] = [
  { number: 136, floor: 1, x: 73, y: 22, width: 10 },
  { number: 227, floor: 2, x: 12, y: 22, width: 11.5 },
  { number: 228, floor: 2, x: 24, y: 22, width: 4.5 },
  { number: 229, floor: 2, x: 29, y: 22, width: 4.5 },
  { number: 230, floor: 2, x: 34, y: 22, width: 4.5 },
  { number: 231, floor: 2, x: 39, y: 22, width: 4.5 },
  { number: 232, floor: 2, x: 44, y: 22, width: 4.5 },
  { number: 233, floor: 2, x: 49, y: 22, width: 4.5 },
  { number: 234, floor: 2, x: 54, y: 22, width: 4.5 },
  { number: 236, floor: 2, x: 75, y: 22, width: 10 },
  { number: 327, floor: 3, x: 10, y: 22, width: 4.5 },
  { number: 328, floor: 3, x: 15, y: 22, width: 4.5 },
  { number: 329, floor: 3, x: 20, y: 22, width: 4.5 },
  { number: 330, floor: 3, x: 25, y: 22, width: 4.5 },
  { number: 331, floor: 3, x: 30, y: 22, width: 4.5 },
  { number: 332, floor: 3, x: 35, y: 22, width: 4.5 },
  { number: 333, floor: 3, x: 40, y: 22, width: 4.5 },
  { number: 334, floor: 3, x: 45, y: 22, width: 4.5 },
  { number: 335, floor: 3, x: 50, y: 22, width: 4.5 },
  { number: 336, floor: 3, x: 55, y: 22, width: 4.5 },
  { number: 337, floor: 3, x: 60, y: 22, width: 4.5 },
];

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
      <text
        x="500"
        y="34"
        textAnchor="middle"
        className="fill-[#526b7d] text-[20px] font-semibold tracking-[5px]"
      >
        CALHOUN STREET
      </text>
      <text
        x="500"
        y="540"
        textAnchor="middle"
        className="fill-[#526b7d] text-[20px] font-semibold tracking-[5px]"
      >
        RIVERS GREEN
      </text>
      <text
        x="22"
        y="282"
        textAnchor="middle"
        transform="rotate(-90 22 282)"
        className="fill-[#526b7d] text-[17px] font-semibold tracking-[4px]"
      >
        PITT STREET
      </text>
      <text
        x="978"
        y="282"
        textAnchor="middle"
        transform="rotate(90 978 282)"
        className="fill-[#526b7d] text-[17px] font-semibold tracking-[4px]"
      >
        COMING STREET
      </text>

      <path d="M72 85 H928 V465 H72 Z" fill="#fff" stroke="#74818a" strokeWidth="8" />
      <path d="M90 105 H910 V445 H90 Z" fill="none" stroke="#c5c6c1" strokeWidth="3" />
      <path d="M92 180 H908 M92 365 H908" stroke="#c5c6c1" strokeWidth="5" />
      <path
        d="M245 105 V180 M475 105 V180 M700 105 V180 M245 365 V445 M475 365 V445 M700 365 V445"
        stroke="#c5c6c1"
        strokeWidth="4"
      />
      <path d="M90 180 H245 V365 H90 Z" fill="#e6e1d4" stroke="#b4ad9c" strokeWidth="2" />
      <path d="M700 180 H908 V365 H700 Z" fill="#e6e1d4" stroke="#b4ad9c" strokeWidth="2" />
      <path d="M245 180 H475 V365 H245 Z" fill="#f2f0e9" stroke="#c5c6c1" strokeWidth="2" />
      <path d="M475 180 H700 V365 H475 Z" fill="#f2f0e9" stroke="#c5c6c1" strokeWidth="2" />

      {floor === 1 && (
        <>
          <path d="M105 115 H390 V170 H105 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="245" y="145" textAnchor="middle" className="fill-[#526b7d] text-[18px] font-semibold">
            HENRY BROWN WING
          </text>

          <path d="M310 230 H670 V355 H310 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="420" y="278" textAnchor="middle" className="fill-[#526b7d] text-[18px] font-semibold">
            RIVERS
          </text>
          <text x="420" y="305" textAnchor="middle" className="fill-[#526b7d] text-[18px] font-semibold">
            COLLECTION
          </text>
          <circle cx="590" cy="282" r="58" fill="#fff" stroke="#c5c6c1" strokeWidth="3" />

          <text x="164" y="270" textAnchor="middle" className="fill-[#526b7d] text-[17px] font-semibold">
            STUDENT
          </text>
          <text x="164" y="295" textAnchor="middle" className="fill-[#526b7d] text-[17px] font-semibold">
            LEARNING
          </text>
          <text x="164" y="320" textAnchor="middle" className="fill-[#526b7d] text-[17px] font-semibold">
            CENTER
          </text>

          <rect x="730" y="210" width="145" height="110" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="802" y="260" textAnchor="middle" className="fill-[#526b7d] text-[17px] font-semibold">
            ACCESS
          </text>
          <text x="802" y="285" textAnchor="middle" className="fill-[#526b7d] text-[17px] font-semibold">
            SERVICES
          </text>
        </>
      )}

      {floor === 2 && (
        <>
          <path d="M115 108 H238 V172 H115 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />

          <path d="M115 205 H420 V350 H115 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <path d="M700 205 H875 V350 H700 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="265" y="273" textAnchor="middle" className="fill-[#526b7d] text-[21px] font-semibold">
            BOOK STACKS
          </text>
          <text x="788" y="273" textAnchor="middle" className="fill-[#526b7d] text-[21px] font-semibold">
            BOOK STACKS
          </text>
          <circle cx="575" cy="282" r="62" fill="#fff" stroke="#c5c6c1" strokeWidth="3" />

          <text x="350" y="420" textAnchor="middle" className="fill-[#526b7d] text-[18px] font-semibold">
            COLLECTION SERVICES
          </text>
          <text x="780" y="420" textAnchor="middle" className="fill-[#526b7d] text-[18px] font-semibold">
            LIBRARY ADMINISTRATION
          </text>
        </>
      )}

      {floor === 3 && (
        <>
          <path d="M112 200 H420 V350 H112 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="264" y="263" textAnchor="middle" className="fill-[#526b7d] text-[19px] font-semibold">
            BOUND JOURNALS
          </text>
          <text x="264" y="290" textAnchor="middle" className="fill-[#526b7d] text-[19px] font-semibold">
            &amp; PERIODICALS
          </text>

          <path d="M700 180 H900 V365 H700 Z" fill="#ded8c9" stroke="#b4ad9c" strokeWidth="2" />
          <text x="800" y="240" textAnchor="middle" className="fill-[#526b7d] text-[16px] font-semibold">
            SPECIAL
          </text>
          <text x="800" y="267" textAnchor="middle" className="fill-[#526b7d] text-[16px] font-semibold">
            COLLECTIONS
          </text>
          <text x="800" y="294" textAnchor="middle" className="fill-[#526b7d] text-[16px] font-semibold">
            &amp; ARCHIVES
          </text>

          <circle cx="620" cy="285" r="57" fill="#fff" stroke="#c5c6c1" strokeWidth="3" />
          <text x="490" y="420" textAnchor="middle" className="fill-[#526b7d] text-[19px] font-semibold">
            READING ROOM
          </text>
        </>
      )}

      <g fill="#d8d8d3" stroke="#929a9e" strokeWidth="2">
        <rect x="78" y="92" width="36" height="10" />
        <rect x="150" y="92" width="36" height="10" />
        <rect x="222" y="92" width="36" height="10" />
        <rect x="294" y="92" width="36" height="10" />
        <rect x="366" y="92" width="36" height="10" />
        <rect x="438" y="92" width="36" height="10" />
        <rect x="510" y="92" width="36" height="10" />
        <rect x="582" y="92" width="36" height="10" />
        <rect x="654" y="92" width="36" height="10" />
        <rect x="726" y="92" width="36" height="10" />
        <rect x="798" y="92" width="36" height="10" />
        <rect x="870" y="92" width="36" height="10" />
      </g>
      <g fill="#e2e4e3" stroke="#74818a" strokeWidth="3">
        <rect x="45" y="228" width="27" height="95" />
        <rect x="928" y="228" width="27" height="95" />
      </g>
      <text x="58" y="278" textAnchor="middle" className="fill-[#526b7d] text-[12px] font-semibold">
        LIFT
      </text>
      <text x="942" y="278" textAnchor="middle" className="fill-[#526b7d] text-[12px] font-semibold">
        LIFT
      </text>
    </svg>
  );
}

export default function ReserveRoomsMap({
  databaseRooms,
  selectedRoomId,
  onSelectRoom,
}: ReserveRoomsMapProps) {
  const [floor, setFloor] = useState<Floor>(2);
  const floorRooms = useMemo(
    () => mapRooms.filter((room) => room.floor === floor),
    [floor]
  );

  function findDatabaseRoom(number: number): DatabaseRoom | null {
    const matches = databaseRooms.filter(
      (room) => room.room_number.trim().toLowerCase() === `room ${number}`
    );

    // If another library has the same number, do not select the wrong room.
    return matches.length === 1 ? matches[0] : null;
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Addlestone floor plan</h3>
          <p className="mt-1 text-sm text-[#526B7D]">
            Select a mapped room to fill in the reservation form.
          </p>
        </div>

        <div
          className="flex border-b border-[#C9DEE6]"
          role="group"
          aria-label="Choose floor"
        >
          {([1, 2, 3] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setFloor(level)}
              aria-pressed={floor === level}
              className={`border-b-2 px-3 py-2 text-sm font-semibold ${
                floor === level
                  ? "border-[#0D8F91] text-[#10263F]"
                  : "border-transparent text-[#526B7D] hover:text-[#10263F]"
              }`}
            >
              Floor {level}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4 aspect-[1000/560] overflow-hidden border border-[#D7D6D0] bg-[#F7F5EF]">
        <FloorPlan floor={floor} />

        {floorRooms.map((marker) => {
          const databaseRoom = findDatabaseRoom(marker.number);
          const dropInOnly = marker.number === 227;
          const selected = databaseRoom?.id === selectedRoomId;

          return (
            <button
              key={marker.number}
              type="button"
              disabled={dropInOnly || !databaseRoom}
              onClick={() => {
                if (databaseRoom) onSelectRoom(databaseRoom);
              }}
              aria-label={
                dropInOnly
                  ? "Room 227, drop-in only"
                  : databaseRoom
                    ? `Select ${databaseRoom.room_number}, capacity ${databaseRoom.capacity}`
                    : `Room ${marker.number}, unavailable online`
              }
              aria-pressed={selected}
              style={{
                left: `${marker.x}%`,
                top: `${marker.y}%`,
                width: `${marker.width}%`,
              }}
              className={`absolute flex h-[7%] items-center justify-center border text-[clamp(0.55rem,1.2vw,0.85rem)] font-bold focus:z-10 focus:outline-none focus:ring-2 focus:ring-[#0D8F91] ${
                selected
                  ? "border-[#0D8F91] bg-[#0D8F91] text-white"
                  : dropInOnly || !databaseRoom
                    ? "cursor-not-allowed border-[#AAB8BB] bg-[#E5E9E9] text-[#71818A]"
                    : "border-[#146A70] bg-[#D9F0F1]/95 text-[#10263F] hover:bg-[#BCE5E6]"
              }`}
            >
              {marker.number}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-[#526B7D]">
        Room 227 is drop-in only. Other mapped rooms use Libro’s database for
        reservations.
      </p>

      <div className="mt-5">
        <h4 className="text-sm font-semibold">{floorNames[floor]} floor rooms</h4>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {floorRooms.map((marker) => {
            const databaseRoom = findDatabaseRoom(marker.number);
            const dropInOnly = marker.number === 227;

            return (
              <button
                key={marker.number}
                type="button"
                disabled={dropInOnly || !databaseRoom}
                onClick={() => {
                  if (databaseRoom) onSelectRoom(databaseRoom);
                }}
                aria-pressed={databaseRoom?.id === selectedRoomId}
                className="flex items-center justify-between rounded-lg border border-[#C9DEE6] bg-white p-3 text-left hover:border-[#0D8F91] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="font-medium">Room {marker.number}</span>
                <span className="text-xs text-[#526B7D]">
                  {dropInOnly
                    ? "Drop-in"
                    : databaseRoom
                      ? `${databaseRoom.capacity} seats`
                      : "Unavailable"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}