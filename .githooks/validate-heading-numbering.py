#!/usr/bin/env python3
"""Validate hierarchical heading numbering in DR authoring docs.

This validator enforces two invariants for numeric section headings:

1. Numeric section identifiers must be purely numeric.
   Examples:
   - valid:   `##### 25.3.6 Binding Message Security`
   - invalid: `##### 25.3.5a Binding Message Security`

2. Numeric headings must be structurally consistent.
   - Sibling numbering must increase sequentially within the local visible series.
   - Deeper child headings must have an existing visible numeric parent heading.

The validator intentionally targets *numeric* section identifiers only.
Appendix-style labels such as `E.5a` are ignored.

Exit codes:
  0 = pass
  1 = validation failure
  2 = usage error
"""

from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


HEADING_RE = re.compile(r"^(#{2,6})\s+(.*\S)\s*$")
NUMERIC_HEADING_RE = re.compile(r"^(§)?(\d+(?:\.\d+)*)([a-z]?)(?:\s+|$)")


@dataclass(frozen=True)
class Heading:
    line_no: int
    level: int
    text: str
    path: tuple[int, ...]
    suffix: str


def iter_numeric_headings_from_text(text: str) -> list[Heading]:
    headings: list[Heading] = []
    in_fence = False

    for line_no, raw_line in enumerate(text.splitlines(), 1):
        stripped = raw_line.strip()

        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue

        match = HEADING_RE.match(raw_line)
        if not match:
            continue

        level = len(match.group(1))
        text = match.group(2).strip()
        numeric = NUMERIC_HEADING_RE.match(text)
        if not numeric:
            continue

        path_tuple = tuple(int(part) for part in numeric.group(2).split("."))
        suffix = numeric.group(3)
        headings.append(
            Heading(
                line_no=line_no,
                level=level,
                text=text,
                path=path_tuple,
                suffix=suffix,
            )
        )

    return headings


def iter_numeric_headings(path: Path) -> list[Heading]:
    return iter_numeric_headings_from_text(path.read_text(encoding="utf-8"))


def get_staged_text(path: Path) -> str | None:
    result = subprocess.run(
        ["git", "show", f":{path.as_posix()}"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=path.parent.parent.parent if ".githooks" in path.parts else None,
        check=False,
    )
    if result.returncode != 0:
        return None
    return result.stdout


def get_changed_line_numbers(path: Path) -> set[int]:
    result = subprocess.run(
        ["git", "diff", "--cached", "--unified=0", "--", path.as_posix()],
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=path.parent.parent.parent if ".githooks" in path.parts else None,
        check=False,
    )
    if result.returncode != 0 or not result.stdout:
        return set()

    changed: set[int] = set()
    for line in result.stdout.splitlines():
        match = re.match(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@", line)
        if not match:
            continue
        start = int(match.group(1))
        length = int(match.group(2) or "1")
        if length == 0:
            continue
        changed.update(range(start, start + length))
    return changed


def format_path(parts: tuple[int, ...]) -> str:
    return ".".join(str(part) for part in parts)


def validate_file(file_path: Path, changed_only: bool = False) -> list[str]:
    basename = file_path.name
    if not re.match(r"DR-\d{4}", basename):
        return []

    if changed_only:
        staged_text = get_staged_text(file_path)
        if staged_text is None:
            return []
        changed_lines = get_changed_line_numbers(file_path)
        if not changed_lines:
            return []
        headings = iter_numeric_headings_from_text(staged_text)
    else:
        changed_lines = None
        headings = iter_numeric_headings(file_path)
    if not headings:
        return []

    errors: list[str] = []
    root_depth = min(len(heading.path) for heading in headings if not heading.suffix)

    seen_numeric_paths: set[tuple[int, ...]] = set()
    last_child_by_parent: dict[tuple[int, ...], int] = {}

    for heading in headings:
        heading_marker = f'{"#" * heading.level} {heading.text}'
        depth = len(heading.path)
        visible_parent = heading.path[:-1]
        if depth == root_depth:
            counter_parent = heading.path[: root_depth - 1]
        else:
            counter_parent = visible_parent

        if heading.suffix:
            suggested = last_child_by_parent.get(counter_parent, 0) + 1
            suggestion_path = counter_parent + (suggested,) if counter_parent or suggested else ()
            suggestion = format_path(suggestion_path) if suggestion_path else None
            message = (
                f"L{heading.line_no}: Numeric section identifier `{format_path(heading.path)}{heading.suffix}` "
                f"in `{heading_marker}` uses an alphabetic suffix. Numeric section IDs must use only digits and dots."
            )
            if suggestion:
                message += f" Rename it to the next numeric sibling, e.g. `{suggestion}`."
            if changed_lines is None or heading.line_no in changed_lines:
                errors.append(message)
            continue

        if depth > root_depth and visible_parent not in seen_numeric_paths:
            if changed_lines is None or heading.line_no in changed_lines:
                errors.append(
                    f"L{heading.line_no}: Missing parent heading for `{heading_marker}` — "
                    f"expected parent section `{format_path(visible_parent)}` to appear earlier in the document."
                )

        actual_child = heading.path[-1]
        if counter_parent in last_child_by_parent:
            expected_child = last_child_by_parent[counter_parent] + 1
            if actual_child != expected_child:
                expected_path = format_path(counter_parent + (expected_child,))
                if changed_lines is None or heading.line_no in changed_lines:
                    errors.append(
                        f"L{heading.line_no}: Non-sequential section number in `{heading_marker}` — "
                        f"expected `{expected_path}`, found `{format_path(heading.path)}`."
                    )

        last_child_by_parent[counter_parent] = actual_child
        seen_numeric_paths.add(heading.path)

    return errors


def main() -> int:
    args = sys.argv[1:]
    changed_only = False
    if args and args[0] == "--changed-only":
        changed_only = True
        args = args[1:]

    if not args:
        print(
            f"Usage: {sys.argv[0]} [--changed-only] <file.mdx> [<file2.mdx> ...]",
            file=sys.stderr,
        )
        return 2

    total_errors = 0
    for arg in args:
        file_path = Path(arg)
        errors = validate_file(file_path, changed_only=changed_only)
        if not errors:
            continue

        print("\n╔══════════════════════════════════════════════════════════════════╗")
        print("║  ❌ HEADING NUMBERING ERRORS                                    ║")
        print("╚══════════════════════════════════════════════════════════════════╝")
        print(f"\n{file_path}:")
        for error in errors:
            print(f"  {error}")
        print("\nWHAT HAPPENED:")
        print("  Numeric section headings in DR documents must form a valid local hierarchy.")
        print("  Numeric section IDs may not use suffixes like `9.2.2a`, deeper headings")
        print("  must stay under a visible numeric parent, and sibling numbers in the same")
        print("  local series must increase sequentially.")
        print("\nHOW TO FIX:")
        print("  1. Rewrite numeric suffixed headings as pure numeric siblings.")
        print("  2. Renumber later siblings so the sequence remains contiguous.")
        print("  3. Update any affected internal references (for example `§25.1.3`).")
        print("  4. Keep appendix-style labels separate; this validator ignores non-numeric")
        print("     appendix headings such as `E.5a`.")
        total_errors += len(errors)

    return 1 if total_errors else 0


if __name__ == "__main__":
    sys.exit(main())
