#!/usr/bin/env python3
import sys
import re

def validate_mermaid_responsive(filepath):
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
        # Check for useMaxWidth: false
        if re.search(r'useMaxWidth\s*:\s*false', block, re.IGNORECASE):
            has_error = True
            break

    if has_error:
        print("╔══════════════════════════════════════════════════════════════════╗")
        print("║  ❌ MERMAID RESPONSIVE CONFIG ERROR DETECTED                     ║")
        print("╚══════════════════════════════════════════════════════════════════╝")
        print(f"\nAffected file: {filepath}\n")
        print("WHAT HAPPENED:")
        print("  You used `useMaxWidth: false` inside a Mermaid diagram's config.")
        print("  This disables responsive scaling and forces the diagram to render")
        print("  at exact pixel widths, which leads to disproportionately horizontal")
        print("  diagrams that overflow containers and break layouts.\n")
        print("HOW TO FIX:")
        print("  1. Remove `useMaxWidth: false` from the YAML config block.")
        print("  2. Remove explicit `width` values from the sequence config if present.")
        print("  3. Rely on Mermaid's default responsive behavior to scale diagrams.")
        print("\nAll deep research sequence diagrams must support responsive widths.\n")
        return False

    return True

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 validate-mermaid-responsive.py <file.md>")
        sys.exit(1)
        
    if not validate_mermaid_responsive(sys.argv[1]):
        sys.exit(1)
    
    sys.exit(0)
