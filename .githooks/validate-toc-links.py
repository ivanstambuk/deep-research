#!/usr/bin/env python3
"""Validate that all Table of Contents anchor links in a Markdown file
resolve to actual headings.

Uses a standard GitHub-compatible Markdown slugifier:
  1. Lowercase the heading text
  2. Strip inline Markdown formatting (bold, italic, links, code)
  3. Remove everything that isn't a word character (\\w), space, or hyphen
  4. Collapse consecutive spaces and hyphens into a single hyphen

Exit code 0  = all links valid
Exit code 1  = at least one broken link found
Exit code 2  = usage error

Usage:
  python3 validate-toc-links.py <file.md> [<file2.md> ...]
"""

import re
import sys


def heading_to_anchor(text: str) -> str:
    """Convert a Markdown heading to its standard GitHub-compatible anchor."""
    # Strip inline formatting
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)       # **bold**
    text = re.sub(r'\*(.*?)\*', r'\1', text)            # *italic*
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)     # [link](url)
    text = re.sub(r'`(.*?)`', r'\1', text)              # `code`

    text = text.lower()
    # Remove everything that isn't a word character, space, or hyphen
    text = re.sub(r'[^\w\s\-]', '', text)
    # Collapse consecutive spaces and hyphens into a single hyphen
    text = re.sub(r'[-\s]+', '-', text).strip('-')
    return text


def validate_file(filepath: str) -> list[str]:
    """Return a list of error messages for broken ToC links."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Build set of all heading anchors
    anchors: set[str] = set()
    for line in lines:
        m = re.match(r'^(#{1,6})\s+(.*)', line)
        if m:
            anchors.add(heading_to_anchor(m.group(2).strip()))

    # Find ToC region: starts at "## Table of Contents" heading,
    # ends at next heading of equal or higher level (## or #)
    toc_start = None
    toc_end = None
    for i, line in enumerate(lines):
        if toc_start is None:
            if re.match(r'^#{1,3}\s+Table of Contents', line, re.IGNORECASE):
                toc_start = i + 1
        else:
            if re.match(r'^#{1,2}\s+', line):
                toc_end = i
                break

    if toc_start is None:
        return []  # No ToC found — nothing to validate

    if toc_end is None:
        toc_end = len(lines)

    # Check every anchor link in the ToC region
    errors: list[str] = []
    for i in range(toc_start, toc_end):
        line = lines[i]
        for m in re.finditer(r'\[([^\]]+)\]\(#([^)]+)\)', line):
            link_text = m.group(1)
            anchor = m.group(2)
            if anchor not in anchors:
                # Try to find a close match for a helpful suggestion
                suggestion = ''
                candidates = [a for a in anchors if a.startswith(anchor[:15])]
                if candidates:
                    best = min(candidates, key=lambda a: abs(len(a) - len(anchor)))
                    suggestion = f'\n         fix → [(#{best})]\n'
                errors.append(
                    f'  L{i+1}: [{link_text}](#{anchor}) — no matching heading{suggestion}'
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
            print(f'❌ {filepath} — {len(errors)} broken ToC link(s):')
            for e in errors:
                print(e)
            total_errors += len(errors)

    if total_errors == 0:
        return 0

    print(f'\n{total_errors} broken ToC link(s) found. Fix the anchors.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
