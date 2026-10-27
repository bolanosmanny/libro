"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  is_available: boolean;
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/books");
      if (!res.ok) throw new Error(`Server status ${res.status}`);
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Could not load books from backend.");
    } finally {
      setLoading(false);
    }
  }

  const handleCheckout = async (bookId: string) => {
    setProcessingId(bookId);
    setMessage(null);
    setError(null);

    const activeUserId =
      typeof window !== "undefined"
        ? localStorage.getItem("libro_user_id") || "00000000-0000-0000-0000-000000000000"
        : "00000000-0000-0000-0000-000000000000";

    try {
      const res = await fetch("http://127.0.0.1:8000/api/books/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: activeUserId,
          book_id: bookId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to checkout book");
      }

      setMessage("Book checked out successfully! Return due in 14 days.");
      await fetchBooks();
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Could not complete checkout.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1>Library Books</h1>
        <Link href="/dashboard" style={{ color: "#0070f3", textDecoration: "none", fontWeight: "bold" }}>
          View Dashboard →
        </Link>
      </header>

      {message && (
        <div style={{ background: "#dcfce7", color: "#15803d", padding: "1rem", borderRadius: "6px", marginBottom: "1rem" }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "1rem", borderRadius: "6px", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {loading && <p>Loading books from database...</p>}

      {!loading && (
        <div style={{ display: "grid", gap: "1rem" }}>
          {books.map((book) => (
            <div
              key={book.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 0.5rem 0" }}>{book.title}</h3>
                <p style={{ margin: "0.25rem 0", color: "#555" }}>Author: {book.author}</p>
                <p style={{ margin: "0.25rem 0", color: "#555" }}>ISBN: {book.isbn}</p>
                <p style={{ margin: "0.25rem 0" }}>
                  Status:{" "}
                  <strong style={{ color: book.is_available ? "green" : "red" }}>
                    {book.is_available ? "Available" : "Checked Out"}
                  </strong>
                </p>
              </div>

              <div style={{ minWidth: "120px", display: "flex", justifyContent: "flex-end" }}>
                {book.is_available ? (
                  <button
                    onClick={() => handleCheckout(book.id)}
                    disabled={processingId === book.id}
                    style={{
                      padding: "0.5rem 1.25rem",
                      background: "#0070f3",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: processingId === book.id ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {processingId === book.id ? "Processing..." : "Checkout"}
                  </button>
                ) : (
                  <button
                    disabled
                    style={{
                      padding: "0.5rem 1.25rem",
                      background: "#e5e7eb",
                      color: "#9ca3af",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "not-allowed",
                    }}
                  >
                    Unavailable
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}