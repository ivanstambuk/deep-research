#!/usr/bin/env python3
"""Validate that EVERY sequenceDiagram block is followed by individually-collapsible
step-by-step walkthrough <details> blocks.

HARD RULE: Every sequenceDiagram in a DR document MUST have a walkthrough.

WHAT IS ENFORCED:
  1. Every sequenceDiagram must be followed by walkthrough steps within 30 lines
     (sub-headings ####/##### are allowed between the diagram and the steps).
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

# Pattern for the correct individual-step format on a single line
STEP_PATTERN = re.compile(
    r'^<details><summary><strong>(\d+)\.\s+(.+?)</strong></summary>$'
)

# Pattern for the correct individual-step format when <details> and <summary>
# are split across two lines.
STEP_SUMMARY_PATTERN = re.compile(
    r'^<summary><strong>(\d+)\.\s+(.+?)</strong></summary>$'
)

# Pattern for the WRONG format: a "Step-by-step walkthrough" wrapper
WALKTHROUGH_LABEL = re.compile(
    r'Step-by-step\s+walkthrough|Walkthrough\s+—',
    re.IGNORECASE
)

# Pattern for valid Mermaid sequence diagram messages that trigger autonumber
MERMAID_ARROW_PATTERN = re.compile(
    r'^\s*(?:[\w]+|"[^"]+")\s*(?:->>|-->>|->|-->|-x|--x|-\)|--\))\s*(?:[\w]+|"[^"]+")\s*:'
)


def parse_step_start(lines, idx):
    """Parse a walkthrough step start in either single-line or multi-line form.

    Returns dict(num, title, next_idx, summary_idx) or None.
    """
    line = lines[idx].strip()

    single_match = STEP_PATTERN.match(line)
    if single_match:
      return {
          'num': int(single_match.group(1)),
          'title': single_match.group(2),
          'next_idx': idx + 1,
          'summary_idx': idx,
      }

    if line == '<details>' and idx + 1 < len(lines):
        summary_line = lines[idx + 1].strip()
        summary_match = STEP_SUMMARY_PATTERN.match(summary_line)
        if summary_match:
            return {
                'num': int(summary_match.group(1)),
                'title': summary_match.group(2),
                'next_idx': idx + 2,
                'summary_idx': idx + 1,
            }

    return None


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
                    'start': mermaid_start + 1,  # 1-indexed (also 0-indexed body start)
                    'end': i + 1,                 # 1-indexed
                    'end_0': i,                   # 0-indexed
                })
            in_mermaid = False
        elif in_mermaid and 'sequenceDiagram' in stripped:
            has_sequence = True

    return diagrams


def count_diagram_steps(lines, diagram):
    """Count the number of valid sequence arrows inside the diagram for autonumbering."""
    step_count = 0
    autonumber_found = False
    
    # diagram['start'] is the 0-indexed index of the first body line
    start_idx = diagram['start']
    end_idx = diagram['end_0']
    
    for i in range(start_idx, end_idx):
        line = lines[i].strip()
        if line == 'autonumber':
            autonumber_found = True
        elif MERMAID_ARROW_PATTERN.match(line):
            step_count += 1
            
    return step_count if autonumber_found else 0


def check_walkthrough(lines, diagram):
    """Check the region after a diagram for correct walkthrough steps.

    Returns a list of error strings (empty = pass).
    """
    errors = []
    idx = diagram['end_0'] + 1  # First line after closing ```
    step_count = 0
    
    expected_steps = count_diagram_steps(lines, diagram)

    # ── Check 1: Look for wrapping containers ──────────────────────────
    scan_limit = min(idx + 30, len(lines))
    found_wrapper = False
    for scan_idx in range(idx, scan_limit):
        line = lines[scan_idx].strip()
        # Stop at chapter/group headings (## or ###) but allow sub-headings (####/#####)
        if (line.startswith('#') and not line.startswith('####')) or line.startswith('```'):
            break
        if WALKTHROUGH_LABEL.search(line):
            errors.append(
                f'L{scan_idx+1}: Found wrapping "Step-by-step walkthrough" label.\n'
                f'    → Remove the wrapper. Each step must be its own\n'
                f'    <details><summary><strong>N. Actor Title</strong></summary> block.'
            )
            found_wrapper = True
            break
        if line == '<details>' and scan_idx + 1 < len(lines):
            next_line = lines[scan_idx + 1].strip()
            if WALKTHROUGH_LABEL.search(next_line):
                errors.append(
                    f'L{scan_idx+2}: Found wrapping "Step-by-step walkthrough" label.\n'
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
        # Stop at chapter/group headings (## or ###) but allow sub-headings (####/#####)
        if (line.startswith('#') and not line.startswith('####')) or line.startswith('```'):
            break
        if parse_step_start(lines, scan_idx):
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
    last_details_end_idx = None

    while current_idx < len(lines):
        line = lines[current_idx].strip()

        if line == '':
            current_idx += 1
            continue

        step_match = parse_step_start(lines, current_idx)
        if not step_match:
            break

        step_num = step_match['num']
        step_count += 1

        # Check sequential numbering
        if step_num != expected_num:
            errors.append(
                f'L{current_idx+1}: Step numbering gap — expected step {expected_num}, '
                f'found step {step_num}.\n'
                f'    → Renumber steps sequentially starting from 1.'
            )

        # Check for empty body
        body_start = step_match['next_idx']
        body_lines = 0
        details_closed = False
        scan = body_start

        while scan < len(lines):
            scan_line = lines[scan].strip()
            if scan_line == '</details>':
                details_closed = True
                last_details_end_idx = scan
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

    # ── Check 4: Validate total step count matches diagram arrows ──────
    if expected_steps > 0 and step_count != expected_steps:
        errors.append(
            f'L{diagram["end"]}: Step count mismatch — sequence diagram generates {expected_steps} numbered steps, '
            f'but {step_count} walkthrough steps were found.\n'
            f'    → Ensure the walkthrough maps exactly 1:1 with the diagram\'s sequence arrows.'
        )

    # ── Check 5: Validate spacing after the final sequence step ────────
    if last_details_end_idx is not None:
        scan_after = last_details_end_idx + 1
        found_br = False
        violating_text_idx = None
        
        while scan_after < len(lines):
            nxt_line = lines[scan_after].strip()
            if nxt_line == '<br/>':
                found_br = True
                break
            elif nxt_line.startswith('#'):
                # Headings provide their own margins naturally
                break
            elif nxt_line != '':
                # Found freeform text!
                violating_text_idx = scan_after
                break
            scan_after += 1
            
        if violating_text_idx is not None and not found_br:
            errors.append(
                f'L{last_details_end_idx+1}: Missing <br/> padding after the final walkthrough step.\n'
                f'    → Markdown renderers often squish freeform text directly below <details> blocks.\n'
                f'    → Add a <br/> tag immediately before this text: "{lines[violating_text_idx].strip()[0:40]}..."'
            )

    # ── Check 6: Validate Markdown HTML Padding ────────────────────────
    if last_details_end_idx is not None and step_start_idx is not None:
        for scan_idx in range(step_start_idx, last_details_end_idx + 1):
            line = lines[scan_idx].strip()
            
            step_match = parse_step_start(lines, scan_idx)
            if step_match:
                summary_idx = step_match['summary_idx']
                if summary_idx + 1 < len(lines) and lines[summary_idx + 1].strip() != '':
                    errors.append(
                        f'L{summary_idx + 2}: Missing blank line after <summary> tag.\n'
                        f'    → Markdown block parsers (like code fences) will break inside HTML tags.\n'
                        f'    → Add an empty newline immediately after the <summary> line.'
                    )
            
            elif line == '</details>':
                if scan_idx - 1 >= 0 and lines[scan_idx - 1].strip() != '' and not STEP_PATTERN.match(lines[scan_idx - 1]):
                    errors.append(
                        f'L{scan_idx + 1}: Missing blank line before </details> tag.\n'
                        f'    → Markdown block parsers (like code fences) will break inside HTML tags.\n'
                        f'    → Add an empty newline immediately before the </details> line.'
                    )

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
