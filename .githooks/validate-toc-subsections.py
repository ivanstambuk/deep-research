#!/usr/bin/env python3
"""Validate that the Table of Contents does not contain sub-sections.
Top-level chapters only. Sections like 19.1 or 9.2.1 are banned from the ToC.

Exit code 0  = all good
Exit code 1  = at least one sub-section found
Exit code 2  = usage error
"""

import re
import sys

def validate_file(filepath: str) -> list[str]:
    """Return a list of error messages for sub-sections in the ToC."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find ToC region: starts at "## Table of Contents" heading,
    # ends at next heading of equal or higher level (## or #)
    toc_start: int | None = None
    toc_end: int | None = None
    for i, line in enumerate(lines):
        if toc_start is None:
            if re.match(r'^#{1,3}\s+Table of Contents', line, re.IGNORECASE):
                toc_start = i + 1
        else:
            if re.match(r'^#{1,2}\s+', line):
                toc_end = i
                break

    if toc_start is None:
        return []  # No ToC found

    if toc_end is None:
        toc_end = len(lines)

    in_details = False
    errors: list[str] = []
    for i in range(toc_start, toc_end):
        line = lines[i]
        
        # Track if we are inside a <details> block
        if '<details>' in line:
            in_details = True
        
        # Skip empty lines
        if not line.strip():
            continue
            
        # Detect sub-sections: indented with 4+ spaces OR containing numbers like 19.1
        # Allow them if they are wrapped in a <details> block
        if not in_details and (re.match(r'^ {4,}[-*]\s', line) or re.search(r'-\s+\[\d+\.\d+', line)):
            errors.append(f'  L{i+1}: {line.strip()} — sub-sections are not allowed in the ToC outside <details>')

        if '</details>' in line:
            in_details = False

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
            print(f'║  ❌ SUB-SECTIONS DETECTED IN TABLE OF CONTENTS                   ║')
            print(f'╚══════════════════════════════════════════════════════════════════╝')
            print(f'\n{filepath}:')
            for e in errors:
                print(e)
            print('\nWHAT HAPPENED:')
            print('  The Table of Contents must only contain top-level chapters and sections.')
            print('  Deeply nested sub-sections (e.g., 9.2.1, 19.1) cause "summary inflation"')
            print('  and reduce the executive readability of the document.')
            print('\nHOW TO FIX:')
            print('  1. Remove these deeply nested items from the `## Table of Contents`.')
            print('  2. Leave the top-level chapters (e.g., `1.`, `19.`) intact.')
            print('  3. Re-stage the file and commit again.')
            total_errors += len(errors)

    if total_errors == 0:
        return 0

    return 1

if __name__ == '__main__':
    sys.exit(main())
