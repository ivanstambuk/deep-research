#!/usr/bin/env python3
import os
import sys
import re

def check_spacing(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Look for </details> followed closely by a blockquote WITHOUT <br/>
    # This regex catches: </details> followed by whitespaces/newlines (but no <br/>) and then >
    # We want to fail if </details>\n\n> is used instead of </details>\n<br/>\n\n>
    matches = list(re.finditer(r'</details>\s*\n> ', content))
    
    if matches:
        print(f"\n❌ Error in {filepath}:")
        print("Block quotes immediately following a <details> block must be separated by a <br/> tag.")
        print("Otherwise, Markdown renderers may squish the elements together without a visual new line.")
        for m in matches:
            line_no = content.count('\n', 0, m.start()) + 1
            print(f"  Line {line_no}: Found </details> followed directly by a blockquote (>).")
        
        print("\nHOW TO FIX:")
        print("  Add an explicit <br/> between the closing details tag and the blockquote.")
        print("  Example format:")
        print("    </details>")
        print("    <br/>")
        print("")
        print("    > **Blockquote content...**\n")
        return False
    return True

if __name__ == "__main__":
    files = sys.argv[1:]
    success = True
    for filepath in files:
        if filepath.endswith('.md'):
            if not check_spacing(filepath):
                success = False
    
    if not success:
        sys.exit(1)
    sys.exit(0)
