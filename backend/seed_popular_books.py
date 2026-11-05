
import argparse
import os
import re
import time
from urllib.parse import urlparse

import httpx

from database import get_db

SEARCH_URL = "https://openlibrary.org/search.json"
GOOGLE_URL = "https://www.googleapis.com/books/v1/volumes"
GOOGLE_IMAGE_HOSTS = {"books.google.com", "books.googleusercontent.com"}


def isbn13(value):
    number = re.sub(r"[^0-9]", "", str(value or ""))
    if len(number) != 13 or not number.startswith(("978", "979")):
        return None
    total = sum(
        int(digit) * (1 if index % 2 == 0 else 3)
        for index, digit in enumerate(number[:12])
    )
    return number if (10 - total % 10) % 10 == int(number[-1]) else None


def isbn10_to_13(value):
    number = re.sub(r"[^0-9Xx]", "", str(value or "")).upper()
    if len(number) != 10 or not number[:9].isdigit():
        return None

    check = sum(
        (10 - index) * int(digit)
        for index, digit in enumerate(number[:9])
    )
    check += 10 if number[-1] == "X" else int(number[-1]) if number[-1].isdigit() else -1
    if check % 11:
        return None

    prefix = "978" + number[:9]
    total = sum(
        int(digit) * (1 if index % 2 == 0 else 3)
        for index, digit in enumerate(prefix)
    )
    return prefix + str((10 - total % 10) % 10)


def google_candidate(client, work, api_key, used):
    work_isbns = {isbn13(value) for value in work.get("isbn", [])}
    work_isbns.discard(None)
    if not work_isbns:
        return None

    author = (work.get("author_name") or [""])[0]
    query = f'{work.get("title", "")} {author}'.strip()

    response = client.get(
        GOOGLE_URL,
        params={
            "q": query,
            "maxResults": 40,
            "printType": "books",
            "key": api_key,
        },
    )
    response.raise_for_status()

    for volume in response.json().get("items", []):
        info = volume.get("volumeInfo") or {}
        identifiers = [
            isbn13(item.get("identifier"))
            for item in info.get("industryIdentifiers") or []
        ]
        matching = next(
            (
                number
                for number in identifiers
                if number in work_isbns and number not in used
            ),
            None,
        )
        image = (info.get("imageLinks") or {}).get("thumbnail")
        if not matching or not image:
            continue

        image = image.replace("http://", "https://", 1)
        if urlparse(image).hostname not in GOOGLE_IMAGE_HOSTS:
            continue

        return {
            "title": info.get("title") or work["title"],
            "author": ", ".join(info.get("authors") or [author]),
            "isbn": matching,
            "is_available": True,
            "thumbnail_url": image,
        }

    return None


def edition_candidate(edition, work, used):
    numbers = [isbn13(value) for value in edition.get("isbn_13", [])]
    numbers += [isbn10_to_13(value) for value in edition.get("isbn_10", [])]
    number = next(
        (value for value in numbers if value and value not in used),
        None,
    )

    cover_ids = edition.get("covers") or []
    cover_id = cover_ids[0] if cover_ids else None
    if not number or not isinstance(cover_id, int) or cover_id <= 0:
        return None

    return {
        "title": edition.get("title") or work["title"],
        "author": ", ".join(
            (work.get("author_name") or ["Unknown author"])[:3]
        ),
        "isbn": number,
        "is_available": True,
        "thumbnail_url": f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg",
    }


def open_library_candidate(client, work, used):
    edition_key = work.get("cover_edition_key")
    if edition_key and re.fullmatch(r"OL[0-9]+M", edition_key):
        response = client.get(
            f"https://openlibrary.org/books/{edition_key}.json"
        )
        response.raise_for_status()
        candidate = edition_candidate(response.json(), work, used)
        if candidate:
            return candidate

    work_key = work.get("key", "")
    if not re.fullmatch(r"/works/OL[0-9]+W", work_key):
        return None

    response = client.get(
        f"https://openlibrary.org{work_key}/editions.json",
        params={"limit": 50},
    )
    response.raise_for_status()

    for edition in response.json().get("entries", []):
        candidate = edition_candidate(edition, work, used)
        if candidate:
            return candidate

    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Insert books into the library catalog",
    )
    parser.add_argument(
        "--library-id",
        help="Target library UUID, if books use library_id",
    )
    args = parser.parse_args()

    api_key = os.getenv("GOOGLE_BOOKS_API_KEY")
    if not api_key:
        raise SystemExit("Set GOOGLE_BOOKS_API_KEY in backend/.env first.")

    db = get_db()
    existing = db.table("books").select("*").execute().data or []

    has_library_id = bool(existing) and "library_id" in existing[0]
    library_ids = {
        row.get("library_id")
        for row in existing
        if row.get("library_id")
    }
    library_id = args.library_id

    if has_library_id:
        if not library_id and len(library_ids) == 1:
            library_id = next(iter(library_ids))
        if not library_id:
            raise SystemExit(
                f"Books belong to multiple libraries: {sorted(library_ids)}. "
                "Rerun with --library-id UUID."
            )
        print(f"Target library: {library_id}")
    elif args.library_id:
        raise SystemExit(
            "books has no library_id column; omit --library-id."
        )

    used = {
        number
        for row in existing
        if (not has_library_id or row.get("library_id") == library_id)
        if (number := isbn13(row.get("isbn")))
    }

    counts = {"Google Books": 0, "Open Library": 0, "skipped": 0}
    candidates = []
    google_enabled = True

    with httpx.Client(
        timeout=15,
        follow_redirects=True,
        headers={
            "User-Agent": "LibroClassProject/1.0 (book catalog demo)"
        },
    ) as client:
        response = client.get(
            SEARCH_URL,
            params={
                "q": "language:eng",
                "sort": "readinglog",
                "limit": 100,
                "fields": (
                    "key,title,author_name,isbn,"
                    "cover_i,cover_edition_key"
                ),
            },
        )
        response.raise_for_status()
        works = response.json().get("docs", [])

        for rank, work in enumerate(works, 1):
            if len(candidates) == 50:
                break

            candidate = None
            source = "Open Library"

            if google_enabled:
                try:
                    candidate = google_candidate(
                        client, work, api_key, used
                    )
                    if candidate:
                        source = "Google Books"
                except httpx.HTTPStatusError as error:
                    if error.response.status_code in (403, 429):
                        google_enabled = False
                        print(
                            "Google Books key or quota unavailable; "
                            "using Open Library covers."
                        )
                    else:
                        print(
                            f"Google lookup failed at rank {rank}: "
                            f"{error.response.status_code}"
                        )
                except httpx.RequestError as error:
                    print(f"Google lookup failed at rank {rank}: {error}")

            if candidate is None:
                try:
                    candidate = open_library_candidate(
                        client, work, used
                    )
                except (httpx.HTTPError, ValueError) as error:
                    print(
                        f"Open Library edition lookup failed "
                        f"at rank {rank}: {error}"
                    )

            if candidate is None:
                counts["skipped"] += 1
                print(
                    f"{rank:2}. SKIP {work.get('title', '?')} "
                    "(no new ISBN/cover pair)"
                )
                continue

            if has_library_id:
                candidate["library_id"] = library_id

            used.add(candidate["isbn"])
            candidates.append(candidate)
            counts[source] += 1
            print(
                f"{rank:2}. {candidate['title']} | "
                f"{candidate['isbn']} | {source}"
            )
            time.sleep(0.15)

    print(
        f"Preview: {len(candidates)} new copies; "
        f"Google covers {counts['Google Books']}, "
        f"Open Library covers {counts['Open Library']}, "
        f"skipped {counts['skipped']}."
    )

    if not args.apply:
        print(
            "No rows inserted. Rerun with --apply "
            "when the preview looks right."
        )
        return

    inserted = 0
    for candidate in candidates:
        try:
            db.table("books").insert(candidate).execute()
            inserted += 1
        except Exception as error:
            print(f"Insert failed for {candidate['isbn']}: {error}")

    print(
        f"Inserted {inserted} of "
        f"{len(candidates)} previewed copies."
    )


if __name__ == "__main__":
    main()