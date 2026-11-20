import html
import json
import os
import re
from pathlib import Path
from urllib.parse import urlparse

import httpx

from backfill_book_thumbnails import normalize_isbn, search_volumes
from database import get_admin_db


def safe_cover(url, hosts):
    if not isinstance(url, str):
        return None

    url = url.replace("http://", "https://", 1)
    parsed = urlparse(url)

    if parsed.hostname not in hosts or "/id/-1-" in parsed.path:
        return None

    return url


def alternate_cover(client, book):
    title = re.split(r":| \(| - ", book["title"], maxsplit=1)[0].strip()
    if title.lower().endswith(" movie"):
        title = title[:-6]

    response = client.get(
        "https://openlibrary.org/search.json",
        params={
            "title": title,
            "author": book["author"].split(",")[0],
            "fields": "title,cover_i",
            "limit": 10,
        },
    )
    response.raise_for_status()

    def title_key(value):
        value = value.lower().replace("&", "and")
        return (
            re.sub(r"[^a-z0-9]+", " ", value)
            .strip()
            .removeprefix("the ")
        )

    for result in response.json().get("docs", []):
        cover_id = result.get("cover_i")
        if (
            title_key(result.get("title", "")) == title_key(title)
            and isinstance(cover_id, int)
            and cover_id > 0
        ):
            return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"

    return None


def google_cover(client, book, api_key):
    isbn = normalize_isbn(book.get("isbn"))
    if not isbn or not api_key:
        return None

    title = book["title"].split(":", 1)[0].strip()
    queries = [
        (f"isbn:{isbn}", 5),
        (f"{title} {book['author']}", 40),
        (title, 40),
    ]

    for query, limit in queries:
        try:
            volumes = search_volumes(client, query, api_key, limit)
        except httpx.HTTPError as exc:
            print(f"Google lookup failed for {book['title']}: {exc}", flush=True)
            continue

        for volume in volumes:
            info = volume.get("volumeInfo") or {}
            identifiers = {
                normalize_isbn(item.get("identifier"))
                for item in info.get("industryIdentifiers") or []
            }
            if isbn not in identifiers:
                continue

            links = info.get("imageLinks") or {}
            for size in ("extraLarge", "large", "medium", "small"):
                url = safe_cover(
                    links.get(size),
                    {"books.google.com", "books.googleusercontent.com"},
                )
                if url:
                    return url

    return None


def image(url):
    if not url:
        return '<p class="missing">No cover found</p>'

    return (
        f'<img src="{html.escape(url, quote=True)}" '
        'alt="Book cover" loading="lazy">'
    )


def main():
    db = get_admin_db()
    books = (
        db.table("books")
        .select("id,title,author,isbn,thumbnail_url,cover_url")
        .order("title")
        .execute()
        .data or []
    )
    print(f"Loaded {len(books)} books.", flush=True)

    open_library = {}
    candidates = []
    rows = []
    api_key = os.getenv("GOOGLE_BOOKS_API_KEY")

    with httpx.Client(
        timeout=20,
        follow_redirects=True,
        headers={"User-Agent": "LibroClassProject/1.0"},
    ) as client:
        for start in range(0, len(books), 20):
            batch = books[start:start + 20]
            keys = [
                f"ISBN:{normalize_isbn(book['isbn'])}"
                for book in batch
                if book.get("isbn")
            ]
            if not keys:
                continue

            print(
                f"Checking Open Library batch {start // 20 + 1}...",
                flush=True,
            )
            try:
                response = client.get(
                    "https://openlibrary.org/api/books",
                    params={
                        "bibkeys": ",".join(keys),
                        "jscmd": "data",
                        "format": "json",
                    },
                )
                response.raise_for_status()
                open_library.update(response.json())
            except httpx.HTTPError as exc:
                print(f"Open Library batch failed: {exc}", flush=True)

        for number, book in enumerate(books, 1):
            print(f"{number}/{len(books)}: {book['title']}", flush=True)

            isbn = normalize_isbn(book.get("isbn"))
            record = open_library.get(f"ISBN:{isbn}", {})
            proposed = safe_cover(
                (record.get("cover") or {}).get("large"),
                {"covers.openlibrary.org"},
            )
            source = "Open Library ISBN" if proposed else "No new cover"

            if not proposed:
                try:
                    proposed = alternate_cover(client, book)
                except httpx.HTTPError as exc:
                    print(
                        f"Cover search failed for {book['title']}: {exc}",
                        flush=True,
                    )
                if proposed:
                    source = "Open Library work (review edition)"

            if not proposed:
                proposed = google_cover(client, book, api_key)
                if proposed:
                    source = "Google Books"

            current = book.get("cover_url") or book.get("thumbnail_url")
            candidates.append({
                "id": book["id"],
                "title": book["title"],
                "isbn": isbn,
                "source": source,
                "proposed_url": proposed,
            })

            rows.append(
                "<article>"
                f"<h2>{html.escape(book['title'])}</h2>"
                f"<p>{html.escape(source)} · ISBN {html.escape(isbn)}</p>"
                '<div class="compare">'
                f"<div><h3>Current</h3>{image(current)}</div>"
                f"<div><h3>Proposed</h3>{image(proposed)}</div>"
                "</div></article>"
            )

    preview = Path("/private/tmp/libro-cover-review.html")
    data_file = Path("/private/tmp/libro-cover-candidates.json")

    preview.write_text(
        """<!doctype html><meta charset="utf-8">
        <title>Libro cover review</title>
        <style>
          body {font: 16px Arial; background: #e7f1f6; color: #10263f;
                max-width: 1200px; margin: 30px auto; padding: 0 20px}
          article {background: #f4fafc; border: 1px solid #c9dee6;
                   border-radius: 16px; padding: 22px; margin: 20px 0}
          .compare {display: grid; grid-template-columns: 1fr 1fr; gap: 20px}
          .compare > div {background: white; padding: 16px; text-align: center}
          img {width: 100%; height: 300px; object-fit: contain}
          .missing {height: 300px; display: grid; place-items: center}
          @media (max-width: 600px) {
            .compare {grid-template-columns: 1fr}
          }
        </style><h1>Libro cover review</h1>"""
        + "\n".join(rows),
        encoding="utf-8",
    )
    data_file.write_text(
        json.dumps(candidates, indent=2),
        encoding="utf-8",
    )

    print(f"Reviewed {len(books)} books.")
    print(f"Open this preview: {preview}")
    print("No database records were changed.")


if __name__ == "__main__":
    main()
    