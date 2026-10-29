"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  thumbnail_url?: string | null;
  is_available: boolean;
};

const API_BASE = "http://127.0.0.1:8000";

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  async function fetchBooks() {
    try {
      const response = await fetch(`${API_BASE}/api/books`);
      if (!response.ok) {
        throw new Error(`Server status ${response.status}`);
      }

      const data: Book[] = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid book response");
      }

      setBooks(data);
    } catch (caught) {
      console.error("Could not load books:", caught);
      setError("Could not load books from the backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadBooks() {
      await fetchBooks();
    }

    void loadBooks();
  }, []);

  async function handleCheckout(bookId: string) {
    if (processingId) return;

    setProcessingId(bookId);
    setMessage(null);
    setError(null);

    try {
      if (!supabase) {
        throw new Error("Authentication is not configured.");
      }

      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !data.session) {
        throw new Error("Log in before checking out a book.");
      }

      const response = await fetch(`${API_BASE}/api/books/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ book_id: bookId }),
      });

      const result: { detail?: string } =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Could not check out the book."
        );
      }

      setMessage(
        "Book checked out. You can view it on your dashboard."
      );
      await fetchBooks();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not check out the book."
      );
    } finally {
      setProcessingId(null);
    }
  }

  const search = query.trim().toLowerCase();

  const visibleBooks = books.filter((book) => {
    if (availableOnly && !book.is_available) return false;

    return `${book.title} ${book.author} ${book.isbn ?? ""}`
      .toLowerCase()
      .includes(search);
  });

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
            Libro catalog
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Find your next book
          </h1>
          <p className="mt-2 text-[#526B7D]">
            Search by title, author, or ISBN and check out an available copy.
          </p>
        </header>

        <section className="rounded-2xl border border-[#C9DEE6] bg-[#F4FAFC] p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Browse books</h2>
              <p className="mt-1 text-sm text-[#526B7D]">
                Live catalog data from Libro.
              </p>
            </div>
            {!loading && (
              <span className="text-sm text-[#526B7D]">
                {visibleBooks.length} results
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
            <label
              htmlFor="book-search"
              className="block flex-1 text-sm font-medium"
            >
              Search books
              <input
                id="book-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Title, author, or ISBN"
                className="mt-2 w-full rounded-xl border border-[#C9DEE6] bg-white px-4 py-3 outline-none placeholder:text-[#71818A] focus:border-[#0D8F91] focus:ring-2 focus:ring-[#0D8F91]/20"
              />
            </label>

            <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[#C9DEE6] bg-white px-4 text-sm font-medium">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(event) =>
                  setAvailableOnly(event.target.checked)
                }
                className="accent-[#0D8F91]"
              />
              Available only
            </label>
          </div>

          {message && (
            <p
              role="status"
              className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800"
            >
              {message}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          {loading && (
            <p role="status" className="mt-6 text-[#526B7D]">
              Loading books...
            </p>
          )}

          {!loading && visibleBooks.length === 0 && (
            <p className="mt-6 rounded-xl border border-dashed border-[#C9DEE6] p-6 text-[#526B7D]">
              No books match this search.
            </p>
          )}

          {!loading && visibleBooks.length > 0 && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleBooks.map((book) => (
                <article
                  key={book.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#C9DEE6] bg-white shadow-sm"
                >
                  <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-[#D9F0F1] to-[#D7E8EF]">
                    {book.thumbnail_url && !failedImages[book.id] ? (
                      <Image
                        src={book.thumbnail_url}
                        alt={`Cover of ${book.title}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-contain p-3"
                        unoptimized
                        onError={() =>
                          setFailedImages((current) => ({
                            ...current,
                            [book.id]: true,
                          }))
                        }
                      />
                    ) : (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 64 64"
                        fill="none"
                        className="h-16 w-16 text-[#0D8F91]"
                      >
                        <path
                          d="M32 13C24 9 16 9 7 12v38c9-3 17-3 25 1 8-4 16-4 25-1V12c-9-3-17-3-25 1Z"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M32 13v38"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        book.is_available
                          ? "bg-[#D9F0F1] text-[#08797B]"
                          : "bg-[#E8EDF0] text-[#526B7D]"
                      }`}
                    >
                      {book.is_available
                        ? "Available"
                        : "Checked out"}
                    </span>

                    <h3 className="mt-4 text-lg font-semibold leading-snug">
                      {book.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#526B7D]">
                      {book.author}
                    </p>
                    {book.isbn && (
                      <p className="mt-3 text-xs text-[#526B7D]">
                        ISBN {book.isbn}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleCheckout(book.id)}
                      disabled={
                        !book.is_available || processingId !== null
                      }
                      className="mt-5 w-full rounded-xl bg-[#0D8F91] px-4 py-3 text-sm font-semibold text-white hover:bg-[#08797B] disabled:cursor-not-allowed disabled:bg-[#DDE8EB] disabled:text-[#71818A]"
                    >
                      {processingId === book.id
                        ? "Checking out..."
                        : book.is_available
                          ? "Check out book"
                          : "Unavailable"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}