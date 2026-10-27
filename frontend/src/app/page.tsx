"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [status, setStatus] = useState<string>("Checking backend connection...");

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("http://127.0.0.1:8000/");
        const data = await res.json();
        console.log("Health check response:", data);
        setStatus(data.message || "Libro API Active");
      } catch (err) {
        console.error("Backend offline:", err);
        setStatus("Backend Disconnected");
      }
    }
    checkHealth();
  }, []);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Libro Library Portal</h1>
      <p style={{ color: "#666" }}>
        Backend Status: <strong style={{ color: "green" }}>{status}</strong>
      </p>

      <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
        <Link
          href="/books"
          style={{
            padding: "1rem 2rem",
            background: "#0070f3",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          Browse Books →
        </Link>
        <Link
          href="/rooms"
          style={{
            padding: "1rem 2rem",
            background: "#17c964",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          Reserve Study Rooms →
        </Link>
        <Link
          href="/dashboard"
          style={{
            padding: "1rem 2rem",
            background: "#7928ca",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          View Dashboard →
        </Link>
      </div>
    </main>
  );
}