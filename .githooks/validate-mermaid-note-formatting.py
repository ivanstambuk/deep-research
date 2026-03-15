#!/usr/bin/env python3
import sys
import re

def validate_mermaid_note_formatting(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    mermaid_blocks = re.findall(r'```mermaid\n(.*?)\n```', content, re.DOTALL)
    
    has_error = False
    for block in mermaid_blocks:
        if 'sequenceDiagram' in block:
            lines = block.split('\n')
            for line_idx, line in enumerate(lines, 1):
                # Check for Note statements that have ** or <b> tags
                if re.match(r'\s*Note\s+.*:', line):
                    if '**' in line or '<b>' in line or '</b>' in line:
                        has_error = True
                        error_type = "BOLD"
                        break
                
                # Check for backticks anywhere in sequence diagram (excluding comments / frontmatter)
                if '`' in line and not line.strip().startswith('#') and not line.strip() == '---':
                    has_error = True
                    error_type = "BACKTICK"
                    break
        
        if has_error:
            break

    if has_error:
        print("╔══════════════════════════════════════════════════════════════════╗")
        print("║  ❌ MERMAID FORMATTING ERROR DETECTED                            ║")
        print("╚══════════════════════════════════════════════════════════════════╝")
        print(f"\nAffected file: {filepath}\n")
        
        if error_type == "BOLD":
            print("WHAT HAPPENED:")
            print("  You used Markdown bold (**text**) or HTML bold tags (<b>text</b>)")
            print("  inside a Mermaid sequence diagram Note block. Mermaid's sequence")
            print("  diagram parser natively ignores Markdown formatting and HTML tags")
            print("  rendering them as literal text instead of formatted bold text.\n")
            print("HOW TO FIX:")
            print("  Do NOT use bold tags (** or <b>) inside 'Note' statements.")
            print("  Remove them and use standard unformatted uppercase text for headers.\n")
        elif error_type == "BACKTICK":
            print("WHAT HAPPENED:")
            print("  You used Markdown backticks (`) inside a Mermaid sequence diagram.")
            print("  Mermaid's sequence parser treats backticks as literal text characters")
            print("  and completely fails to render them visually as code blocks.\n")
            print("HOW TO FIX:")
            print("  Remove all backticks (`) from the sequence diagram elements.")
            print("  Use standard unformatted text instead.\n")
        
        return False

    return True

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 validate-mermaid-note-formatting.py <file.md>")
        sys.exit(1)
        
    if not validate_mermaid_note_formatting(sys.argv[1]):
        sys.exit(1)
    
    sys.exit(0)
