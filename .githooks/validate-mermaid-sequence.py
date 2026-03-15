#!/usr/bin/env python3
import sys
import re

def validate_mermaid_sequence(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    # Find all mermaid blocks
    mermaid_blocks = re.findall(r'```mermaid\n(.*?)\n```', content, re.DOTALL)
    
    has_error = False
    for block in mermaid_blocks:
        if 'sequenceDiagram' in block:
            entities = []
            if '&nbsp;' in block:
                entities.append('&nbsp;')
            if '&quot;' in block:
                entities.append('&quot;')
            if '&#8209;' in block:
                entities.append('&#8209;')
                
            if entities:
                has_error = True
                break

    if has_error:
        print("╔══════════════════════════════════════════════════════════════════╗")
        print("║  ❌ MERMAID SEQUENCE PARSE ERROR DETECTED                        ║")
        print("╚══════════════════════════════════════════════════════════════════╝")
        print(f"\nAffected file: {filepath}\n")
        print("WHAT HAPPENED:")
        print("  You used HTML entities (&nbsp;, &quot;, etc.) inside a Mermaid")
        print("  `sequenceDiagram` block. Mermaid's sequence parser treats the")
        print("  semicolon (;) at the end of HTML entities as a sequence statement")
        print("  delimiter, causing the CLI renderer to crash immediately.\n")
        print("HOW TO FIX:")
        print("  1. Do NOT use &nbsp; or &quot; in sequence diagrams.")
        print("  2. To indent text (like JSON payloads in notes):")
        print("     Use literal Unicode Non-Breaking Spaces (U+00A0).")
        print("     In Python: `print('\\u00A0' * 4 + '\"key\": \"value\"')`")
        print("     In VS Code: Copy this character inside the brackets: [ ] and paste it.")
        print("  3. To use quotes, just use literal double quotes (`\"`).\n")
        return False

    return True

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 validate-mermaid-sequence.py <file.md>")
        sys.exit(1)
        
    if not validate_mermaid_sequence(sys.argv[1]):
        sys.exit(1)
    
    sys.exit(0)
