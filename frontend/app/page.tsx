import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Welcome to Libro</h1>
      <p>Select a view to navigate:</p>
      <ul>
        <li>
          <Link href="/books">Browse Books</Link>
        </li>
        <li>
          <Link href="/rooms">Reserve Study Rooms</Link>
        </li>
      </ul>
    </main>
  );
}