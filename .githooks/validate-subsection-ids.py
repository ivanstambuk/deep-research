#!/usr/bin/env python3
"""Validate that nested DR subsections carry explicit section identifiers.

This guardrail targets the editorial pattern where numbered DR sections use
numeric IDs for nested subsection headings that are visible in the in-chapter
outline. It complements `validate-heading-numbering.py`, which validates the
structure of headings that are already numbered.

Rules:
- Only DR authoring documents are checked (`src/papers/**/DR-*.mdx` and
  similarly named DR markdown sources).
- Only heading levels 4-6 are checked. Top-level chapter numbering remains the
  responsibility of the existing chapter/heading validators.
- If a level-4/5/6 heading appears inside a numbered section tree, it must
  itself begin with a numeric or appendix-style section identifier.
- Code fences are ignored.

Examples:
- valid:   `##### 26.7.4 Mode Deep Dives`
- valid:   `###### 26.7.4.1 Push vs. Ping: The Payload Trade-Off`
- invalid: `###### Push vs. Ping: The Payload Trade-Off`
"""

from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


HEADING_RE = re.compile(r"^(#{2,6})\s+(.*\S)\s*$")
NUMERIC_HEADING_RE = re.compile(r"^(§)?(\d+(?:\.\d+)*)([a-z]?)(?:\s+|$)")
APPENDIX_HEADING_RE = re.compile(r"^(§)?([A-Z])\.(\d+(?:\.\d+)*)([a-z]?)(?:\s+|$)")


@dataclass(frozen=True)
class NumberedId:
    series: str
    path: tuple[int, ...]
    suffix: str


@dataclass(frozen=True)
class Heading:
    line_no: int
    level: int
    text: str
    numbered_id: NumberedId | None


@dataclass(frozen=True)
class HeadingContext:
    level: int
    text: str
    line_no: int
    numbered_id: NumberedId | None
    numbered_ancestor: Heading | None


REPO_ROOT = Path(__file__).resolve().parent.parent


def parse_numbered_id(text: str) -> NumberedId | None:
    numeric = NUMERIC_HEADING_RE.match(text)
    appendix = APPENDIX_HEADING_RE.match(text)
    if numeric:
        return NumberedId(
            series="",
            path=tuple(int(part) for part in numeric.group(2).split(".")),
            suffix=numeric.group(3),
        )
    if appendix:
        return NumberedId(
            series=appendix.group(2),
            path=tuple(int(part) for part in appendix.group(3).split(".")),
            suffix=appendix.group(4),
        )
    return None


def iter_headings_from_text(text: str) -> list[Heading]:
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
        heading_text = match.group(2).strip()
        headings.append(
            Heading(
                line_no=line_no,
                level=level,
                text=heading_text,
                numbered_id=parse_numbered_id(heading_text),
            )
        )

    return headings


def get_staged_text(path: Path) -> str | None:
    result = subprocess.run(
        ["git", "show", f":{path.as_posix()}"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=REPO_ROOT,
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
        cwd=REPO_ROOT,
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


def format_numbered_id(numbered_id: NumberedId) -> str:
    path = ".".join(str(part) for part in numbered_id.path)
    if numbered_id.series:
        return f"{numbered_id.series}.{path}"
    return path


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
        headings = iter_headings_from_text(staged_text)
    else:
        changed_lines = None
        headings = iter_headings_from_text(file_path.read_text(encoding="utf-8"))

    errors: list[str] = []
    context_stack: dict[int, HeadingContext] = {}

    for heading in headings:
        for level in [level for level in context_stack if level >= heading.level]:
            del context_stack[level]

        parent_context = None
        for level in range(heading.level - 1, 0, -1):
            if level in context_stack:
                parent_context = context_stack[level]
                break

        numbered_ancestor = None
        if heading.numbered_id and not heading.numbered_id.suffix:
            numbered_ancestor = heading
        elif parent_context is not None:
            numbered_ancestor = parent_context.numbered_ancestor

        if (
            heading.level >= 4
            and heading.numbered_id is None
            and numbered_ancestor is not None
            and (changed_lines is None or heading.line_no in changed_lines)
        ):
            ancestor_id = format_numbered_id(numbered_ancestor.numbered_id)
            errors.append(
                f"L{heading.line_no}: Unnumbered nested subsection `{('#' * heading.level)} {heading.text}` "
                f"appears under numbered section `{ancestor_id}`. Headings at levels 4-6 inside numbered "
                f"section trees must carry explicit section IDs."
            )

        context_stack[heading.level] = HeadingContext(
            level=heading.level,
            text=heading.text,
            line_no=heading.line_no,
            numbered_id=heading.numbered_id,
            numbered_ancestor=numbered_ancestor,
        )

    return errors


def iter_default_files() -> list[Path]:
    return sorted(REPO_ROOT.glob("src/papers/**/DR-*.mdx"))


def display_path(path: Path) -> str:
    absolute = path.resolve().as_posix()
    prefix = f"{REPO_ROOT.as_posix().rstrip('/')}/"
    if absolute.startswith(prefix):
        return absolute[len(prefix):]
    return path.as_posix()


def main() -> int:
    args = sys.argv[1:]
    changed_only = False

    if args and args[0] == "--changed-only":
        changed_only = True
        args = args[1:]

    file_args = [Path(arg) for arg in args] if args else iter_default_files()
    if not file_args:
        print(
            f"Usage: {sys.argv[0]} [--changed-only] <file.mdx> [<file2.mdx> ...]",
            file=sys.stderr,
        )
        return 2

    total_errors = 0
    for file_path in file_args:
        errors = validate_file(file_path, changed_only=changed_only)
        if not errors:
            continue

        print("\n╔══════════════════════════════════════════════════════════════════╗")
        print("║  ❌ MISSING NESTED SECTION IDS                                  ║")
        print("╚══════════════════════════════════════════════════════════════════╝")
        print(f"\n{display_path(file_path)}:")
        for error in errors:
            print(f"  {error}")
        print("\nWHAT HAPPENED:")
        print("  Nested DR subsections at heading levels 4-6 inside numbered section")
        print("  trees were written as plain headings without their own explicit section")
        print("  identifiers. That makes the in-chapter outline inconsistent and weakens")
        print("  section-level cross-referencing discipline.")
        print("\nHOW TO FIX:")
        print("  1. Convert each flagged heading into the next appropriate numbered child")
        print("     section within its local parent series.")
        print("  2. Update any affected in-document references to use the new section ID.")
        print("  3. If the text is not a real subsection, rewrite it as prose, a list item,")
        print("     a bold lead-in, or a details block instead of a Markdown heading.")
        total_errors += len(errors)

    return 0 if total_errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
