import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() { 
    const inputStyle = "mt-2 w-full rounded-xl border border-slate-500 bg-slate-700/50 px-4  py-3 text-white outline-none placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30";

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-200 p-4 sm:p-8">
            <div className = "grid w-full max-w-6xl overflow-hidden rounded-3xl bg-[#10263f] text-white shadow-2xl lg:min-h-[760px] lg:grid-cols-2">
                {/* Visual Panel */}
                <section className = "relative hidden flex-col justify-between bg-gradient-to-br from-[#174d70] via-[#126477] to-[#10263f] p-10 lg:flex">
                    <div className = "flex items-start justify-between">
                        <Link href = "/" className = "inline-block rounded-xl bg-transparent p-2">
                            <Image
                                src ="/libro_transparent_logo.png"
                                alt = "Libro Logo"
                                width = {104}
                                height = {106}
                                className = "h-auto w-[104px] rounded-md"
                                priority
                            />
                        </Link>

                        <Link
                            href="/"
                            className = "rounded-full bg-white/15 px-4 py-2 text-sm hover:bg-white/25"
                        >
                            ← Back to Libro
                        </Link>
                    </div>

                    <p className = "max-w-md text-4xl font-semibold leading-tight">
                        Find books, Reserve rooms, and Study better.
                    </p>
                </section>

                {/* Registration Panel */}
                <section className = "flex flex-col justify-center p-7 sm:p-12 lg:p-16">
                    <Link
                        href="/"
                        className = "mb-12 inline-block self-start rounded-xl bg-transparent p-2 lg:hidden"
                    >
                        <Image
                            src = "/libro_transparent_logo.png"
                            alt = "Libro"
                            width = {84}
                            height = {86}
                            className = "h-auto w-[84px] rounded-md"
                            priority
                        />
                    </Link>

                    <h1 className = "text-4xl font-semibold tracking-tight sm:text-5xl">
                        Create an account
                    </h1>

                    <p className = "mt-5 text-slate-300">
                        Already have an account?{" "}
                        <Link 
                            href="/login"
                            className = "font-medium text-amber-300 underline underline-offset-4"
                        >
                            Log In
                        </Link>
                    </p>

                    <form className = "mt-12 space-y-6">
                        <div className = "grid gap-6 sm:grid-cols-2">
                            <label className = "block text-sm">
                                First name
                                <input 
                                    className = {inputStyle}
                                    type="text"
                                    name="firstName"
                                    autoComplete="given-name"
                                />
                            </label>

                            <label className = "block text-sm">
                                Last name
                                <input 
                                    className = {inputStyle}
                                    type="text"
                                    name="lastName"
                                    autoComplete="family-name"
                                />
                            </label>
                        </div>

                            <label className = "block text-sm">
                                Email address
                                <input 
                                    className = {inputStyle}
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                />
                            </label>

                            <label className = "block text-sm">
                                Password
                                <input 
                                    className = {inputStyle}
                                    type="password"
                                    name="password"
                                    autoComplete="new-password"
                                />
                            </label>

                            <button 
                                type="button"
                                className = "w-full rounded-xl bg-teal-500 px-4 py-4 font-semibold text-white"
                            >
                                Create Account
                            </button>
                    </form>
                </section>
            </div>
        </main>
    );
}
