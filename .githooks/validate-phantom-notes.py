#!/usr/bin/env python3
"""Validate that every sequenceDiagram block has the three anti-cutoff measures:

1. actorMargin   — (>= 250) spreads actors apart so left-aligned text fits between them.
2. themeVariables — noteBkgColor + noteBorderColor set to "transparent" so the
                    phantom note is invisible.
3. phantom note  — a `Note right of <rightmost_actor>: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`
                    (Wide Braille Blank U+2800 * 20+) anchored to the last participant.
                    Crucially, it must be placed directly before the `end` keyword of EVERY
                    `rect` block to ensure both the SVG width AND the colored rect backgrounds
                    stretch far enough to prevent long right-aligned text from clipping.
"""
import sys
import re

BRAILLE_BLANK = '\u2800'  # U+2800

def find_line_number(content: str, char_offset: int) -> int:
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
        participants = re.findall(r'^\s*(?:participant|actor)\s+(\w+)(?:\s|$)', block, flags=re.MULTILINE)
        if not participants:
            continue

        rightmost_actor = participants[-1]
        block_errors = []

        # ── Check 1: actorMargin >= 250 ──────────────────────────────
        margin_match = re.search(r'actorMargin\s*:\s*(\d+)', block)
        if not margin_match or int(margin_match.group(1)) < 250:
            block_errors.append({
                'type': 'actorMargin',
                'msg': 'Missing or insufficient `actorMargin` (must be >= 250).',
                'fix': 'Add `actorMargin: 250` under the `sequence:` config key.'
            })

        # ── Check 2: themeVariables ──────────────────────────────────
        if not re.search(r'noteBkgColor\s*:\s*["\']?transparent["\']?', block) or \
           not re.search(r'noteBorderColor\s*:\s*["\']?transparent["\']?', block):
            block_errors.append({
                'type': 'themeVariables',
                'msg': 'Missing transparent note styling.',
                'fix': 'Add `noteBkgColor: "transparent"` and `noteBorderColor: "transparent"`.'
            })

        # ── Check 3: WIDE phantom note before every `end` ─────────────
        lines = block.split('\n')
        has_rects = False
        
        # Track block types using a stack to avoid demanding notes inside `box`
        block_stack = []
        
        for j, line in enumerate(lines):
            stripped = line.strip()
            
            # Identify block starts
            if stripped.startswith('rect '):
                has_rects = True
                block_stack.append('rect')
            elif stripped.startswith('box '):
                block_stack.append('box')
            elif stripped.startswith('opt '):
                block_stack.append('opt')
            elif stripped.startswith('alt '):
                block_stack.append('alt')
            elif stripped.startswith('loop '):
                block_stack.append('loop')
            elif stripped.startswith('par '):
                block_stack.append('par')
                
            if stripped == 'end':
                current_block = block_stack.pop() if block_stack else None
                
                # We only need wide phantom notes for logical sequence blocks.
                # Box blocks declare participants and cannot contain notes.
                if current_block != 'box':
                    prev_line = lines[j-1].strip() if j > 0 else ""
                    # Must be a wide phantom note on the rightmost actor
                    if not re.match(r'Note right of ' + rightmost_actor + r':\s*' + BRAILLE_BLANK + r'{15,}', prev_line):
                        block_errors.append({
                            'type': 'phantom_note_rect',
                            'msg': f'Missing WIDE phantom note before `end` at diagram line {j+1}.',
                            'fix': f'Insert `Note right of {rightmost_actor}: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`'
                        })
                    
        if not has_rects:
            # Check if there is at least one wide phantom note in the block
            if not re.search(r'Note right of ' + rightmost_actor + r':\s*' + BRAILLE_BLANK + r'{15,}', block):
                block_errors.append({
                        'type': 'phantom_note_diagram',
                        'msg': 'Missing WIDE phantom note in diagram.',
                        'fix': f'Insert `Note right of {rightmost_actor}: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀` before the end.'
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

    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  ❌ SEQUENCE DIAGRAM ANTI-CUTOFF CHECKS FAILED                 ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    for err in errors:
        print(f"  ┌─ Diagram at line {err['line']}  (rightmost: {err['rightmost']})")
        for issue in err['issues']:
            print(f"  │  ✗ [{issue['type']}] {issue['msg']}\n  │    → {issue['fix']}")
        print("  └─\n")
    return False

if __name__ == '__main__':
    if not check_sequence_diagrams(sys.argv[1]): sys.exit(1)
    sys.exit(0)
