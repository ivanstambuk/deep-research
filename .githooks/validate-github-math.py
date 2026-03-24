#!/usr/bin/env python3
r"""Validate LaTeX math expressions for GitHub rendering compatibility.

GitHub uses a security-hardened MathJax subset that blocks certain macros
(e.g. \\operatorname). It also requires a blank line before $$ display math
to render it as a centered block rather than inline.

Check A: Blocked macros — \\operatorname is explicitly blocked by GitHub.
         Use \\text{} or \\mathrm{} instead.

Check B: Display math spacing — $$ on a line not preceded by a blank line
         renders as inline math on GitHub instead of a centered display block.
         This check ignores $$ inside Mermaid blocks, ```math fences, and
         consecutive $$ lines (multi-equation sequences).

Check C: Bad subscripts — Markdown eats backslash-escaped underscores (\_)
         before MathJax runs, causing 'allowed only in math mode' errors when
         used inside \text{...}. Use spaces or hyphens instead.
"""

import re
import sys


# Macros that GitHub's security-hardened MathJax blocks.
# Add new entries here as they are discovered.
BLOCKED_MACROS = [
    r'\\operatorname',
    r'\\xmapsto',
]

BLOCKED_RE = re.compile('|'.join(BLOCKED_MACROS))
TEXT_UNDERSCORE_RE = re.compile(r'\\text\{[^\}]*\\_[^\}]*\}')


def check_blocked_macros(lines, filepath):
    """Check A: detect blocked LaTeX macros in math contexts."""
    failures = []
    in_mermaid = False
    in_code = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Track fenced code blocks (skip all code)
        if stripped.startswith('```'):
            if stripped.startswith('```mermaid'):
                in_mermaid = True
                continue
            if in_mermaid and stripped == '```':
                in_mermaid = False
                continue
            # Generic code fence toggle
            if not in_mermaid:
                in_code = not in_code
            continue

        if in_mermaid or in_code:
            continue

        # Check for blocked macros anywhere in the line (inline or display math)
        match = BLOCKED_RE.search(line)
        if match:
            failures.append((i + 1, match.group(), stripped[:120]))

    if failures:
        print(f"╔══════════════════════════════════════════════════════════════════╗")
        print(f"║  ❌ CHECK 21A: GitHub-blocked LaTeX macros detected             ║")
        print(f"╚══════════════════════════════════════════════════════════════════╝")
        print(f"")
        print(f"  File: {filepath}")
        print(f"")
        print(f"  GitHub uses a security-hardened MathJax that blocks certain macros.")
        print(f"  These render locally but show error boxes on GitHub.")
        print(f"")
        print(f"  HOW TO FIX:")
        print(f"    Replace \\operatorname{{X}} with \\text{{X}}")
        print(f"    (Both render upright roman text; \\text is GitHub-safe.)")
        print(f"")
        for line_num, macro, content in failures:
            print(f"  Line {line_num}: {macro}  →  {content}")
        print("")
        return False
    return True


def check_display_math_spacing(lines, filepath):
    """Check B: detect $$ display math not isolated by blank lines."""
    fails_before = []
    fails_after = []
    in_code = False
    in_math_block = False

    for i, l in enumerate(lines):
        stripped = l.strip()
        if stripped.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue

        if stripped == "$$":
            if not in_math_block:
                in_math_block = True
                if i > 0:
                    prev_line = lines[i-1].strip()
                    if prev_line != "" and not prev_line.startswith(">"):
                        fails_before.append((i+1, prev_line, stripped))
            else:
                in_math_block = False
                if i + 1 < len(lines):
                    nxt_line = lines[i+1].strip()
                    if nxt_line != "" and not nxt_line.startswith(">"):
                        fails_after.append((i+1, stripped, nxt_line))
            continue

        if "$$" in stripped:
            # Single line block or inline pseudo-block
            if stripped.startswith("$$") and i > 0:
                prev_line = lines[i-1].strip()
                if prev_line != "" and not prev_line.startswith(">"):
                    fails_before.append((i+1, prev_line, stripped[:120]))
            if stripped.endswith("$$") and i + 1 < len(lines):
                nxt_line = lines[i+1].strip()
                if nxt_line != "" and not nxt_line.startswith(">"):
                    fails_after.append((i+1, stripped[:120], nxt_line))

    if fails_before or fails_after:
        print("╔══════════════════════════════════════════════════════════════════╗")
        print("║  ❌ CHECK 21B: Display math ($$) missing surrounding blank lines ║")
        print("╚══════════════════════════════════════════════════════════════════╝")
        print(f"\n  File: {filepath}\n")
        print("  GitHub requires a blank line before and after $$ to render display")
        print("  math correctly. Without it, the equation runs into the text, and")
        print("  Markdown may strip underscores (`_`) resulting in MathJax crashes.\n")
        print("  HOW TO FIX:")
        print("    Ensure there is a blank empty line both above and below the $$ equation.\n")
        if fails_before:
            print("  --- MISSING BLANK LINE ABOVE ---")
            for line_num, prev, math in fails_before:
                print(f"  Line {line_num}: preceded by \"{prev}\"")
                print(f"           math: {math}\n")
        if fails_after:
            print("  --- MISSING BLANK LINE BELOW ---")
            for line_num, math, nxt in fails_after:
                print(f"  Line {line_num}: math: {math}")
                print(f"           followed by \"{nxt}\"\n")
        return False
    return True
