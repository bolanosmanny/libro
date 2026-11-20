"use client";
import BookCover from "@/components/book-cover";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  thumbnail_url?: string | null;
  is_available: boolean;
  description?: string | null;
  categories?: string[] | null;
  average_rating?: number | null;
  ratings_count?: number | null;
  cover_url?: string | null;
};

const API_BASE = "http://127.0.0.1:8000";

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBook() {
      try {
        const response = await fetch(`${API_BASE}/api/books/${id}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Book not found."
              : "Could not load this book."
          );
        }

        const data: Book = await response.json();
        if (!controller.signal.aborted) setBook(data);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error ? caught.message : "Could not load this book."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadBook();
    return () => controller.abort();
  }, [id]);

  async function handleCheckout() {
    if (!book || checkingOut) return;

    setCheckingOut(true);
    setError(null);
    setMessage(null);

    try {
      if (!supabase) throw new Error("Authentication is not configured.");

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        throw new Error("Log in before checking out a book.");
      }

      const response = await fetch(`${API_BASE}/api/books/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ book_id: book.id }),
      });

      const result: { detail?: string } =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.detail ?? "Could not check out this book.");
      }

      setBook((current) =>
        current ? { ...current, is_available: false } : current
      );
      setMessage("Book checked out. You can view it on your dashboard.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not check out this book."
      );
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#E7F1F6] px-5 py-8 text-[#10263F] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/books"
          className="text-sm font-medium text-[#0D8F91] hover:underline"
        >
          ← Back to books
        </Link>

        {loading && (
          <p role="status" className="mt-10 text-[#526B7D]">
            Loading book...
          </p>
        )}

        {!loading && !book && (
          <p role="alert" className="mt-10 text-red-700">
            {error ?? "Book not found."}
          </p>
        )}

        {book && (
          <>
            <div className="mt-7 grid gap-8 rounded-2xl border border-[#C9DEE6] bg-[#F4FAFC] p-6 shadow-sm md:grid-cols-[260px_1fr] md:gap-10 md:p-9">
              <div className="relative mx-auto aspect-[2/3] w-full max-w-[260px] overflow-hidden rounded-xl bg-[#D7E8EF] shadow-md">
                <BookCover
                  key={`${book.id}:${book.cover_url ?? ""}`}
                  title={book.title}
                  coverUrl={book.cover_url}
                  thumbnailUrl={book.thumbnail_url}
                  sizes="260px"
                />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-[#0D8F91]">
                  Libro catalog
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {book.title}
                </h1>
                <p className="mt-2 text-lg text-[#526B7D]">by {book.author}</p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      book.is_available
                        ? "bg-[#D9F0F1] text-[#08797B]"
                        : "bg-[#E8EDF0] text-[#526B7D]"
                    }`}
                  >
                    {book.is_available ? "Available" : "Checked out"}
                  </span>

                  {typeof book.average_rating === "number" && (
                    <span className="text-sm text-[#526B7D]">
                      ★ {book.average_rating.toFixed(1)} / 5 Google Books rating
                      {book.ratings_count
                        ? ` (${book.ratings_count} ratings)`
                        : ""}
                    </span>
                  )}
                </div>

                {book.categories && book.categories.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {book.categories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full border border-[#C9DEE6] px-3 py-1 text-sm text-[#526B7D]"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}

                <section className="mt-7">
                  <h2 className="text-xl font-semibold">About this book</h2>
                  <p className="mt-3 whitespace-pre-line leading-7 text-[#526B7D]">
                    {book.description || "A summary is not available for this book yet."}
                  </p>
                </section>

                {book.isbn && (
                  <p className="mt-6 text-sm text-[#526B7D]">
                    ISBN: {book.isbn}
                  </p>
                )}

                {message && (
                  <p role="status" className="mt-5 text-sm text-green-800">
                    {message}
                  </p>
                )}
                {error && (
                  <p role="alert" className="mt-5 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handleCheckout()}
                  disabled={!book.is_available || checkingOut}
                  className="mt-7 rounded-xl bg-[#0D8F91] px-7 py-3 font-semibold text-white hover:bg-[#08797B] disabled:cursor-not-allowed disabled:bg-[#DDE8EB] disabled:text-[#71818A]"
                >
                  {checkingOut
                    ? "Checking out..."
                    : book.is_available
                      ? "Check out book"
                      : "Unavailable"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}