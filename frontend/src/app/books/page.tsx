"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
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
    fetchBooks();
  }, []);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Library Books</h1>
      {loading && <p>Loading books from database...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {books.map((book) => (
            <li
              key={book.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <h3>{book.title}</h3>
              <p>Author: {book.author}</p>
              <p>ISBN: {book.isbn}</p>
              <p>
                Status:{" "}
                <strong style={{ color: book.is_available ? "green" : "red" }}>
                  {book.is_available ? "Available" : "Checked Out"}
                </strong>
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}