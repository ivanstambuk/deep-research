#!/usr/bin/env python3
"""Validate that Mermaid diagrams do not use inline KaTeX/LaTeX variables ($...$)."""

import sys

def main():
    if len(sys.argv) < 2:
        sys.exit(0)
    
    filepath = sys.argv[1]
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    failures = []
    in_mermaid = False
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('```mermaid'):
            in_mermaid = True
            continue
        if in_mermaid and stripped == '```':
            in_mermaid = False
            continue
            
        if in_mermaid:
            # Ban the '$' symbol entirely within Mermaid context to prevent KaTeX parser crashes
            if '$' in line:
                failures.append((i + 1, stripped))

    if failures:
        print(f"❌ ERROR: KaTeX math delimiters ($) detected inside Mermaid block in {filepath}")
        print("   Due to a persistent upstream bug in Mermaid's Markdown renderer on GitHub,")
        print("   using $ or $$ for math formulas inside diagrams causes parsing crashes ")
        print("   and aggressively strips native formatting (bolding, newlines).")
        print("   ")
        print("   HOW TO FIX:")
        print("   Replace all LaTeX formulas in Mermaid with Unicode and Markdown italics.")
        print("   - Instead of $m_1$, use *m₁*")
        print("   - Instead of $\\neq$, use ≠")
        print("   - Instead of $H(x)$, use *H(x)*\n")
        
        for line_num, content in failures:
            print(f"   Line {line_num}: {content}")
        print("")
        sys.exit(1)

if __name__ == '__main__':
    main()
