#!/usr/bin/env python3
"""Validate that EVERY sequenceDiagram block is followed by individually-collapsible
step-by-step walkthrough <details> blocks.

HARD RULE: Every sequenceDiagram in a DR document MUST have a walkthrough.

WHAT IS ENFORCED:
  1. Every sequenceDiagram must be followed by walkthrough steps within 30 lines.
  2. NO wrapping "Step-by-step walkthrough" containers — detected by a
     <details> block whose <summary> contains "Step-by-step" or "Walkthrough".
  3. Walkthrough steps must follow individual-step format:
     a) Sequential numbering starting from 1
     b) Each step as its own <details><summary><strong>N. Title</strong></summary>
     c) Each step must have at least 1 non-blank body line (no empty steps)
  4. A valid walkthrough must have at least 1 step.

WHAT THIS CATCHES:
  - Sequence diagrams with NO walkthrough at all
  - Wrapping containers: <details><summary><strong>Step-by-step walkthrough</strong>
  - Steps as numbered bullets inside a single container
  - Empty step bodies
  - Non-sequential numbering
"""
import sys
import re

# Pattern for the correct individual-step format
STEP_PATTERN = re.compile(
    r'^<details><summary><strong>(\d+)\.\s+(.+?)</strong></summary>$'
)

# Pattern for the WRONG format: a "Step-by-step walkthrough" wrapper
WALKTHROUGH_LABEL = re.compile(
    r'Step-by-step\s+walkthrough|Walkthrough\s+—',
    re.IGNORECASE
)


def find_sequence_diagrams(lines):
    """Find all sequenceDiagram blocks and their closing line numbers."""
    diagrams = []
    in_mermaid = False
    mermaid_start = -1
    has_sequence = False

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == '```mermaid':
            in_mermaid = True
            mermaid_start = i
            has_sequence = False
        elif in_mermaid and stripped == '```':
            if has_sequence:
                diagrams.append({
                    'start': mermaid_start + 1,  # 1-indexed
                    'end': i + 1,                 # 1-indexed
                    'end_0': i,                   # 0-indexed
                })
            in_mermaid = False
        elif in_mermaid and 'sequenceDiagram' in stripped:
            has_sequence = True

    return diagrams


def check_walkthrough(lines, diagram):
    """Check the region after a diagram for correct walkthrough steps.

    Returns a list of error strings (empty = pass).
    """
    errors = []
    idx = diagram['end_0'] + 1  # First line after closing ```
    step_count = 0

    # ── Check 1: Look for wrapping containers ──────────────────────────
    scan_limit = min(idx + 30, len(lines))
    found_wrapper = False
    for scan_idx in range(idx, scan_limit):
        line = lines[scan_idx].strip()
        if line.startswith('#') or line.startswith('```'):
            break
        if WALKTHROUGH_LABEL.search(line):
            errors.append(
                f'L{scan_idx+1}: Found wrapping "Step-by-step walkthrough" label.\n'
                f'    → Remove the wrapper. Each step must be its own\n'
                f'    <details><summary><strong>N. Actor Title</strong></summary> block.'
            )
            found_wrapper = True
            break

    if found_wrapper:
        return errors, 0

    # ── Check 2: Find walkthrough steps ────────────────────────────────
    step_start_idx = None
    for scan_idx in range(idx, scan_limit):
        line = lines[scan_idx].strip()
        if line.startswith('#') or line.startswith('```'):
            break
        if STEP_PATTERN.match(line):
            step_start_idx = scan_idx
            break

    if step_start_idx is None:
        errors.append(
            f'L{diagram["end"]}: No walkthrough steps found after this sequence diagram.\n'
            f'    → Add <details><summary><strong>1. Actor performs action</strong>\n'
            f'    </summary> blocks after the diagram\'s closing ```.'
        )
        return errors, 0

    # ── Check 3: Validate step format ──────────────────────────────────
    expected_num = 1
    current_idx = step_start_idx

    while current_idx < len(lines):
        line = lines[current_idx].strip()

        if line == '':
            current_idx += 1
            continue

        step_match = STEP_PATTERN.match(line)
        if not step_match:
            break

        step_num = int(step_match.group(1))
        step_count += 1

        # Check sequential numbering
        if step_num != expected_num:
            errors.append(
                f'L{current_idx+1}: Step numbering gap — expected step {expected_num}, '
                f'found step {step_num}.\n'
                f'    → Renumber steps sequentially starting from 1.'
            )

        # Check for empty body
        body_start = current_idx + 1
        body_lines = 0
        details_closed = False
        scan = body_start

        while scan < len(lines):
            scan_line = lines[scan].strip()
            if scan_line == '</details>':
                details_closed = True
                current_idx = scan + 1
                break
            if scan_line:
                body_lines += 1
            scan += 1

        if not details_closed:
            errors.append(
                f'L{body_start}: Unclosed <details> block for step {step_num}.\n'
                f'    → Add </details> after the step body.'
            )
            break

        if body_lines == 0:
            errors.append(
                f'L{current_idx}: Step {step_num} has an empty body.\n'
                f'    → Each step must contain substantive explanation with context,\n'
                f'    spec references, and payload examples where applicable.'
            )

        expected_num = step_num + 1

    return errors, step_count


def validate_file(filepath):
    """Validate all sequence diagrams in the given file have proper walkthroughs."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    lines = [line.rstrip('\n') for line in lines]
    diagrams = find_sequence_diagrams(lines)
    if not diagrams:
        return True

    all_errors = []

    for diagram in diagrams:
        errors, step_count = check_walkthrough(lines, diagram)

        if errors:
            all_errors.append({
                'diagram_line': diagram['start'],
                'diagram_end': diagram['end'],
                'errors': errors,
                'step_count': step_count,
            })

    if not all_errors:
        return True

    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  ❌ SEQUENCE DIAGRAM WALKTHROUGH FORMAT VIOLATION               ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print(f"\n  File: {filepath}\n")

    for err_group in all_errors:
        print(f"  ┌─ Diagram at lines {err_group['diagram_line']}–{err_group['diagram_end']}"
              f"  ({err_group['step_count']} step(s) found)")
        for error in err_group['errors']:
            for i, line in enumerate(error.split('\n')):
                prefix = '  │  ✗ ' if i == 0 else '  │    '
                print(f"{prefix}{line}")
        print("  └─\n")

    print("  HARD RULE: Every sequenceDiagram MUST have a walkthrough.\n")
    print("  CORRECT FORMAT (each step = its own <details> block):\n")
    print('    <details><summary><strong>1. Actor performs action</strong></summary>')
    print('    ')
    print('    Rich description with protocol payloads...')
    print('    ')
    print('    </details>')
    print('    <details><summary><strong>2. Another Actor does next</strong></summary>')
    print('    ...')
    print('    </details>\n')
    print("  WRONG FORMAT (wrapping container with bullets):\n")
    print('    <details>')
    print('    <summary><strong>Step-by-step walkthrough</strong></summary>')
    print('    ')
    print('    1. **Do something.** Brief text.')
    print('    2. **Do another thing.** Brief text.')
    print('    </details>\n')

    return False


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file.md>")
        sys.exit(1)

    ok = validate_file(sys.argv[1])
    sys.exit(0 if ok else 1)
