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
    <main className="min-h-screen bg-[#faf9f6] px-5 py-10 text-zinc-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-5 border-b border-zinc-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">Collection</p>
            <h1 className="text-4xl font-medium tracking-tight text-zinc-950 sm:text-5xl">
              Books &amp; catalog
            </h1>
            <p className="mt-3 text-sm text-zinc-500">
              Browse physical holdings at Addlestone Library, check stack locations, and manage loans.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="self-start border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-500 hover:text-zinc-950"
          >
            View activity <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Action / Success Banner */}
        {message && (
          <div className="mb-6 flex items-center justify-between border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-800">
            <div className="flex items-center gap-2">
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
          <div className="mb-6 flex items-center justify-between border border-red-200 bg-white px-4 py-3 text-sm text-red-800">
            <div className="flex items-center gap-2">
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
        <div className="mb-8 border-y border-zinc-200 bg-white px-4 py-5 sm:px-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                ⌕
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog by title, author name, or ISBN..."
                className="w-full border-b border-zinc-300 bg-transparent py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-900"
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
            <div className="flex items-center gap-4 self-start text-xs font-medium text-zinc-500 sm:self-auto">
              <button
                type="button"
                onClick={() => setAvailabilityFilter("all")}
                className={`border-b py-2 transition ${
                  availabilityFilter === "all"
                    ? "border-zinc-900 text-zinc-950"
                    : "border-transparent hover:text-zinc-900"
                }`}
              >
                All Holdings ({books.length})
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter("available")}
                className={`border-b py-2 transition ${
                  availabilityFilter === "available"
                    ? "border-zinc-900 text-zinc-950"
                    : "border-transparent hover:text-zinc-900"
                }`}
              >
                Available ({books.filter((b) => b.is_available).length})
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter("checked_out")}
                className={`border-b py-2 transition ${
                  availabilityFilter === "checked_out"
                    ? "border-zinc-900 text-zinc-950"
                    : "border-transparent hover:text-zinc-900"
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
                className="h-20 animate-pulse border-b border-zinc-200 bg-white"
              />
            ))}
          </div>
        )}

        {/* Zero Results State (Alternative Path 3a) */}
        {!loading && filteredBooks.length === 0 && (
          <div className="border-y border-zinc-200 bg-white p-12 text-center">
            <h3 className="text-base font-medium text-zinc-900">
              No resources found matching your search
            </h3>
            <p className="mt-2 text-xs text-zinc-500">
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
          <div className="divide-y divide-zinc-200 border-y border-zinc-200 bg-white">
            {filteredBooks.map((book) => {
              const isProcessing = processingId === book.id;
              return (
                <div
                  key={book.id}
                  className="group grid gap-5 px-5 py-5 transition-colors hover:bg-zinc-50/70 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <span
                      className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider ${
                        book.is_available ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        book.is_available ? "bg-emerald-700" : "bg-amber-700"
                      }`} />
                      {book.is_available ? "Available" : "Checked out"}
                    </span>

                    {/* Book Metadata */}
                    <h3 className="mt-2 text-lg font-medium leading-snug tracking-tight text-zinc-950 transition-colors">
                      {book.title}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">{book.author}</p>

                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
                      <p>
                        <span className="mr-2">ISBN</span>
                        <span className="font-mono tabular-nums text-zinc-700">{book.isbn}</span>
                      </p>
                      <p>
                        <span className="mr-2">Call no.</span>
                        <span className="font-mono text-zinc-700">
                          {book.call_number || `QA 76.73 .${book.isbn.slice(-4)}`}
                        </span>
                      </p>
                      <p>
                        <span className="mr-2">Location</span>
                        <span className="text-zinc-700">
                          {book.location || "Addlestone 2nd Floor Stacks"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:w-56">
                    <button
                      type="button"
                      onClick={() => setSelectedBookForDetails(book)}
                      className="flex-1 border border-zinc-300 py-2 text-center text-xs font-medium text-zinc-700 transition hover:border-zinc-500"
                    >
                      Details
                    </button>

                    {book.is_available ? (
                      <button
                        type="button"
                        onClick={() => handleCheckout(book)}
                        disabled={isProcessing}
                        className="flex-1 border border-zinc-900 bg-zinc-900 py-2 text-center text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {isProcessing ? "Processing..." : "Checkout Book"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex-1 border border-zinc-200 py-2 text-center text-xs font-medium text-zinc-400 cursor-not-allowed"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedBookForDetails(null);
            }}
          >
            <div className="w-full max-w-lg border border-zinc-200 bg-[#faf9f6] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Resource Record
                  </span>
                  <h3 className="mt-2 text-xl font-medium tracking-tight text-zinc-950">
                    {selectedBookForDetails.title}
                  </h3>
                  <p className="text-xs text-zinc-500">{selectedBookForDetails.author}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBookForDetails(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 space-y-2 border-y border-zinc-200 bg-white p-4 text-xs text-zinc-600">
                <div className="flex justify-between border-b border-zinc-200 py-1">
                  <span className="text-zinc-700">ISBN-13:</span>
                  <span className="font-mono">{selectedBookForDetails.isbn}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 py-1">
                  <span className="text-zinc-700">Physical call number:</span>
                  <span className="font-mono">
                    {selectedBookForDetails.call_number || `QA 76.73 .${selectedBookForDetails.isbn.slice(-4)}`}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 py-1">
                  <span className="text-zinc-700">Library location:</span>
                  <span>{selectedBookForDetails.location || "Addlestone Library • 2nd Floor Stacks"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-700">Current status:</span>
                  <span
                    className={`font-bold ${
                      selectedBookForDetails.is_available ? "text-emerald-800" : "text-amber-800"
                    }`}
                  >
                    {selectedBookForDetails.is_available ? "Available for Loan" : "Checked Out by Patron"}
                  </span>
                </div>
              </div>

              <div className="mt-4 text-xs leading-relaxed text-zinc-500">
                {selectedBookForDetails.description ||
                  "This resource is part of the general circulating collection. Standard checkout period is 14 days for students and faculty."}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookForDetails(null)}
                  className="border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-500"
                >
                  Close
                </button>
                {selectedBookForDetails.is_available && (
                  <button
                    type="button"
                    onClick={() => handleCheckout(selectedBookForDetails)}
                    disabled={processingId === selectedBookForDetails.id}
                    className="border border-zinc-900 bg-zinc-900 px-5 py-2 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
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
