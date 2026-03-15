#!/usr/bin/env python3
"""Pre-commit guardrail: reject light-only opaque colors in Mermaid diagrams.

Detects two classes of dark-theme-incompatible colors inside ```mermaid blocks:

1. rect rgb(...) phase blocks — must use rect rgba(...) with alpha ≈ 0.14
2. Opaque pastel fill: values — must use alpha-transparent hex (e.g. #2ecc7125)

This script only checks lines inside ```mermaid ... ``` fenced blocks.
"""

import re
import sys

# Opaque light pastel fills that render as blinding rectangles on dark backgrounds.
# Pattern: fill:#XXXXXX where the hex is a known light pastel.
OPAQUE_PASTELS = {
    "#d4edda", "#f8d7da", "#fff3cd", "#d6eaf8",  # semantic: green, red, yellow, blue
    "#e8f4f8", "#d5f5e3", "#fdebd0", "#fadbd8",  # ad-hoc: light blue, mint, peach, pink
    "#f4ecf7", "#fef9e7", "#fef3cd", "#cce5ff",  # ad-hoc: lavender, cream, light blue
    "#f9f9f9",                                      # near-white grey
}

# Pre-compile patterns
RECT_RGB_RE = re.compile(r"rect\s+rgb\(")
FILL_RE = re.compile(r"fill:(#[a-fA-F0-9]{6})\b")

def check_file(filepath: str) -> list[str]:
    """Check a single file for dark-theme-incompatible colors in mermaid blocks."""
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
                f"    Found: {stripped}\n"
                f"    Fix: replace rgb(R, G, B) with rgba(R, G, B, 0.14)\n"
                f"    Reference palette (AGENTS.md §7):\n"
                f"      Grey:   rect rgba(148, 163, 184, 0.14)\n"
                f"      Green:  rect rgba(46, 204, 113, 0.14)\n"
                f"      Yellow: rect rgba(241, 196, 15, 0.14)\n"
                f"      Red:    rect rgba(231, 76, 60, 0.14)\n"
                f"      Blue:   rect rgba(52, 152, 219, 0.14)"
            )

        # Check 2: opaque pastel fills
        for match in FILL_RE.finditer(line):
            hex_color = match.group(1).lower()
            if hex_color in OPAQUE_PASTELS:
                errors.append(
                    f"  {filepath}:{i}: opaque pastel fill '{hex_color}' is unreadable on dark theme.\n"
                    f"    Found: {stripped}\n"
                    f"    Fix: use alpha-transparent fill instead (append 20-30 hex alpha to base color).\n"
                    f"    Reference palette (AGENTS.md §5):\n"
                    f"      Green:   fill:#2ecc7125,stroke:#2ecc71\n"
                    f"      Blue:    fill:#3498db25,stroke:#3498db\n"
                    f"      Yellow:  fill:#f1c40f25,stroke:#f1c40f\n"
                    f"      Red:     fill:#e74c3c25,stroke:#e74c3c"
                )

    return errors


def main() -> int:
    import subprocess
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        capture_output=True, text=True
    )
    files = [f for f in result.stdout.strip().splitlines() if f.endswith(".md")]

    all_errors = []
    for filepath in files:
        all_errors.extend(check_file(filepath))

    if all_errors:
        print("❌ Dark-theme-incompatible colors detected in Mermaid diagrams:\n")
        print("\n\n".join(all_errors))
        print(
            "\n\nWhy: Opaque light pastels and rect rgb() render as blinding white\n"
            "rectangles on GitHub dark theme. Use alpha-transparent colors that\n"
            "adapt to both light and dark backgrounds.\n"
            "\nSee AGENTS.md rules §5 (Semantic Color System) and §7 (Phase Styling)."
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
