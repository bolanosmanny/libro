"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const services = [
  {
    number: "01",
    title: "Books & catalog",
    description:
      "Search library holdings, review availability, and manage checked-out books.",
    href: "/books",
    label: "Browse collection",
  },
  {
    number: "02",
    title: "Study rooms",
    description:
      "Find a focused individual space or reserve a room for group work.",
    href: "/rooms",
    label: "Find a room",
  },
  {
    number: "03",
    title: "Library occupancy",
    description:
      "Review current conditions by floor and explore the occupancy forecast.",
    href: "/occupancy",
    label: "View conditions",
  },
  {
    number: "04",
    title: "Study tools",
    description:
      "Plan a focused session with an interval timer and a simple task list.",
    href: "/study",
    label: "Open study tools",
  },
  {
    number: "05",
    title: "Your activity",
    description:
      "Keep track of active loans, upcoming reservations, and study objectives.",
    href: "/dashboard",
    label: "Review activity",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "connected" | "offline"
  >("checking");

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("http://127.0.0.1:8000/", {
          cache: "no-store",
        });
        setBackendStatus(res.ok ? "connected" : "offline");
      } catch {
        setBackendStatus("offline");
      }
    }

    checkHealth();
  }, []);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/books?q=${encodeURIComponent(query)}` : "/books");
  };

  return (
    <main className="min-h-screen bg-[#faf9f6] text-zinc-900">
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-16 sm:px-8 sm:pb-20 sm:pt-24">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
              College of Charleston · Addlestone Library
            </p>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  backendStatus === "connected"
                    ? "bg-emerald-700"
                    : backendStatus === "checking"
                      ? "animate-pulse bg-amber-600"
                      : "bg-zinc-400"
                }`}
              />
              <span>
                {backendStatus === "connected"
                  ? "Systems operational"
                  : backendStatus === "checking"
                    ? "Connecting"
                    : "Service unavailable"}
              </span>
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
                Library services, in one place
              </p>
              <h1 className="max-w-3xl text-5xl font-medium leading-[1.02] tracking-tight text-zinc-950 sm:text-7xl">
                Make room
                <br />
                for better work.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-zinc-600">
                Find resources, plan your visit, and settle into a more
                intentional study routine at Addlestone Library.
              </p>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="border-t border-zinc-300 pt-5"
            >
              <label
                htmlFor="catalog-search"
                className="mb-3 block font-mono text-xs uppercase tracking-wider text-zinc-500"
              >
                Search the collection
              </label>
              <div className="flex gap-3">
                <input
                  id="catalog-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Title, author, ISBN…"
                  className="min-w-0 flex-1 border-b border-zinc-400 bg-transparent px-0 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-950"
                />
                <button
                  type="submit"
                  className="border-b border-zinc-900 px-1 py-2 text-sm font-medium text-zinc-900 transition-colors hover:text-zinc-500"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
              Explore
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-tight text-zinc-950">
              Library services
            </h2>
          </div>
          <span className="hidden font-mono text-xs tabular-nums text-zinc-400 sm:inline">
            05 SERVICES
          </span>
        </div>

        <div className="border-t border-zinc-300">
          {services.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              className="group grid gap-2 border-b border-zinc-200 py-5 transition-colors hover:bg-white/60 sm:grid-cols-[4rem_1fr_auto] sm:items-center sm:gap-6 sm:px-3"
            >
              <span className="font-mono text-xs tabular-nums text-zinc-400">
                {service.number}
              </span>
              <span>
                <span className="block text-lg font-medium tracking-tight text-zinc-900 group-hover:text-zinc-600">
                  {service.title}
                </span>
                <span className="mt-1 block max-w-2xl text-sm leading-6 text-zinc-500">
                  {service.description}
                </span>
              </span>
              <span className="text-sm text-zinc-500 transition-colors group-hover:text-zinc-950 sm:text-right">
                {service.label} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-200">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3 sm:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
              Location
            </p>
            <p className="mt-3 text-sm font-medium text-zinc-900">
              Marlene and Nathan Addlestone Library
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              205 Calhoun St, Charleston, SC 29401
            </p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
              Hours
            </p>
            <p className="mt-3 text-sm font-medium text-zinc-900">
              Monday – Thursday · 7:30 AM – Midnight
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Friday · 7:30 AM – 6:00 PM · Weekend · 10:00 AM – 10:00 PM
            </p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
              Support
            </p>
            <p className="mt-3 text-sm font-medium text-zinc-900">
              Access Services Desk
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Circulation, reserves, and technology loans on the first floor.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
