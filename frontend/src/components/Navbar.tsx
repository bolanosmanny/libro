"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navLinks = [
  { href: "/books", label: "Catalog" },
  { href: "/rooms", label: "Study rooms" },
  { href: "/occupancy", label: "Occupancy" },
  { href: "/study", label: "Study tools" },
  { href: "/dashboard", label: "Activity" },
];

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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/90 bg-[#faf9f6]/95 text-zinc-700 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8">
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex shrink-0 items-baseline gap-2"
        >
          <span className="text-xl font-semibold tracking-tight text-zinc-950">
            Libro
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400 sm:inline">
            Library system
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "font-medium text-zinc-950"
                    : "text-zinc-500 hover:text-zinc-950"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {userEmail && (
            <span className="max-w-40 truncate text-xs text-zinc-500">
              {userEmail}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
          >
            Log out
          </button>
          {logoutError && (
            <p role="alert" className="max-w-48 text-xs text-red-700">
              {logoutError}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-950 md:hidden"
        >
          {mobileMenuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-zinc-200 px-5 py-3 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={pathname === link.href ? "page" : undefined}
                className={`border-b border-zinc-100 py-3 text-sm ${
                  pathname === link.href
                    ? "font-medium text-zinc-950"
                    : "text-zinc-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-4 pt-3">
            <span className="truncate text-xs text-zinc-500">{userEmail}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-zinc-700"
            >
              Log out
            </button>
          </div>
          {logoutError && (
            <p role="alert" className="pt-2 text-xs text-red-700">
              {logoutError}
            </p>
          )}
        </div>
      )}
    </header>
  );
}
