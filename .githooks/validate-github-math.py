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
    """Check B: detect $$ display math not preceded by a blank line."""
    failures = []
    in_mermaid = False
    in_code = False
    in_blockquote_math = False

    for i, line in enumerate(lines):
        stripped = line.strip()
        # Also handle blockquote-prefixed content
        content = stripped.lstrip('> ').strip() if stripped.startswith('>') else stripped

        # Track fenced code blocks
        if content.startswith('```'):
            if content.startswith('```mermaid'):
                in_mermaid = True
                continue
            if in_mermaid and content == '```':
                in_mermaid = False
                continue
            if not in_mermaid:
                in_code = not in_code
            continue

        if in_mermaid or in_code:
            continue

        # Check if this line starts with $$ (opening display math)
        if not content.startswith('$$'):
            continue

        # Skip if this is the very first line
        if i == 0:
            continue

        # Check previous line
        prev_stripped = lines[i - 1].strip()
        prev_content = prev_stripped.lstrip('> ').strip() if prev_stripped.startswith('>') else prev_stripped

        # OK if previous line is blank (or empty blockquote '>')
        if prev_content == '':
            continue

        # OK if previous line is also a $$ math line (consecutive equations)
        if prev_content.startswith('$$') and prev_content.endswith('$$'):
            continue

        failures.append((i + 1, prev_stripped[:60], content[:80]))

    if failures:
        print(f"╔══════════════════════════════════════════════════════════════════╗")
        print(f"║  ❌ CHECK 21B: Display math ($$) missing blank line above       ║")
        print(f"╚══════════════════════════════════════════════════════════════════╝")
        print(f"")
        print(f"  File: {filepath}")
        print(f"")
        print(f"  GitHub requires a blank line before $$ to render display math")
        print(f"  as a centered block. Without it, the equation renders inline")
        print(f"  (flowing with the preceding paragraph text).")
        print(f"")
        print(f"  HOW TO FIX:")
        print(f"    Add a blank line before the $$ opening delimiter.")
        print(f"")
        for line_num, prev, math in failures:
            print(f"  Line {line_num}: preceded by \"{prev}\"")
            print(f"           math: {math}")
            print()
        return False
    return True


def check_text_underscores(lines, filepath):
    """Check C: detect \\_ inside \\text{...} which breaks GitHub's MathJax."""
    failures = []
    in_mermaid = False
    in_code = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Track fenced code blocks
        if stripped.startswith('```'):
            if stripped.startswith('```mermaid'):
                in_mermaid = True
                continue
            if in_mermaid and stripped == '```':
                in_mermaid = False
                continue
            if not in_mermaid:
                in_code = not in_code
            continue

        if in_mermaid or in_code:
            continue

        match = TEXT_UNDERSCORE_RE.search(line)
        if match:
            failures.append((i + 1, match.group(), stripped[:120]))

    if failures:
        print(f"╔══════════════════════════════════════════════════════════════════╗")
        print(f"║  ❌ CHECK 21C: Escaped underscore (\\_) inside \\text{{...}}        ║")
        print(f"╚══════════════════════════════════════════════════════════════════╝")
        print(f"")
        print(f"  File: {filepath}")
        print(f"")
        print(f"  GitHub's Markdown renderer strips backslashes before MathJax runs.")
        print(f"  This turns \\text{{foo\\_bar}} into \\text{{foo_bar}}, which causes")
        print(f"  MathJax to crash with a \"'_' allowed only in math mode\" error.")
        print(f"")
        print(f"  HOW TO FIX:")
        print(f"    Replace the underscore with a space or hyphen.")
        print(f"    Example: \\text{{foo\\_bar}} → \\text{{foo bar}} or \\text{{foo-bar}}")
        print(f"")
        for line_num, macro, content in failures:
            print(f"  Line {line_num}: {macro}  →  {content}")
        print("")
        return False
    return True


def main():
    if len(sys.argv) < 2:
        sys.exit(0)

    filepath = sys.argv[1]
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    ok_a = check_blocked_macros(lines, filepath)
    ok_b = check_display_math_spacing(lines, filepath)
    ok_c = check_text_underscores(lines, filepath)

    if not (ok_a and ok_b and ok_c):
        sys.exit(1)


if __name__ == '__main__':
    main()
