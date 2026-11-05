import os
import time
from urllib.parse import urlparse

import httpx

from database import get_db

GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"
ALLOWED_IMAGE_HOSTS = {"books.google.com", "books.googleusercontent.com"}


def normalize_isbn(value: object) -> str:
    return "".join(
        char for char in str(value or "").upper()
        if char.isdigit() or char == "X"
    )


def search_volumes(
    client: httpx.Client, query: str, api_key: str, limit: int
) -> list[dict]:
    found: list[dict] = []
    seen_ids: set[str] = set()
    start_index = 0

    for _ in range(3):
        for attempt in range(3):
            response = client.get(
                GOOGLE_BOOKS_URL,
                params={
                    "q": query,
                    "maxResults": limit,
                    "startIndex": start_index,
                    "key": api_key,
                },
            )

            if response.status_code in (500, 502, 503, 504) and attempt < 2:
                time.sleep(2 ** attempt)
                continue

            response.raise_for_status()
            break

        payload = response.json()
        page = payload.get("items") or []
        new_items = [
            item
            for item in page
            if item.get("id") and item["id"] not in seen_ids
        ]

        if not new_items:
            break

        found.extend(new_items)
        seen_ids.update(item["id"] for item in new_items)
        start_index += len(page)

        total = payload.get("totalItems")
        if isinstance(total, int) and total > 0 and start_index >= total:
            break

    return found


def google_thumbnail(
    client: httpx.Client,
    isbn: str,
    title: str,
    author: str,
    api_key: str,
) -> str | None:
    clean_title = title.replace('"', "").strip()
    clean_author = author.replace('"', "").strip()

    queries = [(f"isbn:{isbn}", 5)]

    if clean_title:
        short_title = clean_title.split(":", 1)[0].strip()

        if clean_author:
            queries.append((f"{short_title} {clean_author}", 40))

        queries.append((short_title, 40))

    for query, limit in queries:
        try:
            items = search_volumes(client, query, api_key, limit)
        except httpx.HTTPStatusError as error:
            if error.response.status_code in (500, 502, 503, 504):
                print(
                    f"Google Books search unavailable for ISBN {isbn}; "
                    "trying next search"
                )
                continue
            raise

        print(f"ISBN {isbn}: {len(items)} results for {query}")

        for item in items:
            info = item.get("volumeInfo") or {}
            identifiers = {
                normalize_isbn(entry.get("identifier"))
                for entry in info.get("industryIdentifiers") or []
            }

            if isbn not in identifiers:
                continue

            links = info.get("imageLinks") or {}
            url = links.get("thumbnail") or links.get("smallThumbnail")
            if not url:
                continue

            url = url.replace("http://", "https://", 1)
            if urlparse(url).hostname in ALLOWED_IMAGE_HOSTS:
                return url

    print(f"No exact ISBN cover found for {isbn} ({title})")
    return None


def main() -> None:
    api_key = os.getenv("GOOGLE_BOOKS_API_KEY")
    if not api_key:
        raise SystemExit(
            "Add GOOGLE_BOOKS_API_KEY to backend/.env first."
        )

    db = get_db()
    books = (
        db.table("books")
        .select("id,title,author,isbn,thumbnail_url")
        .execute()
        .data or []
    )

    updated = 0
    missing = 0

    with httpx.Client(timeout=10.0) as client:
        for book in books:
            isbn = normalize_isbn(book.get("isbn"))
            if not isbn or book.get("thumbnail_url"):
                continue

            try:
                url = google_thumbnail(
                    client,
                    isbn,
                    book.get("title") or "",
                    book.get("author") or "",
                    api_key,
                )
            except httpx.HTTPStatusError as error:
                if error.response.status_code in (403, 429):
                    raise SystemExit(
                        "Google Books rejected the key or quota was reached."
                    ) from error
                print(
                    f"Google Books error for ISBN {isbn}: "
                    f"{error.response.status_code}"
                )
                continue
            except httpx.RequestError as error:
                print(f"Network error for ISBN {isbn}: {error}")
                continue

            if not url:
                try:
                    url = open_library_thumbnail(client, isbn)
                    if url:
                        print(f"Using Open Library cover for ISBN {isbn}")
                except httpx.HTTPStatusError as error:
                    print(
                        f"Open Library error for ISBN {isbn}: "
                        f"{error.response.status_code}"
                    )
                except httpx.RequestError as error:
                    print(f"Open Library network error for ISBN {isbn}: {error}")

            if not url:
                missing += 1
                continue

            (
                db.table("books")
                .update({"thumbnail_url": url})
                .eq("id", book["id"])
                .execute()
            )
            updated += 1

    print(
        f"Updated {updated} books; "
        f"{missing} had no matching Google thumbnail."
    )

def open_library_thumbnail(
    client: httpx.Client, isbn: str
) -> str | None:
    url = (
        f"https://covers.openlibrary.org/b/isbn/"
        f"{isbn}-M.jpg?default=false"
    )
    response = client.get(url, follow_redirects=True)

    if response.status_code == 404:
        return None

    response.raise_for_status()

    if response.headers.get("content-type", "").startswith("image/"):
        return url

    return None


if __name__ == "__main__":
    main()