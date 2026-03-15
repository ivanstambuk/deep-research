#!/usr/bin/env python3
"""Validate that README.md does not contain YAML front matter.

DR documents use YAML front matter for metadata (title, status, dr_id, etc.).
README.md is NOT a DR document — it is a repository overview file and must
not contain YAML front matter.

Checks:
  1. README.md must not start with a YAML front matter block (--- ... ---)

Usage:
  python3 .githooks/validate-readme.py README.md

Exit codes:
  0 — check passed (no front matter found, or file is not README.md)
  1 — check failed (front matter found in README.md)
"""

import sys
from pathlib import Path


def has_yaml_front_matter(filepath: Path) -> bool:
    """Check if a file starts with YAML front matter (--- ... ---)."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception:
        return False

    lines = content.split("\n")
    if not lines or lines[0].rstrip() != "---":
        return False

    # Look for closing ---
    for i in range(1, len(lines)):
        if lines[i].rstrip() == "---":
            return True

    return False


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file.md> [<file2.md> ...]", file=sys.stderr)
        sys.exit(2)

    all_passed = True

    for filepath_str in sys.argv[1:]:
        filepath = Path(filepath_str)
        if not filepath.exists():
            continue

        # Only check files named README.md (case-insensitive)
        if filepath.name.lower() != "readme.md":
            continue

        if has_yaml_front_matter(filepath):
            all_passed = False
            print(
                "╔══════════════════════════════════════════════════════════════════╗",
                file=sys.stderr,
            )
            print(
                "║  ❌ README.md MUST NOT CONTAIN YAML FRONT MATTER               ║",
                file=sys.stderr,
            )
            print(
                "╚══════════════════════════════════════════════════════════════════╝",
                file=sys.stderr,
            )
            print("", file=sys.stderr)
            print(f"  File: {filepath}", file=sys.stderr)
            print("", file=sys.stderr)
            print("WHY:", file=sys.stderr)
            print(
                "  YAML front matter (--- ... ---) is reserved for DR documents in",
                file=sys.stderr,
            )
            print(
                "  papers/. README.md is a repository overview — not a DR document.",
                file=sys.stderr,
            )
            print(
                "  Adding front matter to README.md would cause it to be validated",
                file=sys.stderr,
            )
            print(
                "  as a DR document, triggering false validation errors.",
                file=sys.stderr,
            )
            print("", file=sys.stderr)
            print("HOW TO FIX:", file=sys.stderr)
            print("  1. Open README.md", file=sys.stderr)
            print(
                "  2. Remove the YAML front matter block (the lines between --- and ---)",
                file=sys.stderr,
            )
            print(
                "  3. If you need metadata, put it in prose (e.g., a visible header line)",
                file=sys.stderr,
            )
            print(
                f"  4. Re-validate: python3 .githooks/validate-readme.py {filepath}",
                file=sys.stderr,
            )
            print("", file=sys.stderr)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
