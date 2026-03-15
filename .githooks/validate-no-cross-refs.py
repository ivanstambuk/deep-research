#!/usr/bin/env python3
"""Validate that DR documents do not contain cross-references to other DR documents.

DR documents are self-contained research artifacts. Cross-references between
DR documents create coupling that undermines their independence: if DR-0001
refers to DR-0002 §5.2, then DR-0001 cannot be read, moved, or archived
independently.

Checks:
  1. No Markdown links pointing to another DR document (./DR-NNNN-*, ../DR-NNNN/*)
  2. No prose references like "see DR-0001", "DR-0002 §5", etc.

Only checks staged diff lines (newly added content), not the entire file.

Usage:
  python3 .githooks/validate-no-cross-refs.py <file.md> [<file2.md> ...]

Exit codes:
  0 — no cross-references found
  1 — cross-references detected (details printed to stderr)
"""

import re
import sys
from pathlib import Path

# Extract DR-NNNN from a filepath like papers/DR-0001/DR-0001-title.md
DR_ID_FROM_PATH = re.compile(r"DR-(\d{4})")

# Patterns that indicate a cross-reference to another DR document:
# 1. Markdown links: [text](./DR-NNNN-...) or [text](../DR-NNNN/...)
# 2. Prose references: "DR-0001", "DR-0002 §5", etc.
DR_REF_PATTERN = re.compile(r"DR-(\d{4})")


def get_dr_id(filepath: Path) -> str | None:
    """Extract the DR ID (e.g., '0001') from a filepath."""
    m = DR_ID_FROM_PATH.search(filepath.name)
    if m:
        return m.group(1)
    return None


def check_line_for_cross_refs(line: str, own_id: str) -> list[str]:
    """Check a single line for references to DR documents other than own_id.

    Returns a list of referenced DR IDs found.
    """
    refs = []
    for m in DR_REF_PATTERN.finditer(line):
        ref_id = m.group(1)
        if ref_id != own_id:
            refs.append(f"DR-{ref_id}")
    return refs


def validate_file(filepath: Path) -> list[str]:
    """Validate a single file. Returns a list of error messages."""
    errors: list[str] = []

    own_id = get_dr_id(filepath)
    if own_id is None:
        return []  # Not a DR document

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        return [f"Cannot read file: {e}"]

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Skip YAML front matter
        if i == 0 and stripped == "---":
            continue

        cross_refs = check_line_for_cross_refs(stripped, own_id)
        if cross_refs:
            unique_refs = sorted(set(cross_refs))
            errors.append(
                f"  L{i + 1}: references {', '.join(unique_refs)}\n"
                f"         {stripped[:120]}"
            )

    return errors


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file.md> [<file2.md> ...]", file=sys.stderr)
        sys.exit(2)

    all_passed = True

    for filepath_str in sys.argv[1:]:
        filepath = Path(filepath_str)
        if not filepath.exists():
            continue

        # Only check DR documents (files matching DR-NNNN-*.md)
        if not re.match(r"DR-\d{4}-.*\.md$", filepath.name):
            continue

        errors = validate_file(filepath)
        if errors:
            all_passed = False
            print(
                "╔══════════════════════════════════════════════════════════════════╗",
                file=sys.stderr,
            )
            print(
                "║  ❌ CROSS-REFERENCE DETECTED BETWEEN DR DOCUMENTS              ║",
                file=sys.stderr,
            )
            print(
                "╚══════════════════════════════════════════════════════════════════╝",
                file=sys.stderr,
            )
            print("", file=sys.stderr)
            print(f"  File: {filepath}", file=sys.stderr)
            print("", file=sys.stderr)
            for err in errors:
                print(err, file=sys.stderr)
            print("", file=sys.stderr)
            print("WHY:", file=sys.stderr)
            print(
                "  DR documents are self-contained research artifacts. Cross-references",
                file=sys.stderr,
            )
            print(
                "  between DR documents create coupling that undermines their independence.",
                file=sys.stderr,
            )
            print(
                "  Each DR must be readable, movable, and archivable on its own.",
                file=sys.stderr,
            )
            print("", file=sys.stderr)
            print("HOW TO FIX:", file=sys.stderr)
            print(
                "  1. Remove the cross-reference link/mention",
                file=sys.stderr,
            )
            print(
                "  2. If the referenced content is essential, incorporate it directly",
                file=sys.stderr,
            )
            print(
                "     into this document (self-contained > DRY for research docs)",
                file=sys.stderr,
            )
            print(
                f"  3. Re-validate: python3 .githooks/validate-no-cross-refs.py {filepath}",
                file=sys.stderr,
            )
            print("", file=sys.stderr)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
