#!/usr/bin/env python3
import sys
import argparse
import re

def process_file(filepath, auto_fix=False):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    errors = []
    
    # 1. "(see §X.Y)" -> "(§X.Y)"
    p1 = re.compile(r'\(\s*[sS]ee\s+(§[0-9]+(?:\.[0-9]+)*)\s*\)')
    # 2. "(Section X.Y)" -> "(§X.Y)"
    p2 = re.compile(r'\(\s*[Ss]ection\s+([0-9]+(?:\.[0-9]+)*)\s*\)')
    # 3. " Section X.Y" -> " §X.Y"
    p3 = re.compile(r'(?<=\s)[Ss]ection\s+([0-9]+(?:\.[0-9]+)*)\b(?!\s*of\b)')
    # 4. " Chapter X.Y" -> " §X.Y"
    p4 = re.compile(r'(?<=\s)[Cc]hapter\s+([0-9]+(?:\.[0-9]+)*)\b(?!\s*of\b)')

    if auto_fix:
        final_lines = []
        for line in lines:
            line = p1.sub(r'(\1)', line)
            line = p2.sub(r'(§\1)', line)
            line = p3.sub(r'§\1', line)
            line = p4.sub(r'§\1', line)
            final_lines.append(line)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(final_lines)
        return True

    else:
        for i, line in enumerate(lines):
            # We don't want to be overly aggressive inside code blocks,
            # but since this regex is very specific regarding X.Y numericals,
            # it is generally safe across the document.
            
            m1 = p1.search(line)
            if m1:
                errors.append(f"{filepath}:{i+1}: Replace '(see {m1.group(1)})' with the standard '({m1.group(1)})'.")

            m2 = p2.search(line)
            if m2:
                errors.append(f"{filepath}:{i+1}: Replace '(Section {m2.group(1)})' with the standard '(§{m2.group(1)})'.")
                
            m3 = p3.search(line)
            if m3:
                errors.append(f"{filepath}:{i+1}: Use the section symbol '§{m3.group(1)}' instead of writing out 'Section {m3.group(1)}'.")
                
            m4 = p4.search(line)
            if m4:
                errors.append(f"{filepath}:{i+1}: Use the section symbol '§{m4.group(1)}' instead of writing out 'Chapter {m4.group(1)}'.")

        if errors:
            print("╔══════════════════════════════════════════════════════════════════╗")
            print("║  ❌ MARKDOWN CROSS-REFERENCE VALIDATION FAILED                   ║")
            print("╚══════════════════════════════════════════════════════════════════╝")
            print()
            for e in errors:
                print(f"  {e}")
            print()
            print("WHY THIS MATTERS:")
            print("  Deep Research documents use a strict typography standard for internal references.")
            print("  Words like 'Section' and 'Chapter' waste horizontal space and reduce scanability.")
            print("  - Use the section symbol (§) globally in paragraphs.")
            print("  - Keep parentheticals compact: use (§X) instead of (see §X) or (Section X).")
            print()
            print("HOW TO FIX:")
            print(f"  Run the auto-fix script:  python3 .githooks/validate-cross-references.py --auto-fix {filepath}")
            print()
            return False
        return True

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('files', nargs='+')
    parser.add_argument('--auto-fix', action='store_true')
    args = parser.parse_args()

    all_passed = True
    for filepath in args.files:
        if filepath.endswith('.md'):
            if not process_file(filepath, auto_fix=args.auto_fix):
                all_passed = False

    if not all_passed and not args.auto_fix:
        sys.exit(1)

if __name__ == '__main__':
    main()
