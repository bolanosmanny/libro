"use client";

import { useEffect, useState } from "react";

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

export default function RoomsPage() {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/rooms");
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
        const data = await res.json();
        setRooms(data);
      } catch (err: any) {
        console.error("Failed to fetch rooms:", err);
        setError("Could not load study rooms from backend.");
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, []);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Study Rooms</h1>
      {loading && <p>Loading study rooms...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {rooms.map((room) => (
            <li
              key={room.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <h3>Room {room.room_number}</h3>
              <p>Library: {room.libraries?.name ?? "Main Library"}</p>
              <p>Capacity: {room.capacity} people</p>
              <p>
                Features:{" "}
                {room.has_whiteboard ? "Whiteboard " : ""}
                {room.has_display ? "Display Screen" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}