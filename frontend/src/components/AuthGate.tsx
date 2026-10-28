"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

const publicRoutes = new Set(["/login", "/register"]);

export default function AuthGate({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let receivedAuthEvent = false;

    function updateSession(nextSession: Session | null) {
      if (!isMounted) return;

      if (nextSession?.user) {
        localStorage.setItem("libro_user_id", nextSession.user.id);
      } else {
        localStorage.removeItem("libro_user_id");
      }

      setSession(nextSession);
      setAuthError(null);
      setIsLoading(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true;
      updateSession(nextSession);
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted || receivedAuthEvent) return;

        if (error) {
          setAuthError(error.message);
          setIsLoading(false);
          return;
        }

        updateSession(data.session);
      })
      .catch((error: unknown) => {
        if (!isMounted || receivedAuthEvent) return;

        setAuthError(
          error instanceof Error ? error.message : "Unable to verify your session.",
        );
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isPublicRoute = publicRoutes.has(pathname);

  useEffect(() => {
    if (isLoading || authError) return;

    if (!session && !isPublicRoute) {
      router.replace("/login");
    } else if (session && isPublicRoute) {
      router.replace("/dashboard");
    }
  }, [authError, isLoading, isPublicRoute, router, session]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
        <p role="status">Checking your session...</p>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-slate-700">
        <p role="alert">Unable to verify your session: {authError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-500"
        >
          Retry
        </button>
      </main>
    );
  }

  if ((!session && !isPublicRoute) || (session && isPublicRoute)) {
    return null;
  }

  return (
    <>
      {session && !isPublicRoute && (
        <Navbar userEmail={session.user.email ?? null} />
      )}
      {children}
    </>
  );
}
