#!/usr/bin/env python3
"""Validate that every `rect` block in a sequenceDiagram has a phantom spacer
Note (Braille Blank U+2800) before its closing `end` when the preceding line
is a content Note.

WHY THIS MATTERS:
  When the last element inside a `rect rgba(...)` block is a `Note right of ...`
  with real content, Mermaid renders it with no visual gap between the Note box
  and the rect's bottom border. This looks cramped and unprofessional. The fix
  is to insert a phantom spacer `Note right of <actor>: ⠀` (U+2800) between
  the content Note and the `end` keyword.

  This check enforces that pattern across all sequenceDiagram blocks.

EXAMPLE FIX:
  Before (bad):
      Note right of RP: Result details here
      end

  After (good):
      Note right of RP: Result details here
      Note right of RP: ⠀
      end
"""
import sys
import re

BRAILLE_BLANK = '\u2800'  # U+2800


def find_line_number(content: str, char_offset: int) -> int:
    """Return the 1-indexed line number for a character offset."""
    return content[:char_offset].count('\n') + 1


def check_rect_spacing(filepath: str) -> bool:
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

        block_start_offset = block_match.start()
        lines = block.split('\n')

        for j in range(1, len(lines)):
            stripped = lines[j].strip()
            if stripped != 'end':
                continue

            prev_line = lines[j - 1].strip()

            # Check if the previous line is a content Note (not a phantom spacer)
            if re.match(r'Note (right|left|over) of \w+:', prev_line) and BRAILLE_BLANK not in prev_line:
                # Calculate the file line number
                # Sum up character offsets to find the 'end' line
                char_offset = block_start_offset
                for k in range(j + 1):  # +1 because block starts after ```mermaid\n
                    char_offset += len(lines[k]) + 1  # +1 for newline
                file_line = find_line_number(content, char_offset)

                # Extract the actor from the Note to suggest the fix
                actor_match = re.match(r'Note (right|left|over) of (\w+):', prev_line)
                actor = actor_match.group(2) if actor_match else '<actor>'
                direction = actor_match.group(1) if actor_match else 'right'

                errors.append({
                    'line': file_line,
                    'note_text': prev_line[:80],
                    'actor': actor,
                    'direction': direction,
                })

    if not errors:
        return True

    # ── Error output ─────────────────────────────────────────────────
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  ❌ RECT BLOCK SPACING CHECK FAILED                           ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print(f"\nAffected file: {filepath}\n")
    print("WHY THIS MATTERS:")
    print("  When the last element inside a `rect` block is a content Note,")
    print("  Mermaid renders it with no gap between the Note and the rect's")
    print("  bottom border. A phantom spacer Note (U+2800) must be inserted")
    print("  between the content Note and the `end` keyword.\n")

    for err in errors:
        print(f"  ✗ Line {err['line']}: `end` immediately after content Note")
        print(f"    Note: {err['note_text']}")
        print(f"    FIX: Insert before `end`:")
        print(f"           Note {err['direction']} of {err['actor']}: ⠀")
        print(f"         (The character after the colon is U+2800 Braille Blank)")
        print()

    print(f"Total: {len(errors)} rect block(s) missing spacer Notes.\n")
    return False


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 validate-rect-spacing.py <file.md>")
        sys.exit(1)

    if not check_rect_spacing(sys.argv[1]):
        sys.exit(1)

    sys.exit(0)
