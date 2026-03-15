#!/usr/bin/env python3
"""Block commits where README.md or llms.txt reference draft DR documents.

Scans README.md and llms.txt for any link or mention of a DR document whose
front matter has status: draft.  Only checks files that are staged for commit.

Usage:
  python3 .githooks/validate-no-draft-refs.py README.md
  python3 .githooks/validate-no-draft-refs.py llms.txt

Exit codes:
  0 — no draft references found (or file is not README.md / llms.txt)
  1 — draft references detected
"""

import re
import sys
from pathlib import Path

# Only these files are checked for draft references
INDEX_FILES = {"README.md", "llms.txt"}


def get_draft_dr_ids(repo_root: Path) -> set[str]:
    """Scan all DR papers and return the set of DR IDs with status: draft."""
    draft_ids: set[str] = set()
    papers_dir = repo_root / "papers"
    if not papers_dir.is_dir():
        return draft_ids

    for md_file in papers_dir.rglob("DR-*.md"):
        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception:
            continue

        # Quick YAML front matter parse for status
        if not content.startswith("---"):
            continue

        end = content.find("\n---", 3)
        if end == -1:
            continue

        front_matter = content[3:end]

        # Extract status
        status_match = re.search(r"^status:\s*(\S+)", front_matter, re.MULTILINE)
        if status_match and status_match.group(1).strip('"\'') == "draft":
            # Extract dr_id
            id_match = re.search(r"^dr_id:\s*(\S+)", front_matter, re.MULTILINE)
            if id_match:
                draft_ids.add(id_match.group(1).strip('"\'').upper())

    return draft_ids


def check_file(filepath: Path, draft_ids: set[str]) -> list[str]:
    """Check a single index file for references to draft DR documents."""
    errors: list[str] = []
    if not filepath.exists():
        return errors

    try:
        lines = filepath.read_text(encoding="utf-8").split("\n")
    except Exception as e:
        return [f"Cannot read file: {e}"]

    for line_num, line in enumerate(lines, start=1):
        for dr_id in draft_ids:
            # Match DR-NNNN in any form (links, plain text, paths)
            if re.search(re.escape(dr_id), line, re.IGNORECASE):
                errors.append(
                    f"  Line {line_num}: references {dr_id} (status: draft)\n"
                    f"    {line.strip()[:120]}"
                )

    return errors


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file> [<file2> ...]", file=sys.stderr)
        sys.exit(2)

    # Determine repo root (script lives in .githooks/)
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent

    draft_ids = get_draft_dr_ids(repo_root)
    if not draft_ids:
        sys.exit(0)  # No drafts exist, nothing to check

    all_passed = True

    for filepath_str in sys.argv[1:]:
        filepath = Path(filepath_str)

        # Only check index files
        if filepath.name not in INDEX_FILES:
            continue

        errors = check_file(filepath, draft_ids)
        if errors:
            all_passed = False
            print(
                "╔══════════════════════════════════════════════════════════════════╗",
                file=sys.stderr,
            )
            print(
                "║  ❌ DRAFT DOCUMENT REFERENCED IN PUBLIC INDEX                   ║",
                file=sys.stderr,
            )
            print(
                "╚══════════════════════════════════════════════════════════════════╝",
                file=sys.stderr,
            )
            print(f"", file=sys.stderr)
            print(f"  File: {filepath}", file=sys.stderr)
            print(f"  Draft DR IDs: {', '.join(sorted(draft_ids))}", file=sys.stderr)
            print(f"", file=sys.stderr)
            for err in errors:
                print(f"  • {err}", file=sys.stderr)
            print(f"", file=sys.stderr)
            print(f"WHAT HAPPENED:", file=sys.stderr)
            print(
                f"  README.md and llms.txt are public-facing index files. They must",
                file=sys.stderr,
            )
            print(
                f"  not reference DR documents with status 'draft' — only 'published'",
                file=sys.stderr,
            )
            print(f"  or 'archived' documents should appear in these files.", file=sys.stderr)
            print(f"", file=sys.stderr)
            print(f"HOW TO FIX:", file=sys.stderr)
            print(
                f"  1. Remove any lines mentioning the draft DR from {filepath.name}",
                file=sys.stderr,
            )
            print(
                f"  2. Or change the DR's front matter status to 'published' first",
                file=sys.stderr,
            )
            print(
                f"  3. Re-validate: python3 .githooks/validate-no-draft-refs.py {filepath}",
                file=sys.stderr,
            )
            print(f"", file=sys.stderr)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
