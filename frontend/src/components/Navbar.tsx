"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase?.auth) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        setUserEmail(data.session.user.email ?? null);
        localStorage.setItem("libro_user_id", data.session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email ?? null);
        localStorage.setItem("libro_user_id", session.user.id);
      } else {
        setUserEmail(null);
        localStorage.removeItem("libro_user_id");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (supabase?.auth) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("libro_user_id");
    setUserEmail(null);
    router.push("/login");
  };

  return (
    <nav style={{ background: "#1f2937", color: "white", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Link href="/" style={{ color: "white", textDecoration: "none", fontSize: "1.25rem", fontWeight: "bold" }}>
        Libro Portal
      </Link>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
        <Link href="/books" style={{ color: "#e5e7eb", textDecoration: "none" }}>Books</Link>
        <Link href="/rooms" style={{ color: "#e5e7eb", textDecoration: "none" }}>Study Rooms</Link>
        <Link href="/dashboard" style={{ color: "#e5e7eb", textDecoration: "none" }}>Dashboard</Link>

        {userEmail ? (
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginLeft: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>{userEmail}</span>
            <button
              onClick={handleLogout}
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                padding: "0.4rem 0.8rem",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Log Out
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "0.75rem", marginLeft: "1rem" }}>
            <Link
              href="/login"
              style={{
                background: "#0070f3",
                color: "white",
                padding: "0.4rem 0.8rem",
                borderRadius: "4px",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Log In
            </Link>
            <Link
              href="/register"
              style={{
                background: "#17c964",
                color: "white",
                padding: "0.4rem 0.8rem",
                borderRadius: "4px",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}