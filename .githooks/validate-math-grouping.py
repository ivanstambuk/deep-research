#!/usr/bin/env python3
r"""Validate malformed escaped grouping inside LaTeX math.

This catches a narrow class of mechanically broken math such as:

- `10^\{-6\}` instead of `10^{-6}`
- `q_\{verify\}` instead of `q_{verify}`
- `\text\{stored\}` instead of `\text{stored}`
- `1\{,\}000\{,\}000` instead of `1{,}000{,}000`

The validator is intentionally conservative:
- it only scans lines that are in math context (`$...$` or `$$...$$`)
- it ignores fenced code blocks and inline code
- it only flags brace-escaping patterns that are syntactically wrong for
  grouped LaTeX constructs, not literal set braces like `\{0,1\}`
"""

from __future__ import annotations

import re
import sys
from typing import Iterable


BAD_SUPERSUB_RE = re.compile(r"(?<!\\)(\^|_)\\\{[^$\n]*?\\\}")
BAD_GROUPING_MACRO_RE = re.compile(r"\\([A-Za-z]+)(\\)?\\\{")
BAD_THOUSANDS_RE = re.compile(r"\d\\\{,\\\}\d")
INLINE_CODE_RE = re.compile(r"`[^`]*`")
ALLOWED_LITERAL_BRACE_MACROS = {
    "left",
    "right",
    "bigl",
    "bigr",
    "Bigl",
    "Bigr",
    "biggl",
    "biggr",
    "Biggl",
    "Biggr",
}


def iter_math_lines(lines: list[str]) -> Iterable[tuple[int, str]]:
    in_code = False
    in_display_math = False

    for index, raw_line in enumerate(lines, start=1):
        stripped = raw_line.strip()

        if stripped.startswith("```"):
            in_code = not in_code
            continue

        if in_code:
            continue

        line = INLINE_CODE_RE.sub("", raw_line)

        if "$$" in line:
            yield index, line
            # Toggle for odd counts of standalone $$ delimiters on the line.
            if line.count("$$") % 2 == 1:
                in_display_math = not in_display_math
            continue

        if in_display_math or "$" in line:
            yield index, line


def find_failures(filepath: str) -> list[tuple[int, str, str]]:
    with open(filepath, "r", encoding="utf-8") as handle:
        lines = handle.readlines()

    failures: list[tuple[int, str, str]] = []

    for line_num, line in iter_math_lines(lines):
        stripped = line.strip()

        for match in BAD_SUPERSUB_RE.finditer(line):
            failures.append((line_num, "escaped superscript/subscript grouping", match.group(0)))

        for match in BAD_GROUPING_MACRO_RE.finditer(line):
            if match.group(1) in ALLOWED_LITERAL_BRACE_MACROS:
                continue
            failures.append((line_num, "escaped macro grouping", match.group(0)))

        for match in BAD_THOUSANDS_RE.finditer(line):
            failures.append((line_num, "escaped numeric grouping", match.group(0)))

        # Deduplicate repeated findings on the same line/snippet while preserving order.
        seen = set()
        deduped = []
        for failure in failures:
            key = (failure[0], failure[1], failure[2])
            if key in seen:
                continue
            seen.add(key)
            deduped.append(failure)
        failures = deduped

    return failures


def print_failures(filepath: str, failures: list[tuple[int, str, str]]) -> None:
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  ❌ CHECK 31: Malformed LaTeX grouping detected                 ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print("")
    print(f"  File: {filepath}")
    print("")
    print("  WHAT HAPPENED:")
    print("    Math contains backslash-escaped braces where LaTeX expects normal")
    print("    grouping braces. These expressions often render as red error text.")
    print("")
    print("  HOW TO FIX:")
    print("    Use normal grouping braces for LaTeX syntax:")
    print("      `10^\\\\{-6\\\\}`        -> `10^{-6}`")
    print("      `q_\\\\{verify\\\\}`     -> `q_{verify}`")
    print("      `\\\\text\\\\{stored\\\\}` -> `\\\\text{stored}`")
    print("      `1\\\\{,\\\\}000`        -> `1{,}000`")
    print("")
    for line_num, category, snippet in failures:
        print(f"  Line {line_num}: {category}: {snippet}")
    print("")


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        return 0

    had_failures = False

    for filepath in argv[1:]:
        failures = find_failures(filepath)
        if failures:
            print_failures(filepath, failures)
            had_failures = True

    return 1 if had_failures else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
