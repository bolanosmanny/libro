"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "offline">("checking");

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("http://127.0.0.1:8000/", { cache: "no-store" });
        if (res.ok) {
          setBackendStatus("connected");
        } else {
          setBackendStatus("offline");
        }
      } catch {
        setBackendStatus("offline");
      }
    }
    checkHealth();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/books?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/books");
    }
  };

  const services = [
    {
      title: "Books & Catalog",
      description: "Search physical holdings, verify real-time copy availability, and check out books.",
      icon: "📖",
      href: "/books",
      tag: "Catalog Discovery",
      color: "from-blue-600 to-indigo-600",
      accent: "text-blue-600",
    },
    {
      title: "Study Rooms",
      description: "Reserve private & group study spaces with whiteboards, displays, and wheelchair accessibility.",
      icon: "🏛️",
      href: "/rooms",
      tag: "Room Booking",
      color: "from-teal-600 to-emerald-600",
      accent: "text-teal-600",
    },
    {
      title: "Crowd Meter",
      description: "Real-time library occupancy, floor-by-floor breakdown, and 6-hour busyness forecast.",
      icon: "📊",
      href: "/occupancy",
      tag: "Live Occupancy",
      color: "from-violet-600 to-purple-600",
      accent: "text-violet-600",
    },
    {
      title: "Study Tools & Pomodoro",
      description: "Customizable 25-minute Pomodoro intervals, gentle chime alerts, and daily study objectives.",
      icon: "⏱️",
      href: "/study",
      tag: "Productivity Aid",
      color: "from-indigo-600 to-purple-600",
      accent: "text-indigo-600",
    },
    {
      title: "Your Activity",
      description: "Manage checked-out books, upcoming due dates, and study room reservation cancellations.",
      icon: "📋",
      href: "/dashboard",
      tag: "Personal Dashboard",
      color: "from-amber-600 to-orange-600",
      accent: "text-amber-600",
    },
  ];

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#0c1929] py-16 text-white sm:py-24">
        {/* Background Image Overlay with Gradient */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/Addlestone.Library.jpg')] bg-cover bg-center opacity-25 mix-blend-luminosity"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#0c1929]/80 via-[#0c1929]/90 to-[#0c1929]"
        />

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold text-teal-300 backdrop-blur-md mb-6">
            <span>🏛️ College of Charleston Library System</span>
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            <span>Addlestone Library</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white">
            Find books. Reserve rooms. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-teal-300 via-cyan-200 to-blue-400 bg-clip-text text-transparent">
              Study better.
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
            A centralized service platform connecting students and patrons to library catalog holdings, study room reservations, and built-in academic productivity aids.
          </p>

          {/* Quick Catalog Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-2.5 sm:flex-row"
          >
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by book title, author, ISBN, or topic..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-400 shadow-inner outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-teal-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-400 active:scale-[0.98]"
            >
              Search Catalog
            </button>
          </form>

          {/* Service Highlights / Fast stats */}
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 border-t border-slate-800 pt-6 sm:grid-cols-4 text-left">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Catalog</p>
              <p className="mt-1 text-lg font-bold text-white">100% Digital</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Study Rooms</p>
              <p className="mt-1 text-lg font-bold text-white">Instant Booking</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Study Tools</p>
              <p className="mt-1 text-lg font-bold text-white">Pomodoro Timer</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Service Desk</p>
              <p className="mt-1 text-lg font-bold text-white">Open Today</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Service Grid */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:text-left sm:flex sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Library Patron Services
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Access all library resources and study aids from one unified dashboard.
            </p>
          </div>
          <div className="mt-3 sm:mt-0 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                backendStatus === "connected"
                  ? "bg-emerald-500"
                  : backendStatus === "checking"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-500"
              }`}
            />
            <span>
              {backendStatus === "connected"
                ? "Libro API Online"
                : backendStatus === "checking"
                ? "Connecting..."
                : "API Offline"}
            </span>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {item.tag}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-teal-600 group-hover:gap-2 transition-all">
                <span>Access Feature</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Library Hours & Patron Information */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="border-b border-slate-100 pb-4 md:border-b-0 md:border-r md:pr-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700">
                📍 Location
              </h4>
              <p className="mt-2 font-semibold text-slate-900">Marlene and Nathan Addlestone Library</p>
              <p className="text-xs text-slate-500 mt-1">
                205 Calhoun St, Charleston, SC 29401
              </p>
            </div>

            <div className="border-b border-slate-100 pb-4 md:border-b-0 md:border-r md:pr-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700">
                ⏰ Operating Hours
              </h4>
              <p className="mt-2 font-semibold text-slate-900">Monday – Thursday: 7:30 AM – Midnight</p>
              <p className="text-xs text-slate-500 mt-1">
                Friday: 7:30 AM – 6:00 PM • Weekend: 10:00 AM – 10:00 PM
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700">
                💬 Need Assistance?
              </h4>
              <p className="mt-2 font-semibold text-slate-900">Access Services Desk</p>
              <p className="text-xs text-slate-500 mt-1">
                Circulation, reserves, and technology loan support on the 1st floor.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
