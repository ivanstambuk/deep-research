#!/usr/bin/env python3
"""Check that </details> is not followed by a redundant <br/> if the next content is a heading.

Headings on GitHub already provide substantial top margin. Adding <br/> creates
excessive whitespace.
"""
import sys
import re

def validate_redundant_br(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    # Regex: find </details>\s*<br/>\s*#
    # Wait, the user was specific about: </details><br/> followed by a heading (with optional newlines)
    # The regex looks for </details> then optional space/newlines, then <br/>, then optional space/newlines, then a heading (#)
    pattern = re.compile(r'</details>\s*<br\s*/?>\s*\n+(#+\s+.*)', re.IGNORECASE)
    
    matches = list(pattern.finditer(content))
    if not matches:
        return True

    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  ❌ CHECK 22: Redundant <br/> before headings                     ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print(f"\n  File: {filepath}\n")
    print("  Markdown headings automatically provide top margins. Inserting a <br/>")
    print("  after </details> when a heading immediately follows creates excessive")
    print("  and redundant whitespace on GitHub.\n")
    print("  HOW TO FIX:")
    print("    Remove the <br/> tag so the heading naturally follows the details block.\n")

    for m in matches:
        # Calculate line number of the </details> tag
        preceding = content[:m.start()]
        line_num = preceding.count('\n') + 1
        heading = m.group(1).strip()
        print(f"  Line {line_num}: Found redundant <br/> before heading '{heading[:40]}...'")

    print("")
    return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file.md>")
        sys.exit(1)

    all_ok = True
    for f in sys.argv[1:]:
        if f.endswith('.md'):
            if not validate_redundant_br(f):
                all_ok = False

    sys.exit(0 if all_ok else 1)
