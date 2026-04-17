#!/usr/bin/env python3
"""
Blocks all-empty Markdown table rows such as:

    | | | | |

These are usually accidental visual separators. Renderers emit them as real
table rows, which creates stray empty bands and suggests missing data.
"""

from __future__ import annotations

import re
import sys
from collections import defaultdict

FENCE_RE = re.compile(r"^\s*(```+|~~~+)")


def is_all_empty_table_row(line: str) -> bool:
    stripped = line.strip()
    if not stripped.startswith("|") or not stripped.endswith("|"):
        return False

    cells = stripped.split("|")[1:-1]
    if not cells:
        return False

    return all(cell.strip() == "" for cell in cells)


def find_failures(path: str) -> list[tuple[int, str]]:
    failures: list[tuple[int, str]] = []
    in_fence = False
    fence_marker = ""

    with open(path, "r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            fence_match = FENCE_RE.match(line)
            if fence_match:
                marker = fence_match.group(1)[0]
                if not in_fence:
                    in_fence = True
                    fence_marker = marker
                elif marker == fence_marker:
                    in_fence = False
                    fence_marker = ""
                continue

            if in_fence:
                continue

            if is_all_empty_table_row(line):
                failures.append((line_number, line.rstrip("\n")))

    return failures


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: validate-empty-table-rows.py <file> [<file> ...]")
        sys.exit(2)

    failures_by_file: dict[str, list[tuple[int, str]]] = defaultdict(list)

    for path in sys.argv[1:]:
        try:
            failures = find_failures(path)
        except FileNotFoundError:
            continue

        if failures:
            failures_by_file[path].extend(failures)

    if not failures_by_file:
        sys.exit(0)

    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  ❌ EMPTY MARKDOWN TABLE ROWS DETECTED                          ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print()

    for path, failures in failures_by_file.items():
        print(f"  File: {path}")
        for line_number, line in failures:
            print(f"    Line {line_number}: {line}")
        print()

    print("WHY THIS IS BLOCKED:")
    print("  A row whose every table cell is blank is not a harmless spacer.")
    print("  Markdown renderers emit it as a real table row, which creates a")
    print("  visible empty band and makes the table look malformed.")
    print()
    print("HOW TO FIX:")
    print("  1. Remove the all-empty row entirely.")
    print("  2. If you wanted visual separation, split the content into two")
    print("     tables or move the note/callout below the table.")
    print("  3. Keep empty cells only inside otherwise non-empty rows.")
    print()

    sys.exit(1)


if __name__ == "__main__":
    main()
