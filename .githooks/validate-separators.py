#!/usr/bin/env python3
import sys
import argparse

def process_file(filepath, auto_fix=False):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    errors = []
    
    if auto_fix:
        in_code = False
        in_front = (len(lines)>0 and lines[0].strip() == '---')
        front_cnt = 0
        cleaned = []
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('```'):
                in_code = not in_code
                cleaned.append(line)
                continue
            if in_front:
                if stripped == '---':
                    front_cnt += 1
                    if front_cnt == 2:
                        in_front = False
                cleaned.append(line)
                continue
                
            # Drop all loose dashes inside plain text
            if not in_code and stripped == '---':
                continue
            cleaned.append(line)
            
        final_lines = []
        for line in cleaned:
            if line.startswith('## ') or line.startswith('### '):
                # Ensure spacing
                while final_lines and not final_lines[-1].strip():
                    final_lines.pop()
                if final_lines:
                    final_lines.append('\n')
                final_lines.append('---\n')
                final_lines.append('\n')
            final_lines.append(line)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(final_lines)
        return True

    else:
        # Check Mode
        in_code = False
        in_front = (len(lines)>0 and lines[0].strip() == '---')
        front_cnt = 0
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('```'):
                in_code = not in_code
                continue
            if in_front:
                if stripped == '---':
                    front_cnt += 1
                    if front_cnt == 2:
                        in_front = False
                continue
                
            if not in_code:
                # 1. Check for illegal dashes
                if stripped == '---':
                    j = i + 1
                    while j < len(lines) and not lines[j].strip():
                        j += 1
                    if j < len(lines) and (lines[j].startswith('## ') or lines[j].startswith('### ')):
                        pass
                    else:
                        errors.append(f"{filepath}:{i+1}: Illegal '---' separator. Horizontal rules must ONLY precede ## or ### headings.")
                
                # 2. Check for missing dashes before ## and ###
                if line.startswith('## ') or line.startswith('### '):
                    j = i - 1
                    has_dash = False
                    while j >= 0 and not lines[j].strip():
                        j -= 1
                    if j >= 0 and lines[j].strip() == '---':
                        has_dash = True
                    if not has_dash:
                        errors.append(f"{filepath}:{i+1}: Missing '---' separator. A horizontal rule must precede all ## and ### headings.")

        if errors:
            print("╔══════════════════════════════════════════════════════════════════╗")
            print("║  ❌ MARKDOWN SEPARATOR VALIDATION FAILED                         ║")
            print("╚══════════════════════════════════════════════════════════════════╝")
            print()
            for e in errors:
                print(f"  {e}")
            print()
            print("WHY THIS MATTERS:")
            print("  To dramatically improve document readability, horizontal rules ('---')")
            print("  are strictly reserved for major topological transitions:")
            print("  - They MUST be placed directly above EVERY '## Group' and '### Chapter' heading.")
            print("  - They MUST NEVER be placed randomly in paragraphs or above '#### Section' headings.")
            print("  (Note: Front matter and Mermaid YAML boundaries are ignored)")
            print()
            print("HOW TO FIX:")
            print(f"  Run the auto-fix script:  python3 .githooks/validate-separators.py --auto-fix {filepath}")
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
