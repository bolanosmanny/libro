import argparse
import json
import re
from pathlib import Path

from database import get_admin_db

PREVIEW = Path("/private/tmp/libro-cover-candidates.json")
COVER_PATTERN = re.compile(
    r"https://covers\.openlibrary\.org/b/id/[1-9]\d*-L\.jpg"
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    candidates = json.loads(PREVIEW.read_text(encoding="utf-8"))
    ids = [item["id"] for item in candidates]

    if len(ids) != len(set(ids)):
        raise SystemExit("Preview has duplicate book IDs.")

    for item in candidates:
        if not COVER_PATTERN.fullmatch(item.get("proposed_url") or ""):
            raise SystemExit(f"Invalid cover URL: {item['title']}")

    print(f"Validated {len(candidates)} cover choices.")
    if not args.apply:
        print("No database changes. Rerun with --apply to save them.")
        return

    db = get_admin_db()
    updated = 0

    for item in candidates:
        result = (
            db.table("books")
            .update({"cover_url": item["proposed_url"]})
            .eq("id", item["id"])
            .eq("isbn", item["isbn"])
            .select("id")
            .execute()
        )
        if result.data:
            updated += 1
        else:
            print(f"Skipped ID/ISBN mismatch: {item['title']}")

    print(f"Updated {updated} of {len(candidates)} books.")


if __name__ == "__main__":
    main()