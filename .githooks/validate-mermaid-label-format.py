#!/usr/bin/env python3
"""Block raw Markdown bold inside Mermaid node/subgraph labels.

Mermaid does not reliably interpret bare **bold** inside flowchart-style node
labels in this repository's render path. The result is literal asterisks in the
reader, for example "**Vaultless Tokenization**".

Safe alternatives:
- Use a Markdown string wrapper: ["`**Label**`"]
- Use HTML tags: ["<b>Label</b>"]
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


MERMAID_FENCE_RE = re.compile(r"^```mermaid\s*$")
FENCE_END_RE = re.compile(r"^```\s*$")
LABEL_RE = re.compile(r'[\[\{]\s*"(?P<label>[^"\n]*)"\s*[\]\}]')
HTML_BOLD_RE = re.compile(r"</?(?:b|strong)\b", re.IGNORECASE)


def find_failures(filepath: Path) -> list[tuple[int, str, str]]:
    lines = filepath.read_text(encoding="utf-8").splitlines()
    failures: list[tuple[int, str, str]] = []
    in_mermaid = False

    for line_number, line in enumerate(lines, 1):
        stripped = line.strip()

        if MERMAID_FENCE_RE.match(stripped):
            in_mermaid = True
            continue

        if in_mermaid and FENCE_END_RE.match(stripped):
            in_mermaid = False
            continue

        if not in_mermaid or stripped.startswith("%%"):
            continue

        for match in LABEL_RE.finditer(line):
            label = match.group("label")
            if "**" not in label:
                continue
            if "`" in label:
                continue
            if HTML_BOLD_RE.search(label):
                continue
            failures.append((line_number, label, stripped))

    return failures


def validate_file(filepath: Path) -> bool:
    try:
        failures = find_failures(filepath)
    except Exception as exc:
        print(f"Error reading {filepath}: {exc}")
        return False

    if not failures:
        return True

    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  ❌ RAW MARKDOWN BOLD IN MERMAID LABELS DETECTED                ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print(f"\nAffected file: {filepath}\n")
    print("WHAT HAPPENED:")
    print("  A Mermaid node or subgraph label contains raw Markdown bold")
    print("  syntax like **Label**. In this repository's reader render path,")
    print("  Mermaid does not reliably format that as bold text, so the")
    print("  asterisks render literally.\n")
    print("HOW TO FIX:")
    print("  Replace the raw bold label with one of these supported forms:")
    print('    ["`**Label**`"]')
    print('    ["<b>Label</b>"]')
    print("  Then re-run:")
    print(f"    python3 .githooks/validate-mermaid-label-format.py {filepath}\n")
    print("Detected label(s):")
    for line_number, label, stripped in failures:
        print(f"  Line {line_number}: {label}")
        print(f"    {stripped}")
    print("")
    return False


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage: python3 validate-mermaid-label-format.py <file.md> [more files...]")
        return 1

    ok = True
    for raw_path in argv[1:]:
        ok = validate_file(Path(raw_path)) and ok

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
