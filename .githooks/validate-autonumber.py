#!/usr/bin/env python3
"""Pre-commit guardrail: enforce `autonumber` in all Mermaid sequence diagrams.

Every ```mermaid block containing `sequenceDiagram` must also contain the
`autonumber` directive. This ensures consistent, automatic step numbering
across all diagrams in DR documents.

Usage:
    python3 .githooks/validate-autonumber.py <file.md>
"""

import sys


def check_file(filepath: str) -> list[str]:
    """Return a list of error strings for sequenceDiagrams missing autonumber."""
    errors = []
    try:
        with open(filepath, encoding="utf-8") as f:
            lines = f.readlines()
    except (OSError, UnicodeDecodeError):
        return errors

    in_mermaid = False
    mermaid_start = 0
    has_sequence = False
    has_autonumber = False

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()

        if stripped == "```mermaid":
            in_mermaid = True
            mermaid_start = i
            has_sequence = False
            has_autonumber = False
            continue

        if in_mermaid and stripped == "```":
            # End of mermaid block — check if it was a sequenceDiagram
            if has_sequence and not has_autonumber:
                errors.append(
                    f"  {filepath}:{mermaid_start}: sequenceDiagram is missing `autonumber` directive.\n"
                    f"    Fix: Add `autonumber` on the line immediately after `sequenceDiagram`.\n"
                    f"    Example:\n"
                    f"      sequenceDiagram\n"
                    f"          autonumber"
                )
            in_mermaid = False
            continue

        if not in_mermaid:
            continue

        if stripped == "sequenceDiagram":
            has_sequence = True
        if stripped == "autonumber":
            has_autonumber = True

    return errors


def main() -> int:
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file.md>", file=sys.stderr)
        return 2

    filepath = sys.argv[1]
    errors = check_file(filepath)

    if errors:
        print(
            "╔══════════════════════════════════════════════════════════════════╗\n"
            "║  ❌ MISSING AUTONUMBER IN SEQUENCE DIAGRAM                     ║\n"
            "╚══════════════════════════════════════════════════════════════════╝\n"
        )
        print("\n\n".join(errors))
        print(
            "\n\nWHY: All sequence diagrams must use Mermaid's `autonumber` directive\n"
            "for consistent, automatic step numbering. Manual numbering in arrow\n"
            "labels is fragile and falls out of sync when steps are added or removed.\n"
            "\nHOW TO FIX:\n"
            "  1. Open the file and find the sequenceDiagram block listed above\n"
            "  2. Add `autonumber` on the line after `sequenceDiagram`\n"
            "  3. Remove any manual step numbers from arrow labels (e.g., '1. ' prefix)\n"
            f"  4. Re-validate: python3 .githooks/validate-autonumber.py {filepath}"
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
