#!/usr/bin/env python3
"""Validate that DR document chapters are sequentially numbered.

Convention: The deepest heading level that contains numbered chapters must start
at 1 and increment sequentially. This works across all DR documents regardless
of which heading level (##, ###, or ####) carries the chapter numbers.

Rules:
- Find the heading level that has "N. Title" numbered headings.
- Verify those numbers form a contiguous sequence starting from 1.
- The synthesis chapters (Findings, Recommendations, Open Questions) may appear
  as numbered entries at the chapter level OR as unnumbered entries at a higher
  heading level — either convention is accepted.
- Unnumbered headings at the same level as numbered chapters are NOT flagged,
  since they may be sub-sections within unnumbered parent groups.

Exit codes:
  0 = pass
  1 = validation failure
  2 = usage error
"""

import re
import sys


def validate_file(filepath: str) -> list[str]:
    """Return a list of error messages for chapter numbering issues."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Skip non-DR files
    basename = filepath.split('/')[-1]
    if not re.match(r'DR-\d{4}', basename):
        return []

    # Find the heading level used for numbered chapters
    # Scan the document for lines like "### N. Title" or "## N. Title"
    in_code = False
    numbered_levels: dict[int, list[tuple[int, int, str]]] = {}

    toc_end: int | None = None
    in_toc = False

    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith('```'):
            in_code = not in_code
            continue
        if in_code:
            continue

        # Track ToC region
        if re.match(r'^#{1,3}\s+Table of Contents', stripped, re.IGNORECASE):
            in_toc = True
            continue
        if in_toc and re.match(r'^#{1,2}\s+', stripped):
            toc_end = i
            in_toc = False

        # Skip headings inside ToC
        if in_toc or (toc_end is not None and i < toc_end):
            continue

        # Match headings at levels 2-4
        m = re.match(r'^(#{2,4})\s+(.*)', stripped)
        if not m:
            continue

        level = len(m.group(1))
        text = m.group(2).strip()

        # Check if this heading starts with "N. Title"
        num_match = re.match(r'^(\d+)\.\s+', text)
        if num_match:
            num = int(num_match.group(1))
            numbered_levels.setdefault(level, []).append((i, num, text))

    # If no numbered chapters found, that's fine (e.g., README.md)
    if not numbered_levels:
        return []

    errors: list[str] = []

    for chapter_level, chapters in sorted(numbered_levels.items()):
        # Rule 1: Sequential numbering starting from 1
        expected = 1
        for line_num, actual_num, text in chapters:
            if actual_num != expected:
                errors.append(
                    f'  L{line_num}: Expected chapter {expected}, found {actual_num} '
                    f'in `{"#" * chapter_level} {text}`'
                )
            expected = actual_num + 1

    return errors


def main() -> int:
    if len(sys.argv) < 2:
        print(f'Usage: {sys.argv[0]} <file.md> [<file2.md> ...]', file=sys.stderr)
        return 2

    total_errors = 0
    for filepath in sys.argv[1:]:
        errors = validate_file(filepath)
        if errors:
            print(f'\n╔══════════════════════════════════════════════════════════════════╗')
            print(f'║  ❌ CHAPTER NUMBERING ERRORS                                     ║')
            print(f'╚══════════════════════════════════════════════════════════════════╝')
            print(f'\n{filepath}:')
            for e in errors:
                print(e)
            print('\nWHAT HAPPENED:')
            print('  DR document chapters must be sequentially numbered starting from 1.')
            print('  The numbered chapters appear at the heading level that has')
            print('  "N. Title" entries (e.g., "### 1. Introduction" or "## 1. Introduction").')
            print('\nHOW TO FIX:')
            print('  1. Add sequential numbers to all chapter headings: "1. Title", "2. Title", etc.')
            print('  2. Update the Table of Contents to match.')
            total_errors += len(errors)

    if total_errors == 0:
        return 0

    return 1


if __name__ == '__main__':
    sys.exit(main())
