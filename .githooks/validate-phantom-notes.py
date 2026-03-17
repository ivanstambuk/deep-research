#!/usr/bin/env python3
"""Validate that every sequenceDiagram block has the three anti-cutoff measures:

1. actorMargin   — spreads actors apart so left-aligned text fits between them.
2. themeVariables — noteBkgColor + noteBorderColor set to "transparent" so the
                    phantom note is invisible.
3. phantom note  — a `Note right of <rightmost_actor>: ⠀` (Braille Blank U+2800)
                    anchored to the last participant, forcing the canvas to expand.

These are required because every sequence diagram uses `messageAlign: left`, which
causes Mermaid to miscalculate the SVG bounding box width on the right edge.
"""
import sys
import re

BRAILLE_BLANK = '\u2800'  # U+2800


def find_line_number(content: str, char_offset: int) -> int:
    """Return the 1-indexed line number for a character offset."""
    return content[:char_offset].count('\n') + 1


def check_sequence_diagrams(filepath: str) -> bool:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    mermaid_blocks = list(re.finditer(r'```mermaid\n(.*?)```', content, re.DOTALL))
    errors = []

    for block_match in mermaid_blocks:
        block = block_match.group(1)
        if 'sequenceDiagram' not in block:
            continue

        block_start_line = find_line_number(content, block_match.start())

        # Find all defined participants (rightmost = last declared)
        participants = re.findall(
            r'^\s*(?:participant|actor)\s+(\w+)(?:\s|$)', block, flags=re.MULTILINE
        )
        if not participants:
            continue

        rightmost_actor = participants[-1]
        block_errors = []

        # ── Check 1: actorMargin ─────────────────────────────────────
        if 'actorMargin' not in block:
            block_errors.append({
                'type': 'actorMargin',
                'msg': 'Missing `actorMargin` in sequence config.',
                'fix': (
                    f'Add `actorMargin: 120` (or higher) under the `sequence:` '
                    f'config key in the YAML frontmatter.'
                ),
            })

        # ── Check 2: themeVariables (transparent notes) ──────────────
        has_transparent_bkg = re.search(
            r'noteBkgColor\s*:\s*["\']?transparent["\']?', block
        )
        has_transparent_border = re.search(
            r'noteBorderColor\s*:\s*["\']?transparent["\']?', block
        )
        if not has_transparent_bkg or not has_transparent_border:
            missing = []
            if not has_transparent_bkg:
                missing.append('noteBkgColor: "transparent"')
            if not has_transparent_border:
                missing.append('noteBorderColor: "transparent"')
            block_errors.append({
                'type': 'themeVariables',
                'msg': f'Missing transparent note styling: {", ".join(missing)}',
                'fix': (
                    'Add the following under `config:` → `themeVariables:` in the '
                    'YAML frontmatter:\n'
                    '      themeVariables:\n'
                    '        noteBkgColor: "transparent"\n'
                    '        noteBorderColor: "transparent"'
                ),
            })

        # ── Check 3: phantom note on rightmost actor ─────────────────
        phantom_notes = list(re.finditer(
            r'Note right of (\w+):\s*' + BRAILLE_BLANK, block
        ))

        if not phantom_notes:
            block_errors.append({
                'type': 'phantom_note',
                'msg': 'Missing phantom note (Braille Blank U+2800) on rightmost actor.',
                'fix': (
                    f'Add this line before the closing ``` of the diagram:\n'
                    f'      Note right of {rightmost_actor}: ⠀\n'
                    f'  (The character after the colon is U+2800 Braille Blank)'
                ),
            })
        else:
            # Phantom note exists — verify it targets the rightmost actor
            for note_match in phantom_notes:
                actor_with_note = note_match.group(1)
                if actor_with_note != rightmost_actor:
                    block_errors.append({
                        'type': 'phantom_note_target',
                        'msg': (
                            f'Phantom note targets `{actor_with_note}` but the '
                            f'rightmost actor is `{rightmost_actor}`.'
                        ),
                        'fix': (
                            f'Change `Note right of {actor_with_note}: ⠀` to '
                            f'`Note right of {rightmost_actor}: ⠀`'
                        ),
                    })

        if block_errors:
            errors.append({
                'line': block_start_line,
                'rightmost': rightmost_actor,
                'actors': participants,
                'issues': block_errors,
            })

    if not errors:
        return True

    # ── Error output ─────────────────────────────────────────────────
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  ❌ SEQUENCE DIAGRAM ANTI-CUTOFF CHECKS FAILED                 ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print(f"\nAffected file: {filepath}\n")
    print("WHY THIS MATTERS:")
    print("  Every sequenceDiagram uses `messageAlign: left`, which causes")
    print("  Mermaid to miscalculate the SVG canvas width. Without these")
    print("  three safeguards, text on the right side gets cropped.\n")

    for err in errors:
        print(f"  ┌─ Diagram at line {err['line']}  "
              f"(actors: {' → '.join(err['actors'])})")
        for issue in err['issues']:
            print(f"  │  ✗ [{issue['type']}] {issue['msg']}")
            for fix_line in issue['fix'].split('\n'):
                print(f"  │    → {fix_line}")
        print("  └─")
        print()

    print("REQUIRED CONFIG TEMPLATE:")
    print("  ```mermaid")
    print("  ---")
    print("  config:")
    print("    themeVariables:")
    print('      noteBkgColor: "transparent"')
    print('      noteBorderColor: "transparent"')
    print("    sequence:")
    print("      messageAlign: left")
    print("      noteAlign: left")
    print("      actorMargin: 120")
    print("  ---")
    print("  sequenceDiagram")
    print("      participant A as ...")
    print("      participant B as ...")
    print("      ...")
    print(f"      Note right of B: ⠀")
    print("  ```")
    print()
    return False


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 validate-phantom-notes.py <file.md>")
        sys.exit(1)

    if not check_sequence_diagrams(sys.argv[1]):
        sys.exit(1)

    sys.exit(0)
