#!/usr/bin/env python3
"""Validate that Mermaid sequence diagrams do not disable mirrored actors.

Setting `mirrorActors: false` in a Mermaid sequence diagram config block
prevents the actor boxes from repeating at the bottom of the diagram. This
causes the actor lifelines to hang as bare lines at the bottom, making the
diagram look broken — especially in tall diagrams where the reader cannot
see the actor labels at the top without scrolling.

The default (`mirrorActors: true`) repeats the actor boxes at the bottom,
which is the standard convention for sequence diagrams and critical for
readability in documentation-grade DR papers.
"""

import sys
import re


def validate_mirror_actors(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    failures = []
    in_mermaid = False

    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith('```mermaid'):
            in_mermaid = True
            continue
        if in_mermaid and stripped == '```':
            in_mermaid = False
            continue

        if in_mermaid:
            if re.match(r'^\s*mirrorActors\s*:\s*false\s*$', line):
                failures.append((i, stripped))

    if failures:
        print("╔══════════════════════════════════════════════════════════════════╗")
        print("║  ❌ MERMAID mirrorActors: false DETECTED                        ║")
        print("╚══════════════════════════════════════════════════════════════════╝")
        print(f"\nAffected file: {filepath}\n")
        print("WHAT HAPPENED:")
        print("  A Mermaid sequence diagram has `mirrorActors: false` in its config.")
        print("  This prevents actor boxes from repeating at the bottom of the")
        print("  diagram, leaving the actor lifelines as bare hanging lines.")
        print("  In tall diagrams, the reader cannot identify which lifeline belongs")
        print("  to which actor without scrolling back to the top.\n")
        print("HOW TO FIX:")
        print("  Change `mirrorActors: false` to `mirrorActors: true`, or remove the")
        print("  line entirely (true is the default).\n")

        for line_num, content in failures:
            print(f"  {filepath}:{line_num}: {content}")
        print("")
        return False

    return True


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 validate-mirror-actors.py <file.md>")
        sys.exit(1)

    if not validate_mirror_actors(sys.argv[1]):
        sys.exit(1)

    sys.exit(0)
