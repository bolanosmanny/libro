"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  is_available: boolean;
  call_number?: string;
  location?: string;
  description?: string;
}

export default function BooksPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "checked_out">("all");
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/books");
      if (!res.ok) throw new Error(`Server status ${res.status}`);
      const data = await res.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("Could not load library catalog holdings.");
    } finally {
      setLoading(false);
    }
  }

  const handleCheckout = async (book: Book) => {
    setProcessingId(book.id);
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
          book_id: book.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to checkout book");
      }

      setMessage(`"${book.title}" was checked out successfully! Due back in 14 days.`);
      if (selectedBookForDetails?.id === book.id) {
        setSelectedBookForDetails(null);
      }
      await fetchBooks();
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Could not complete checkout.");
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered books based on Search query & Availability Filter
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.isbn.toLowerCase().includes(q) ||
        (book.call_number && book.call_number.toLowerCase().includes(q));

      // 2. Availability Filter
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && book.is_available) ||
        (availabilityFilter === "checked_out" && !book.is_available);

      return matchesQuery && matchesAvailability;
    });
  }, [books, searchQuery, availabilityFilter]);

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📖</span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Library Books & Catalog
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Browse physical holdings at Addlestone Library, check stack locations, and manage loans.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span>📋 View Your Activity</span>
            <span>→</span>
          </Link>
        </div>

        {/* Action / Success Banner */}
        {message && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>{message}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-bold text-red-600 hover:text-red-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog by title, author name, or ISBN..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setAvailabilityFilter("all")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  availabilityFilter === "all"
                    ? "bg-white font-bold text-slate-900 shadow-sm"
                    : "hover:text-slate-900"
                }`}
              >
                All Holdings ({books.length})
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter("available")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  availabilityFilter === "available"
                    ? "bg-white font-bold text-emerald-700 shadow-sm"
                    : "hover:text-slate-900"
                }`}
              >
                Available ({books.filter((b) => b.is_available).length})
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter("checked_out")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  availabilityFilter === "checked_out"
                    ? "bg-white font-bold text-slate-900 shadow-sm"
                    : "hover:text-slate-900"
                }`}
              >
                Checked Out ({books.filter((b) => !b.is_available).length})
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
              />
            ))}
          </div>
        )}

        {/* Zero Results State (Alternative Path 3a) */}
        {!loading && filteredBooks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <span className="text-4xl">📚</span>
            <h3 className="mt-3 text-base font-semibold text-slate-900">
              No resources found matching your search
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Try refining your keywords, checking the spelling, or clearing filters.
            </p>
            {(searchQuery || availabilityFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setAvailabilityFilter("all");
                }}
                className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Reset Search & Filters
              </button>
            )}
          </div>
        )}

        {/* Books Cards Grid */}
        {!loading && filteredBooks.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBooks.map((book) => {
              const isProcessing = processingId === book.id;
              return (
                <div
                  key={book.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                >
                  <div>
                    {/* Top Status & Cover Placeholder */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-sm">
                        <span className="text-base font-bold">📖</span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          book.is_available
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            book.is_available ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        <span>{book.is_available ? "Available" : "Checked Out"}</span>
                      </span>
                    </div>

                    {/* Book Metadata */}
                    <h3 className="mt-4 font-bold text-slate-900 line-clamp-2 text-base leading-snug group-hover:text-teal-700 transition-colors">
                      {book.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">by {book.author}</p>

                    <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <p className="flex justify-between">
                        <span>ISBN:</span>
                        <span className="font-mono text-slate-700">{book.isbn}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Call Number:</span>
                        <span className="font-mono text-slate-700">
                          {book.call_number || `QA 76.73 .${book.isbn.slice(-4)}`}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span>Location:</span>
                        <span className="text-slate-700">
                          {book.location || "Addlestone 2nd Floor Stacks"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedBookForDetails(book)}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Details
                    </button>

                    {book.is_available ? (
                      <button
                        type="button"
                        onClick={() => handleCheckout(book)}
                        disabled={isProcessing}
                        className="flex-1 rounded-xl bg-teal-600 py-2 text-center text-xs font-bold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
                      >
                        {isProcessing ? "Processing..." : "Checkout Book"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex-1 rounded-xl bg-slate-100 py-2 text-center text-xs font-semibold text-slate-400 cursor-not-allowed"
                      >
                        Unavailable
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Book Record Modal */}
        {selectedBookForDetails && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedBookForDetails(null);
            }}
          >
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block rounded-md bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-700">
                    Resource Record
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">
                    {selectedBookForDetails.title}
                  </h3>
                  <p className="text-xs text-slate-500">by {selectedBookForDetails.author}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBookForDetails(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="font-semibold text-slate-700">ISBN-13:</span>
                  <span className="font-mono">{selectedBookForDetails.isbn}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="font-semibold text-slate-700">Physical Call Number:</span>
                  <span className="font-mono">
                    {selectedBookForDetails.call_number || `QA 76.73 .${selectedBookForDetails.isbn.slice(-4)}`}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="font-semibold text-slate-700">Library Location:</span>
                  <span>{selectedBookForDetails.location || "Addlestone Library • 2nd Floor Stacks"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-semibold text-slate-700">Current Status:</span>
                  <span
                    className={`font-bold ${
                      selectedBookForDetails.is_available ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {selectedBookForDetails.is_available ? "Available for Loan" : "Checked Out by Patron"}
                  </span>
                </div>
              </div>

              <div className="mt-4 text-xs leading-relaxed text-slate-500">
                {selectedBookForDetails.description ||
                  "This resource is part of the general circulating collection. Standard checkout period is 14 days for students and faculty."}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookForDetails(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                {selectedBookForDetails.is_available && (
                  <button
                    type="button"
                    onClick={() => handleCheckout(selectedBookForDetails)}
                    disabled={processingId === selectedBookForDetails.id}
                    className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50"
                  >
                    {processingId === selectedBookForDetails.id ? "Processing..." : "Checkout (14 Days)"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
