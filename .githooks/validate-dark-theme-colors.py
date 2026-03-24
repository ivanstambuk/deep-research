#!/usr/bin/env python3
"""Pre-commit guardrail: reject manual fill/stroke colors in Mermaid diagrams.

Detects explicit fill, stroke, and color styling overrides inside ```mermaid blocks.
Mermaid provides native CSS fallback for light/dark themes, so explicitly
defining 'style X fill:#XXX,stroke:#YYY' breaks cross-theme compatibility.

Allows:
- 'text-align', 'stroke-width', 'stroke-dasharray' (non-coloring structural styles)
- 'rect rgba(...)' blocks which are used for bounding box phase styling.
"""

import re
import sys

STYLE_GUIDE_RE = re.compile(r"^papers/DR-\d{4}/DR-\d{4}-style-guide\.md$")

# We capture any line that starts with 'style ' or 'classDef ' 
# and contains 'fill:', 'stroke:', or 'color:'
STYLE_DEF_RE = re.compile(r"^\s*(style|classDef)\s+.*?(fill:|stroke:|color:)")
# Still block `rect rgb()` without alpha
RECT_RGB_RE = re.compile(r"rect\s+rgb\(")


def check_file(filepath: str) -> list[str]:
    """Check a single file for manual color styles in mermaid blocks."""
    errors = []
    try:
        with open(filepath, encoding="utf-8") as f:
            lines = f.readlines()
    except (OSError, UnicodeDecodeError):
        return errors

    in_mermaid = False
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()

        if stripped == "```mermaid":
            in_mermaid = True
            continue
        if in_mermaid and stripped == "```":
            in_mermaid = False
            continue

        if not in_mermaid:
            continue

        # Check 1: rect rgb() without alpha
        if RECT_RGB_RE.search(line):
            errors.append(
                f"  {filepath}:{i}: rect rgb() is opaque — use rect rgba(..., 0.14) instead.\n"
                f"    Found: {stripped}"
            )

        # Check 2: manual fill, stroke, or color inside style/classDef
        if STYLE_DEF_RE.search(line):
            errors.append(
                f"  {filepath}:{i}: explicit coloring found in Mermaid style/classDef.\n"
                f"    Found: {stripped}\n"
                f"    Fix: Remove 'fill:', 'stroke:', and 'color:' parameters to rely on Mermaid's native dynamic theme CSS."
            )

    return errors


def main() -> int:
    import subprocess
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        capture_output=True, text=True
    )
    files = [
        f
        for f in result.stdout.strip().splitlines()
        if f.endswith(".md") and not STYLE_GUIDE_RE.match(f)
    ]

    all_errors = []
    for filepath in files:
        all_errors.extend(check_file(filepath))

    if all_errors:
        print("❌ Manual Mermaid colors detected:\n")
        print("\n\n".join(all_errors))
        print(
            "\n\nWhy: Manually hardcoding hex colors (fill, stroke, color) breaks dark/light theme switching on GitHub.\n"
            "By removing them entirely, Mermaid natively adjusts all nodes, backgrounds, and lines to look perfect on both."
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
