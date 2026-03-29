#!/usr/bin/env python3
"""Validate Appendix grouping and terminology in DR documents.

Rules:
  1. Appendix headings must live under their own `## Appendices` group
     heading — NOT under `## Synthesis and Conclusions` or any other
     conceptual group.
  2. The term "Annex" / "Annexes" is FORBIDDEN — all documents must
     use "Appendix" / "Appendices" consistently.

Exit code 0  = all good
Exit code 1  = at least one violation found
Exit code 2  = usage error
"""

import re
import sys

# Group headings under which Appendices are FORBIDDEN
FORBIDDEN_PARENTS = re.compile(
    r'^##\s+.*[Ss]ynthesis.*[Cc]onclusion', re.IGNORECASE
)

# Appendix chapter headings (### level) — only "Appendix" is allowed
APPENDIX_HEADING = re.compile(
    r'^###\s+(Appendix|Annex)\s+[A-Z]', re.IGNORECASE
)

# Annex/Annexes terminology — FORBIDDEN (use Appendix/Appendices instead)
ANNEX_HEADING = re.compile(
    r'^#{2,3}\s+(Annexes?|Annex\b)\b', re.IGNORECASE
)

# The approved standalone group heading
APPROVED_GROUP = re.compile(
    r'^##\s+Appendices\b', re.IGNORECASE
)


def validate_file(filepath: str) -> list[str]:
    """Return a list of error messages for misplaced or misnamed appendix headings."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    errors: list[str] = []

    # Track the full nesting: we need to know if we're between
    # a forbidden ## parent and the next ## heading.
    in_forbidden_group = False
    forbidden_group_line = 0

    # First pass: check if the file has any appendix/annex headings at all
    has_appendices = any(APPENDIX_HEADING.match(line) for line in lines)
    if not has_appendices:
        return []

    # Second pass: detect violations
    in_code_block = False
    for i, line in enumerate(lines):
        stripped = line.rstrip('\n')

        # Track fenced code blocks — skip headings inside them
        if re.match(r'^```', stripped):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            continue

        # Check for forbidden "Annex" / "Annexes" terminology in headings
        m_annex = ANNEX_HEADING.match(stripped)
        if m_annex:
            heading_text = stripped.lstrip('#').strip()
            errors.append(
                f'  L{i + 1}: `{heading_text}` uses "Annex" terminology. '
                f'Use "Appendix" / "Appendices" instead.'
            )

        # Track ## headings
        m_h2 = re.match(r'^##\s+(.*)', stripped)
        if m_h2:
            # If we were in a forbidden group and it's ending, reset
            if in_forbidden_group:
                in_forbidden_group = False

            # Check if this new ## is a forbidden parent
            if FORBIDDEN_PARENTS.match(stripped):
                in_forbidden_group = True
                forbidden_group_line = i + 1

            continue

        # Check ### headings for misplaced appendices
        if in_forbidden_group and APPENDIX_HEADING.match(stripped):
            heading_text = stripped.lstrip('#').strip()
            errors.append(
                f'  L{i + 1}: `{heading_text}` is nested under a Synthesis/Conclusions group '
                f'(started at L{forbidden_group_line}). '
                f'Appendices must have their own `## Appendices` group heading.'
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
            print(f'\n╔══════════════════════════════════════════════════════════════════╗')
            print(f'║  ❌ APPENDIX GROUPING VIOLATION                                 ║')
            print(f'╚══════════════════════════════════════════════════════════════════╝')
            print(f'\n{filepath}:')
            for e in errors:
                print(e)
            print('\nWHAT HAPPENED:')
            print('  One or more Appendix grouping/terminology rules were violated:')
            print('  1. Appendix headings must NOT be nested under the')
            print('     "Synthesis and Conclusions" group. They need their own')
            print('     `## Appendices` group heading.')
            print('  2. "Annex" / "Annexes" is forbidden — use "Appendix" / "Appendices".')
            print('\nHOW TO FIX:')
            print('  1. Replace any "Annex" / "Annexes" headings with "Appendix" / "Appendices".')
            print('  2. Close the "Synthesis and Conclusions" section after the last')
            print('     analytical chapter (Findings / Recommendations / Open Questions).')
            print('  3. Insert a new `## Appendices` heading before the first appendix.')
            print('  4. In the Table of Contents, add a top-level entry:')
            print('       - [Appendices](#appendices)')
            print('  5. Indent the appendix entries under it (2-space indent).')
            total_errors += len(errors)

    if total_errors == 0:
        return 0

    return 1


if __name__ == '__main__':
    sys.exit(main())
