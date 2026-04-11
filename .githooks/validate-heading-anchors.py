#!/usr/bin/env python3
"""Detect Markdown headings that will produce broken anchors in VS Code.

When a special character (em dash, ampersand, slash, etc.) is flanked by
spaces in a heading, removing the character leaves two adjacent spaces that
become a double hyphen ('--') in the anchor.  VS Code's markdown-it slugifier
does NOT collapse consecutive hyphens, so any ToC link using the collapsed
(GitHub-style) anchor will silently break.

This script scans all headings in each file and reports those containing
space-flanked special characters, with a concrete fix suggestion for each.

Exit code 0  = all headings clean
Exit code 1  = at least one problematic heading found
Exit code 2  = usage error

Usage:
  python3 validate-heading-anchors.py <file.md> [<file2.md> ...]
"""

import re
import sys

# Characters that are stripped by both GitHub and VS Code anchor algorithms,
# and that commonly appear flanked by spaces in English prose headings.
# Pattern: a space, one of these chars, then a space.
PROBLEM_PATTERNS = [
    (r' — ',  '` — ` (em dash)',    '`: ` or remove em dash'),
    (r' – ',  '` – ` (en dash)',    '`: ` or remove en dash'),
    (r' & ',  '` & ` (ampersand)',  '` and `'),
    (r' / ',  '` / ` (slash)',      '`/` (no spaces) or ` and `'),
    (r' \+ ', '` + ` (plus)',       '` and `'),
    (r' → ',  '` → ` (arrow)',     '`-to-` or remove arrow'),
    (r' ← ',  '` ← ` (arrow)',     'remove arrow'),
    (r' ↔ ',  '` ↔ ` (arrow)',     'remove arrow'),
]


def validate_file(filepath: str) -> list[str]:
    """Return a list of error messages for problematic headings."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    errors: list[str] = []
    in_code_block = False
    for i, line in enumerate(lines):
        # Track fenced code blocks (``` or ~~~)
        stripped = line.strip()
        if stripped.startswith('```') or stripped.startswith('~~~'):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            continue
        if not line.startswith('#'):
            continue
        heading_text = line.strip()
        for pattern, char_desc, fix in PROBLEM_PATTERNS:
            if re.search(pattern, heading_text):
                errors.append(
                    f'  L{i+1}: {heading_text}\n'
                    f'         Problem:  {char_desc} flanked by spaces → produces "--" in anchor\n'
                    f'         Fix:      replace with {fix}'
                )
    return errors


def main() -> int:
    if len(sys.argv) < 2:
        print(f'Usage: {sys.argv[0]} <file.md> [<file2.md> ...]', file=sys.stderr)
        return 2

    total_errors = 0
    for filepath in sys.argv[1:]:
        errors = validate_file(filepath)
        if errors:
            print(f'⚠️  {filepath} — {len(errors)} heading(s) with double-hyphen anchors:')
            print()
            for e in errors:
                print(e)
                print()
            total_errors += len(errors)

    if total_errors == 0:
        return 0

    print('WHY THIS MATTERS:')
    print('  VS Code\'s Markdown renderer does NOT collapse consecutive hyphens')
    print('  in anchor IDs.  When a special character flanked by spaces (e.g.,')
    print('  " — ") is removed to produce the anchor, the two flanking spaces')
    print('  become "--".  Any ToC link using the collapsed single-hyphen anchor')
    print('  will silently break in VS Code (even though it works on GitHub).')
    print()
    print('HOW TO FIX:')
    print('  Replace the space-flanked special character with a non-problematic')
    print('  alternative.  Common substitutions:')
    print('    " — " (em dash)  →  ": "      Example: Framework: AI Act Mapping')
    print('    " & " (ampersand) →  " and "   Example: Identity and Delegation')
    print('    " / " (slash)    →  "/"        Example: Auth0/Okta')
    print('    " + " (plus)     →  " and "    Example: MCP and A2A')
    print()
    print(f'{total_errors} heading(s) need fixing.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
