#!/usr/bin/env python3
"""Auto-sync DR `date_updated` metadata for staged authoring documents.

For each staged `src/papers/**/*.mdx` authoring source:
1. Set frontmatter `date_updated` to today's ISO date.
2. Sync the visible metadata line's `Last updated YYYY-MM-DD` date to match.
3. If the generated mirror already exists under `papers/`, sync the same fields there.
4. Stage only the specific files that were updated.

This is a pre-commit auto-fix helper, not a standalone validator.
"""

from __future__ import annotations

import re
import subprocess
import sys
from datetime import date
from pathlib import Path

FRONTMATTER_DATE_PATTERN = re.compile(r"(?m)^(date_updated:\s*)(\d{4}-\d{2}-\d{2})(\s*)$")
VISIBLE_DATE_PATTERN = re.compile(
    r"(?m)^(\*\*DR-\d{4}\*\*[^\n]*?Last updated\s+)(\d{4}-\d{2}-\d{2})([^\n]*)$"
)


def sync_dates(path: Path, today_iso: str) -> bool:
    try:
        original = path.read_text(encoding="utf-8")
    except Exception as exc:
        raise RuntimeError(f"Cannot read {path}: {exc}") from exc

    updated = original

    updated, _ = FRONTMATTER_DATE_PATTERN.subn(rf"\g<1>{today_iso}\g<3>", updated, count=1)
    updated, _ = VISIBLE_DATE_PATTERN.subn(rf"\g<1>{today_iso}\g<3>", updated, count=1)

    if updated == original:
        return False

    try:
        path.write_text(updated, encoding="utf-8")
    except Exception as exc:
        raise RuntimeError(f"Cannot write {path}: {exc}") from exc

    return True


def mirror_for_source(source: Path) -> Path:
    return Path(str(source).replace("src/", "", 1)).with_suffix(".md")


def main(argv: list[str]) -> int:
    source_paths = [Path(arg) for arg in argv[1:] if arg.endswith(".mdx")]
    if not source_paths:
        return 0

    today_iso = date.today().isoformat()
    changed_paths: list[str] = []

    for source in source_paths:
        if source.exists() and sync_dates(source, today_iso):
            changed_paths.append(str(source))

        mirror = mirror_for_source(source)
        if mirror.exists() and sync_dates(mirror, today_iso):
            changed_paths.append(str(mirror))

    if not changed_paths:
        return 0

    subprocess.run(["git", "add", "--", *changed_paths], check=True)
    print("Auto-synced DR updated-date metadata:")
    for path in changed_paths:
        print(f"  {path}")

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv))
    except Exception as exc:
        print(exc, file=sys.stderr)
        sys.exit(1)
