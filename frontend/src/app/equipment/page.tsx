"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const API_BASE = "http://127.0.0.1:8000";

type Equipment = {
  id: string;
  name: string;
  location: string;
  total_count: number;
  available_count: number;
};

type Inventory =
  | { status: "loading" }
  | { status: "live"; items: Equipment[] }
  | { status: "error" };

const equipmentIcons = [
  { match: /marker/i, path: "m4 16 11-11a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L8 20H4v-4Zm8-8 4 4M4 20l-1 1h8" },
  { match: /whiteboard/i, path: "M3 4h18v12H3zM12 16v5m-5 0 5-4 5 4M7 8h7m-7 4h4" },
  { match: /calculator/i, path: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 4h8v3H8zM8 14h1m6 0h1m-8 3h1m6 0h1" },
  { match: /lightning/i, path: "m13 2-8 12h6l-1 8 9-12h-6l1-8z" },
  { match: /laptop/i, path: "M4 16V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v10M4 16h16l2 3H2l2-3Zm9-9-3 4h3l-1 3" },
  { match: /usb|charger|adapter/i, path: "M9 3h6v4H9zm-1 4h8v6a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2zm4 8v3a3 3 0 0 0 3 3h3" },
];
const defaultIcon = "M4 7h16v13H4zM3 4h18v3H3zm6 7h6";

function EquipmentIcon({ name }: { name: string }) {
  const icon = equipmentIcons.find(({ match }) => match.test(name));

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D9F0F1] text-[#0D686A]">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={icon?.path ?? defaultIcon} />
      </svg>
    </span>
  );
}

export default function EquipmentPage() {
  const [inventory, setInventory] = useState<Inventory>({ status: "loading" });
  const [request, setRequest] = useState(0);
  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadInventory() {
      try {
        const response = await fetch(`${API_BASE}/api/equipment`, {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(8000),
          ]),
        });
        if (!response.ok) throw new Error("Inventory unavailable");

        const items: Equipment[] = await response.json();
        if (!Array.isArray(items)) throw new Error("Invalid inventory response");

        if (!controller.signal.aborted) {
          setInventory({ status: "live", items });
        }
      } catch {
        if (!controller.signal.aborted) {
          setInventory({ status: "error" });
        }
      }
    }

    void loadInventory();
    return () => controller.abort();
  }, [request]);

  const items = inventory.status === "live" ? inventory.items : [];
  const search = query.trim().toLowerCase();
  const results = items.filter(
    (item) =>
      (!availableOnly || item.available_count > 0) &&
      `${item.name} ${item.location}`.toLowerCase().includes(search)
  );

  async function handleCheckout(item: Equipment) {
    if (!supabase) {
      setCheckoutError("Authentication is not configured.");
      return;
    }

    setCheckoutId(item.id);
    setCheckoutError("");
    setCheckoutMessage("");

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        throw new Error("Log in before checking out equipment.");
      }

      const response = await fetch(`${API_BASE}/api/equipment/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ equipment_id: item.id }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.detail ?? "Could not check out equipment.");
      }

      setCheckoutMessage(
        `${item.name} checked out. You can return it from Your Activity on the dashboard.`
      );
      setInventory((current) =>
        current.status === "live"
          ? {
              status: "live",
              items: current.items.map((entry) =>
                entry.id === item.id
                  ? {
                      ...entry,
                      available_count: Math.max(0, entry.available_count - 1),
                    }
                  : entry
              ),
            }
          : current
      );
      setRequest((current) => current + 1);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Could not check out equipment."
      );
    } finally {
      setCheckoutId(null);
    }
  }

  function refreshInventory() {
    setInventory({ status: "loading" });
    setRequest((current) => current + 1);
  }

  return (
    <main className="min-h-screen bg-[#E7F1F6] px-5 py-8 text-[#10263F] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#526B7D] hover:text-[#10263F]"
        >
          ← Back to dashboard
        </Link>

        <header className="my-7 border-b border-[#C9DEE6] pb-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Equipment Availability
          </h1>
          <p className="mt-2 text-[#526B7D]">
            Check availability and borrow equipment from the library.
          </p>
        </header>

        {checkoutError && (
          <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {checkoutError}
          </p>
        )}
        {checkoutMessage && (
          <p role="status" className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
            {checkoutMessage}{" "}
            <Link href="/dashboard#activity" className="font-semibold underline">
              View activity
            </Link>
          </p>
        )}

        <section
          aria-label="Equipment inventory"
          className="rounded-2xl border border-[#C9DEE6] bg-[#F4FAFC] p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <label className="flex w-full max-w-md flex-col gap-2 text-sm font-medium">
              Search equipment
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by item or location"
                className="rounded-lg border border-[#A9C5D0] bg-white px-3 py-2.5"
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(event) => setAvailableOnly(event.target.checked)}
                className="h-4 w-4 accent-[#0D686A]"
              />
              Available only
            </label>
            <button
              type="button"
              onClick={refreshInventory}
              className="rounded-lg border border-[#0D8F91] px-4 py-2 text-sm font-semibold text-[#08797A] hover:bg-[#D9F0F1]"
            >
              Refresh availability
            </button>
          </div>

          {inventory.status === "loading" ? (
            <p role="status" className="mt-6 text-sm text-[#526B7D]">
              Loading equipment inventory…
            </p>
          ) : inventory.status === "error" ? (
            <p role="alert" className="mt-6 text-sm text-red-700">
              Could not load equipment inventory. Try refreshing.
            </p>
          ) : (
            <>
              <p role="status" className="mb-3 mt-6 text-sm text-[#526B7D]">
                {results.length} {results.length === 1 ? "item" : "items"}
              </p>
              {results.length > 0 ? (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-[#C9DEE6] bg-white p-4"
                    >
                      <div className="flex items-start gap-3">
                        <EquipmentIcon name={item.name} />
                        <div>
                          <h2 className="font-semibold">{item.name}</h2>
                          <p className="mt-1 text-sm text-[#526B7D]">
                            {item.location}
                          </p>
                        </div>
                      </div>
                      <p className={`mt-4 text-sm font-semibold ${item.available_count > 0 ? "text-[#0D686A]" : "text-[#526B7D]"}`}>
                        {item.available_count} of {item.total_count} available
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleCheckout(item)}
                        disabled={item.available_count === 0 || checkoutId !== null}
                        className="mt-3 rounded-lg bg-[#0D8F91] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08797A] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {checkoutId === item.id
                          ? "Checking out..."
                          : item.available_count === 0
                            ? "Unavailable"
                            : "Check out"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-[#C9DEE6] bg-white p-4 text-sm text-[#526B7D]">
                  {items.length === 0
                    ? "No equipment has been listed yet."
                    : "No equipment matches your search and filters."}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}