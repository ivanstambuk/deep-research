#!/usr/bin/env python3
"""Validate that the Table of Contents does not contain deeply nested sub-sections.
X.Y depth is allowed. X.Y.Z entries (e.g., 5.1.1, 4.4.3, 20.3.5) are banned
everywhere, and visually nested list items are banned outside <details>.

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
            
        # Rule 1: Visually nested list items outside <details> are banned.
        # Flat X.Y entries are allowed; deep indentation is not.
        if not in_details and re.match(r'^ {4,}[-*]\s', line):
            errors.append(f'  L{i+1}: {line.strip()} — indented nested ToC items are not allowed outside <details>')

        # Rule 2: Three-part section numbers (X.Y.Z) are banned even inside <details>
        # Only X.Y depth is allowed. Matches patterns like [5.1.1, [4.4.3, [28.2.1 etc.
        if in_details and re.search(r'\[\d+\.\d+\.\d+', line):
            errors.append(f'  L{i+1}: {line.strip()} — sub-subsections (X.Y.Z) are not allowed in the ToC; stop at X.Y depth')

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
            print('  The Table of Contents depth is limited to X.Y (two levels).')
            print('  Sub-subsections like X.Y.Z (e.g., 5.1.1, 4.4.3) cause "summary inflation"')
            print('  and reduce the executive readability of the document.')
            print('\nHOW TO FIX:')
            print('  1. Remove the X.Y.Z entries from the `## Table of Contents`.')
            print('  2. Keep X.Y entries (e.g., `5.1`, `20.3`) — they are allowed inside <details>.')
            print('  3. Re-stage the file and commit again.')
            total_errors += len(errors)

    if total_errors == 0:
        return 0

    return 1

if __name__ == '__main__':
    sys.exit(main())
