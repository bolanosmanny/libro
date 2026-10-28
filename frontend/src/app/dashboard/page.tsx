import Image from "next/image";
import Link from "next/link";

type IconName = "dashboard" | "books" | "rooms" | "availability" | "activity";

const dashboardSections: {
  id: string;
  title: string;
  description: string;
  icon: IconName;
}[] = [
  {
    id: "books",
    title: "Books",
    description:
      "Search and explore a wide range of books available in our collection.",
    icon: "books",
  },
  {
    id: "study-rooms",
    title: "Reserve Rooms",
    description:
      "Reserve study rooms for group discussions or individual study sessions.",
    icon: "rooms",
  },
  {
    id: "availability",
    title: "Library Availability",
    description:
      "Check the availability of library resources and facilities when available.",
    icon: "availability",
  },
];

function DashboardIcon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      {name === "dashboard" && (
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
      )}

      {name === "books" && (
        <>
          <path d="M12 7C9.5 5.5 7 5 3 6v13c4-1 6.5-.5 9 1 2.5-1.5 5-2 9-1V6c-4-1-6.5-.5-9 1Z" />
          <path d="M12 7v13" />
        </>
      )}

      {name === "rooms" && (
        <>
          <circle cx="8" cy="8" r="3" />
          <circle cx="17" cy="9" r="2" />
          <path d="M2 20v-2a6 6 0 0 1 12 0v2M15 16a5 5 0 0 1 7 4" />
        </>
      )}

      {name === "availability" && (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4M17 3v4M3 10h18M8 15h3" />
        </>
      )}

      {name === "activity" && (
        <>
          <path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7" />
        </>
      )}
    </svg>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#E7F1F6] text-[#10263F] lg:flex">
      <aside className="border-b border-[#C9DEE6] bg-[#D7E8EF] px-6 py-4 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-5 lg:py-8">
        <Link href="/" aria-label="Libro home" className="inline-block">
          <Image
            src="/libro_logo_white.png"
            alt="Libro"
            width={96}
            height={96}
            className="h-20 w-20 object-cover"
            priority
          />
        </Link>

        <nav
          aria-label="Dashboard sections"
          className="mt-5 flex gap-2 overflow-x-auto pb-2 lg:mt-10 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0"
        >
          <Link
            href="/dashboard"
            aria-current="page"
            className="flex shrink-0 items-center gap-3 rounded-md bg-[#C3E6EB] px-4 py-3 font-semibold text-[#10263F]"
          >
            <DashboardIcon name="dashboard" />
            Dashboard
          </Link>

          {dashboardSections.map((section) =>
            section.id === "study-rooms" ? (
              <Link
                key={section.id}
                href="/dashboard/reserve-rooms"
                className="flex shrink-0 items-center gap-3 rounded-md px-4 py-3 text-[#526B7D] hover:bg-[#C3E6EB] hover:text-[#10263F]"
              >
                <DashboardIcon name={section.icon} />
                {section.title}
              </Link>
            ) : (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex shrink-0 items-center gap-3 rounded-md px-4 py-3 text-[#526B7D] hover:bg-[#C3E6EB] hover:text-[#10263F]"
              >
                <DashboardIcon name={section.icon} />
                {section.title}
              </a>
            ),
          )}

          <a
            href="#activity"
            className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-[#526B7D] hover:bg-[#C3E6EB] hover:text-[#10263F]"
          >
            <DashboardIcon name="activity" />
            Your Activity
          </a>
        </nav>
      </aside>

      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-10 sm:py-14">

        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0D8F91]">
            Library Hub
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Welcome to Libro
          </h1>
          <p className="mt-3 text-[#526B7D]">
            Books, study spaces, and library information all in one place.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {dashboardSections.map((section) =>
            section.id === "study-rooms" ? (
              <Link
                key={section.id}
                href="/dashboard/reserve-rooms"
                className="group min-h-52 border border-[#C9DEE6] bg-[#F4FAFC] p-6 transition-colors hover:border-[#0D8F91] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D8F91]"
              >
                <div className="flex h-12 w-12 items-center justify-center bg-[#D9F0F1] text-[#0D8F91]">
                  <DashboardIcon name={section.icon} />
                </div>
                <h2 className="mt-5 text-xl font-semibold group-hover:text-[#08797B]">{section.title}</h2>
                <p className="mt-3 text-[#526B7D]">{section.description}</p>
                <span className="mt-5 inline-block text-sm font-semibold text-[#08797B]">View rooms and floor plans →</span>
              </Link>
            ) : (
            <section
              key={section.id}
              id={section.id}
              className="min-h-52 scroll-mt-8 border border-[#C9DEE6] bg-[#F4FAFC] p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center bg-[#D9F0F1] text-[#0D8F91]">
                <DashboardIcon name={section.icon} />
              </div>
              <h2 className="mt-5 text-xl font-semibold">{section.title}</h2>
              <p className="mt-3 text-[#526B7D]">{section.description}</p>
            </section>
            ),
          )}
        </div>

        <section
          id="activity"
          className="mt-5 scroll-mt-8 border border-[#C9DEE6] bg-[#F4FAFC] p-6"
        >
          <div className="flex items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#D9F0F1] text-[#0D8F91]">
              <DashboardIcon name="activity" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Your Activity</h2>
              <p className="mt-3 text-[#526B7D]">
                Your checked-out items and upcoming reservations will be
                displayed here.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}