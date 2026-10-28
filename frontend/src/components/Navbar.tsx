"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Navbar({ userEmail }: { userEmail: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [logoutError, setLogoutError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setLogoutError("");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setLogoutError(error.message);
        return;
      }

      setMobileMenuOpen(false);
      router.push("/login");
    } catch (error: unknown) {
      setLogoutError(
        error instanceof Error ? error.message : "Unable to log out.",
      );
    }
  };

  const navLinks = [
    { href: "/books", label: "Books & Catalog", icon: "📖" },
    { href: "/rooms", label: "Study Rooms", icon: "🏛️" },
    { href: "/occupancy", label: "Crowd Meter", icon: "📊" },
    { href: "/study", label: "Study Tools", icon: "⏱️" },
    { href: "/dashboard", label: "Your Activity", icon: "📋" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0c1929]/95 backdrop-blur-md text-white transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo & Title */}
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="group flex items-center gap-3 transition-opacity hover:opacity-95"
        >
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 p-1 shadow-md shadow-blue-500/20">
            <Image
              src="/libro_transparent_logo.png"
              alt="Libro"
              width={32}
              height={32}
              className="h-auto w-auto object-contain brightness-125"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-teal-300 transition-colors">
              Libro
            </span>
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
              Library Portal
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-slate-800/80 text-teal-300 shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <span className="text-sm">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop User Account State */}
        <div className="hidden items-center gap-3 md:flex">
          {userEmail ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="max-w-[150px] truncate">{userEmail}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500 hover:text-white"
              >
                Log Out
              </button>
              {logoutError && (
                <p role="alert" className="max-w-48 text-xs text-red-300">
                  {logoutError}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3.5 py-1.5 text-sm font-semibold text-slate-300 transition-colors hover:text-white hover:bg-slate-800/50"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-teal-500 px-3.5 py-1.5 text-sm font-semibold text-slate-950 shadow-md shadow-teal-500/20 transition-all hover:bg-teal-400"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white md:hidden"
        >
          {mobileMenuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-800 bg-[#0c1929] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1 pb-3 border-b border-slate-800">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active
                      ? "bg-slate-800 text-teal-300 font-semibold"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-3">
            {userEmail ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-2 text-xs text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="truncate">{userEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-lg bg-red-500/10 border border-red-500/20 py-2 text-center text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white"
                >
                  Log Out
                </button>
                {logoutError && (
                  <p role="alert" className="text-xs text-red-300">
                    {logoutError}
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg border border-slate-700 py-2 text-center text-sm font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg bg-teal-500 py-2 text-center text-sm font-semibold text-slate-950 hover:bg-teal-400"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
