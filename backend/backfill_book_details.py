import argparse
import html
import os
import re
import time

import httpx

from backfill_book_thumbnails import normalize_isbn, search_volumes
from database import get_admin_db


def plain_text(value):
    if not isinstance(value, str):
        return None
    text = html.unescape(re.sub(r"<[^>]+>", " ", value))
    return re.sub(r"\s+", " ", text).strip() or None


def find_details(client, book, api_key):
    isbn = normalize_isbn(book.get("isbn"))
    if not isbn:
        return {}

    title = book["title"].split(":", 1)[0].strip()
    queries = [
        (f"isbn:{isbn}", 5),
        (f"{title} {book['author']}", 40),
        (title, 40),
    ]

    for query, limit in queries:
        volumes = search_volumes(client, query, api_key, limit)

        for volume in volumes:
            info = volume.get("volumeInfo") or {}
            identifiers = {
                normalize_isbn(entry.get("identifier"))
                for entry in info.get("industryIdentifiers") or []
            }
            if isbn not in identifiers:
                continue

            details = {}
            description = plain_text(info.get("description"))
            categories = info.get("categories")
            rating = info.get("averageRating")
            count = info.get("ratingsCount")

            if description:
                details["description"] = description
            if isinstance(categories, list):
                details["categories"] = [
                    value for value in categories if isinstance(value, str)
                ]
            if isinstance(rating, (int, float)):
                details["average_rating"] = rating
            if isinstance(count, int):
                details["ratings_count"] = count

            if details:
                return details

    return {}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    api_key = os.getenv("GOOGLE_BOOKS_API_KEY")
    if not api_key:
        raise SystemExit("Add GOOGLE_BOOKS_API_KEY to backend/.env.")

    db = get_admin_db()
    books = (
        db.table("books")
        .select(
            "id,title,author,isbn,description,categories,"
            "average_rating,ratings_count"
        )
        .execute()
        .data or []
    )

    matched = 0
    with httpx.Client(timeout=15) as client:
        for book in books:
            try:
                details = find_details(client, book, api_key)
            except httpx.HTTPError as exc:
                print(f"Lookup failed for {book['title']}: {exc}")
                continue

            updates = {
                key: value
                for key, value in details.items()
                if not book.get(key)
            }
            if not updates:
                print(f"No new details: {book['title']}")
                continue

            matched += 1
            print(f"{book['title']}: {', '.join(updates)}")
            if args.apply:
                db.table("books").update(updates).eq("id", book["id"]).execute()

            time.sleep(0.2)

    print(f"{'Updated' if args.apply else 'Previewed'} {matched} books.")


if __name__ == "__main__":
    main()