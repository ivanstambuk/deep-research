#!/usr/bin/env python3
"""Validate naming conventions for DR documents.

DR documents live in subdirectories under papers/:
  papers/DR-NNNN/DR-NNNN-kebab-case-title.md

Checks:
  1. Filename matches pattern: DR-NNNN-<kebab-case-title>.md
  2. DR prefix uses uppercase "DR" (not "dr", "Dr", etc.)
  3. ID is a 4-digit zero-padded number (0001–9999)
  4. Title portion uses kebab-case (lowercase, hyphens, no underscores/spaces)
  5. File extension is .md
  6. Subdirectory name matches DR-NNNN (same ID as in the filename)

Usage:
  python3 .githooks/validate-naming.py papers/DR-0001/DR-0001-some-title.md [...]

Exit codes:
  0 — all checks passed
  1 — one or more checks failed (details printed to stderr)
"""

import re
import sys
from pathlib import Path

# Pattern: DR-NNNN-kebab-case-title.md
#   - DR must be uppercase
#   - NNNN is exactly 4 digits, zero-padded
#   - Title is lowercase letters, digits, and hyphens (no underscores, no uppercase)
#   - Must end with .md
FILENAME_PATTERN = re.compile(
    r"^DR-(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$"
)

# Subdirectory pattern: DR-NNNN
DIR_PATTERN = re.compile(r"^DR-(\d{4})$")


def is_dr_file(filepath: Path) -> bool:
    """Check if a file is inside the papers/DR-NNNN/ structure."""
    parts = filepath.parts
    # Look for papers/DR-NNNN/filename pattern anywhere in the path
    for i, part in enumerate(parts):
        if part == "papers" and i + 2 < len(parts):
            if DIR_PATTERN.match(parts[i + 1]):
                return True
    return False


def validate_filename(filepath: Path) -> list[str]:
    """Validate a single filename. Returns a list of error messages."""
    errors = []
    name = filepath.name

    # Skip non-papers files (e.g., README.md, AGENTS.md)
    # This validator checks files in papers/DR-NNNN/ subdirectories
    if not is_dr_file(filepath):
        return []

    # Allow non-.md files (e.g., DR-0002-spec.yaml) — only validate .md files
    if not name.endswith(".md"):
        return []

    parent_name = filepath.parent.name  # e.g., "DR-0001"

    # Validate subdirectory name
    dir_match = DIR_PATTERN.match(parent_name)
    if not dir_match:
        errors.append(
            f"Subdirectory '{parent_name}' does not match the pattern 'DR-NNNN'. "
            f"DR documents must live in papers/DR-NNNN/ subdirectories."
        )

    m = FILENAME_PATTERN.match(name)
    if not m:
        # Provide specific guidance on what's wrong
        if name.startswith("dr-") or name.startswith("Dr-"):
            errors.append(
                f"DR prefix must be uppercase 'DR', not '{name[:2]}'. "
                f"Rename to: {name[0].upper()}{name[1].upper()}{name[2:]}"
            )
        elif not name.startswith("DR-"):
            errors.append(
                f"Filename must start with 'DR-NNNN-'. "
                f"Got: '{name}'"
            )
        elif re.match(r"^DR-\d+-", name):
            # Has DR- prefix but wrong digit count
            digit_match = re.match(r"^DR-(\d+)-", name)
            if digit_match:
                digits = digit_match.group(1)
                if len(digits) != 4:
                    errors.append(
                        f"DR ID must be exactly 4 digits (zero-padded). "
                        f"Got: 'DR-{digits}'. "
                        f"Expected: 'DR-{digits.zfill(4)}'"
                    )
        else:
            errors.append(
                f"Filename '{name}' does not match the pattern "
                f"'DR-NNNN-kebab-case-title.md'"
            )

        # Check for common naming issues
        if "_" in name:
            errors.append(
                "Filename contains underscores. Use hyphens (kebab-case) instead."
            )
        if re.search(r"[A-Z]", name[3:]):  # Skip "DR-" prefix
            # Check for uppercase after the DR- prefix
            title_part = name[8:-3] if len(name) > 11 else name[3:]  # After DR-NNNN-
            if re.search(r"[A-Z]", title_part):
                errors.append(
                    f"Title portion must be lowercase (kebab-case). "
                    f"Got: '{title_part}'. "
                    f"Expected: '{title_part.lower()}'"
                )
        if " " in name:
            errors.append(
                "Filename contains spaces. Use hyphens instead."
            )
    else:
        # Filename is valid — check that filename DR ID matches subdirectory DR ID
        file_id = m.group(1)  # e.g., "0001"
        if dir_match:
            dir_id = dir_match.group(1)  # e.g., "0001"
            if file_id != dir_id:
                errors.append(
                    f"Filename DR ID (DR-{file_id}) does not match subdirectory "
                    f"DR ID ({parent_name}). "
                    f"Files must be in their matching subdirectory."
                )

    return errors


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file.md> [<file2.md> ...]", file=sys.stderr)
        sys.exit(2)

    all_passed = True

    for filepath_str in sys.argv[1:]:
        filepath = Path(filepath_str)
        if not filepath.exists():
            continue

        errors = validate_filename(filepath)
        if errors:
            all_passed = False
            print(
                "╔══════════════════════════════════════════════════════════════════╗",
                file=sys.stderr,
            )
            print(
                "║  ❌ NAMING CONVENTION VIOLATION                                 ║",
                file=sys.stderr,
            )
            print(
                "╚══════════════════════════════════════════════════════════════════╝",
                file=sys.stderr,
            )
            print("", file=sys.stderr)
            print(f"  File: {filepath}", file=sys.stderr)
            print("", file=sys.stderr)
            for err in errors:
                print(f"  • {err}", file=sys.stderr)
            print("", file=sys.stderr)
            print("DIRECTORY AND FILE NAMING CONVENTION:", file=sys.stderr)
            print("  papers/DR-NNNN/DR-NNNN-short-kebab-title.md", file=sys.stderr)
            print("", file=sys.stderr)
            print("  Rules:", file=sys.stderr)
            print("  • Each DR lives in its own papers/DR-NNNN/ subdirectory", file=sys.stderr)
            print("  • 'DR' prefix must be uppercase", file=sys.stderr)
            print("  • NNNN is a 4-digit zero-padded number (0001–9999)", file=sys.stderr)
            print("  • Title uses kebab-case: lowercase letters, digits, hyphens only", file=sys.stderr)
            print("  • No underscores, no spaces, no uppercase in title", file=sys.stderr)
            print("  • File extension must be .md", file=sys.stderr)
            print("  • Filename DR ID must match subdirectory DR ID", file=sys.stderr)
            print("", file=sys.stderr)
            print("EXAMPLES:", file=sys.stderr)
            print("  ✅ papers/DR-0001/DR-0001-mcp-authentication-authorization.md", file=sys.stderr)
            print("  ✅ papers/DR-0042/DR-0042-api-gateway-comparison.md", file=sys.stderr)
            print("  ❌ papers/DR-0001/dr-0001-mcp-auth.md          (lowercase 'dr')", file=sys.stderr)
            print("  ❌ papers/DR-0001/DR-1-mcp-auth.md             (ID not zero-padded)", file=sys.stderr)
            print("  ❌ papers/DR-0002/DR-0001-mcp-auth.md          (ID mismatch with directory)", file=sys.stderr)
            print("", file=sys.stderr)
            print("HOW TO FIX:", file=sys.stderr)
            print(f"  Rename the file to match the convention, then update git:", file=sys.stderr)
            print(f"    git mv '{filepath}' 'papers/DR-NNNN/DR-NNNN-new-title.md'", file=sys.stderr)
            print(
                f"  Re-validate: python3 .githooks/validate-naming.py {filepath}",
                file=sys.stderr,
            )
            print("", file=sys.stderr)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()

