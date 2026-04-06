#!/usr/bin/env python3
"""Validate that Mermaid diagrams do not contain literal \\n escape sequences.

Mermaid flowcharts, graphs, and most diagram types treat \\n as literal text
(the two characters backslash + n), NOT as a line break. This produces ugly
rendered output like "Layer 1\\nProtocol Errors" instead of a proper multiline
label.

For actual line breaks inside Mermaid node labels, use <br> or <br/>.
For simple separation, replace \\n with a space.
"""

import sys
import re


def validate_mermaid_newline_escapes(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    failures = []
    in_mermaid = False
    block_start = 0

    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith('```mermaid'):
            in_mermaid = True
            block_start = i
            continue
        if in_mermaid and stripped == '```':
            in_mermaid = False
            continue

        if in_mermaid:
            # Detect literal \n (the two-character sequence: backslash + n).
            # In Python strings read from file, this appears as '\\n'.
            # Skip comment lines (starting with %% in Mermaid).
            if not stripped.startswith('%%') and '\\n' in line:
                failures.append((i, stripped))

    if failures:
        print("╔══════════════════════════════════════════════════════════════════╗")
        print("║  ❌ MERMAID LITERAL \\n ESCAPE DETECTED                          ║")
        print("╚══════════════════════════════════════════════════════════════════╝")
        print(f"\nAffected file: {filepath}\n")
        print("WHAT HAPPENED:")
        print("  You used literal \\n (backslash + n) inside a Mermaid diagram.")
        print("  Mermaid renders this as the two visible characters '\\n' instead")
        print("  of creating a line break. This produces ugly labels like:")
        print('    "Layer 1\\nProtocol Errors" instead of a proper multiline label.\n')
        print("HOW TO FIX:")
        print("  • If no line break is needed: replace \\n with a space")
        print("    Example: Layer 1\\nProtocol Errors  →  Layer 1 Protocol Errors")
        print("  • To force a line break in a node label: use <br> or <br/>")
        print("    Example: Layer 1\\nProtocol Errors  →  Layer 1<br>Protocol Errors\n")

        for line_num, content in failures:
            print(f"   Line {line_num}: {content}")
        print("")
        return False

    return True


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 validate-mermaid-newline-escapes.py <file.md>")
        sys.exit(1)

    if not validate_mermaid_newline_escapes(sys.argv[1]):
        sys.exit(1)

    sys.exit(0)
