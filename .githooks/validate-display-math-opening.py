#!/usr/bin/env python3
r"""Validate multiline display-math openings in Markdown/MDX authoring files.

This repository allows single-line display math such as:

    $$E = mc^2$$

But multiline display math must open with a bare `$$` on its own line:

    $$
    \begin{aligned}
    ...
    \end{aligned}
    $$

Opening a multiline block as `$$\begin{aligned}` can be misparsed by the
Markdown/KaTeX pipeline, causing the environment opener to be dropped and the
remaining block to render as red raw-text fallback.
"""

from __future__ import annotations

import sys


def find_failures(filepath: str) -> list[tuple[int, str]]:
    with open(filepath, "r", encoding="utf-8") as handle:
        lines = handle.readlines()

    failures: list[tuple[int, str]] = []
    in_code = False
    in_display_math = False

    for line_num, raw_line in enumerate(lines, start=1):
        stripped = raw_line.strip()

        if stripped.startswith("```"):
            in_code = not in_code
            continue

        if in_code:
            continue

        delimiter_count = raw_line.count("$$")
        if delimiter_count == 0:
            continue

        if not in_display_math:
            if delimiter_count >= 2:
                # Single-line display math block. This is allowed.
                continue

            if stripped == "$$":
                in_display_math = True
                continue

            if stripped.startswith("$$"):
                failures.append((line_num, stripped[:160]))
                in_display_math = True
                continue

            # Stray closing delimiter or unsupported shape; leave to other checks.
            continue

        if delimiter_count % 2 == 1:
            in_display_math = False

    return failures


def print_failures(filepath: str, failures: list[tuple[int, str]]) -> None:
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  ❌ CHECK 32: Multiline display math opens incorrectly          ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print("")
    print(f"  File: {filepath}")
    print("")
    print("  WHAT HAPPENED:")
    print("    A multiline `$$` display-math block starts on the same line as")
    print("    math content. In this repo's Markdown/KaTeX pipeline, that can")
    print("    drop the opening environment and render the block as red text.")
    print("")
    print("  HOW TO FIX:")
    print("    For multiline display math, put `$$` on its own line.")
    print("")
    print("    Wrong:")
    print("      $$\\begin{aligned}")
    print("      ...")
    print("      \\end{aligned}$$")
    print("")
    print("    Right:")
    print("      $$")
    print("      \\begin{aligned}")
    print("      ...")
    print("      \\end{aligned}")
    print("      $$")
    print("")
    for line_num, snippet in failures:
        print(f"  Line {line_num}: {snippet}")
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
