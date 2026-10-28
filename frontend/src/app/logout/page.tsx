"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LogoutPage() { 
    const router = useRouter();
    const [error, setError] = useState("");
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function handleSignOut() { 
        setError("");

        if (!supabase) { 
            setError("Authentication is not configured");
            return;
        }

        setIsSigningOut(true);

        try { 
            const { error: signOutError } = await supabase.auth.signOut({
               scope: "local", 
            });

            if (signOutError) { 
                setError("Counld not sign out. Please try again.");
                return;
            }

            router.replace("/login");
        } catch { 
            setError("Could not sign out. Please try again.");
        } finally { 
            setIsSigningOut(false);
        }
    }

    return (
        <main className = "flex min-h-screen flex-col items-center justify-center bg-[#E7F1F6] px-6 py-12 text-[#10263F]">
            <section className = "w-full max-w-md rounded-2xl border border-[#C9DEE6] bg-[#F4FAFC] p-8 text-center shadow-sm">
                <Image
                    src = "/libro_logo_white.png"
                    alt = "Libro Logo"
                    width = {88}
                    height = {88}
                    className = "mx-auto rounded-xl"
                    priority
                />

                <h1 className = "mt-6 text-3xl font-bold">Sign out of Libro?</h1>
                <p className = "mt-3 text-[#526B7D]">
                    You can sign back in whenever you&apos;re ready.
                </p>

                {error && (
                    <p role = "alert" className = "mt-5 text-sm text-red-700">
                        {error}
                    </p>
                )}

                <div className = "mt-8 flex flex-col gap-3">
                    <button
                        type = "button"
                        onClick = {handleSignOut}
                        disabled={isSigningOut}
                        className = "rounded-xl bg-[#0D8F91] px-5 py-3 font-semibold text-white hover:bg-[#0B7779] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSigningOut ? "Signing out..." : "Sign out"}
                    </button>

                    <Link 
                        href = "/dashboard"
                        className = "rounded-xl border border-[#C9DEE6] px-5 py-3 font-semibold hover:bg-[#E7F1F6]"
                    >
                        Cancel
                    </Link>
                </div>
            </section>
        </main>
    );
}
