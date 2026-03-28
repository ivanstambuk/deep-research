#!/usr/bin/env python3
"""
Validates that <details> and </details> tags in markdown files are perfectly balanced.
This prevents structural nesting issues that break the Table of Contents rendering.
"""

import sys
import re

def main():
    if len(sys.argv) < 2:
        print("Usage: validate-details-blocks.py <file.md>")
        sys.exit(2)
        
    filename = sys.argv[1]
    
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    stack = []
    errors_found = False
    
    for i, line in enumerate(lines):
        line_num = i + 1
        
        # Count explicit <details> occurrences (allowing attributes like <details open>)
        opens = len(re.findall(r'<details\b[^>]*>', line))
        closes = len(re.findall(r'</details>', line))
        
        for _ in range(opens):
            stack.append(line_num)
            
        for _ in range(closes):
            if not stack:
                if not errors_found:
                    print("╔══════════════════════════════════════════════════════════════════╗")
                    print("║  ❌ UNBALANCED HTML TAG DETECTED: Orphaned </details>            ║")
                    print("╚══════════════════════════════════════════════════════════════════╝")
                    print(f"\n  File: {filename}")
                print(f"  Line {line_num}: Found a </details> closing tag without a matching opening <details>.")
                print(f"  Content: {line.strip()}\n")
                errors_found = True
            else:
                stack.pop()
                
    if stack:
        if not errors_found:
            print("╔══════════════════════════════════════════════════════════════════╗")
            print("║  ❌ UNBALANCED HTML TAG DETECTED: Unclosed <details>             ║")
            print("╚══════════════════════════════════════════════════════════════════╝")
            print(f"\n  File: {filename}")
            
        print(f"  Found {len(stack)} unclosed <details> tag(s) at the end of the document.")
        for line_num in stack[:5]:
            print(f"  - Tag opened at line {line_num} was never closed.")
            
        if len(stack) > 5:
            print(f"  - (...and {len(stack) - 5} more)")
            
        print("\n  This breaks VS Code Markdown Preview by swallowing all content after the open tag.")
        print("  HOW TO FIX: Add `</details>` to properly close the block opened at the lines above.\n")
        errors_found = True
        
    if errors_found:
        if not stack:
             print("  This breaks document rendering by prematurely closing preceding HTML blocks.")
             print("  HOW TO FIX: Remove the orphan </details> tag or add the missing opening `<details>`.\n")
        sys.exit(1)
        
    sys.exit(0)

if __name__ == '__main__':
    main()
