#!/usr/bin/env python3
"""Validate that Mermaid diagrams do not contain visible escape sequences.

Mermaid flowcharts, graphs, and most diagram types treat \\n as literal text
(the two characters backslash + n), NOT as a line break. This produces ugly
rendered output like "Layer 1\\nProtocol Errors" instead of a proper multiline
label.

Literal Unicode escapes such as \\u0026nbsp; and \\u0026amp; are also rendered
as visible text in Mermaid labels, producing viewer output like
"1.\\u0026nbsp;Build\\u0026nbsp;Request".

For actual line breaks inside Mermaid node labels, use <br> or <br/>.
For simple separation, replace \\n with a space.
"""

import sys
import re

UNICODE_ESCAPE_RE = re.compile(r'\\u[0-9a-fA-F]{4}')


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
            # Detect visible escape sequences:
            # - literal \n (the two-character sequence: backslash + n)
            # - literal \uXXXX Unicode escapes such as \u0026nbsp;
            # Skip comment lines (starting with %% in Mermaid).
            if stripped.startswith('%%'):
                continue
            matched = []
            if '\\n' in line:
                matched.append(r'\n')
            matched.extend(sorted(set(UNICODE_ESCAPE_RE.findall(line))))
            if matched:
                failures.append((i, ', '.join(matched), stripped))

    if failures:
        print("╔══════════════════════════════════════════════════════════════════╗")
        print("║  ❌ MERMAID VISIBLE ESCAPE SEQUENCE DETECTED                    ║")
        print("╚══════════════════════════════════════════════════════════════════╝")
        print(f"\nAffected file: {filepath}\n")
        print("WHAT HAPPENED:")
        print("  You used a literal escape sequence inside a Mermaid diagram.")
        print("  Mermaid renders escapes as visible text instead of decoding them.")
        print("  This produces ugly labels like:")
        print('    "Layer 1\\nProtocol Errors" instead of a proper multiline label.\n')
        print('    "1.\\u0026nbsp;Build\\u0026nbsp;Request" instead of "1. Build Request".\n')
        print("HOW TO FIX:")
        print("  • If no line break is needed: replace \\n with a space")
        print("    Example: Layer 1\\nProtocol Errors  →  Layer 1 Protocol Errors")
        print("  • To force a line break in a node label: use <br> or <br/>")
        print("    Example: Layer 1\\nProtocol Errors  →  Layer 1<br>Protocol Errors\n")
        print("  • Replace literal Unicode escapes with the intended character")
        print("    Example: \\u0026nbsp;  →  space")
        print("    Example: \\u0026amp;   →  &\n")

        for line_num, matched, content in failures:
            print(f"   Line {line_num} ({matched}): {content}")
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
