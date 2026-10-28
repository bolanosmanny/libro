import Link from "next/link";
import ReserveRoomsMap from "@/components/reserve-rooms-map";

export default function ReserveRoomsPage() {
  return (
    <main className="min-h-screen bg-[#E7F1F6] px-5 py-8 text-[#10263F] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#526B7D] hover:text-[#10263F]"
        >
          <span aria-hidden="true">←</span> Back to dashboard
        </Link>
        <header className="mb-7 mt-7 border-b border-[#C9DEE6] pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#526B7D]">
            Addlestone Library
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Reserve a study room
          </h1>
        </header>
        <ReserveRoomsMap />
      </div>
    </main>
  );
}
