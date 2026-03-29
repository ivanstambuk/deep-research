#!/usr/bin/env python3
"""Validate that the Table of Contents contains all ## and ### headings,
and that they are properly formatted.

Rules:
- All `## ` headings must be in the ToC as top-level bullets (`- [Name](#anchor)`).
- All `### ` headings must be in the ToC as indented bullets (`  - [Name](#anchor)`).
"""

import re
import sys

def heading_to_anchor(text: str) -> str:
    # Same logic as validate-toc-links.py
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    text = re.sub(r'`(.*?)`', r'\1', text)
    text = text.lower()
    text = re.sub(r'[^a-z0-9 \-]', '', text)
    text = text.strip()
    text = re.sub(r' ', '-', text)
    return text

def validate_file(filepath: str) -> list[str]:
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find ToC region
    toc_start: int | None = None
    toc_end: int | None = None
    for i, line in enumerate(lines):
        if toc_start is None:
            if re.match(r'^#{1,3}\s+Table of Contents', line, re.IGNORECASE):
                toc_start = i + 1
        else:
            if re.match(r'^#{1,2}\s+', line):
                toc_end = i
                break

    if toc_start is None:
        return []

    if toc_end is None:
        toc_end = len(lines)

    toc_start_idx: int = int(toc_start)
    toc_end_idx: int = int(toc_end)

    # Scrape ToC anchors by expected indentation
    toc_h2_anchors: set[str] = set()
    toc_h2_texts: set[str] = set()
    toc_h3_anchors: set[str] = set()
    
    for i in range(int(toc_start_idx), int(toc_end_idx)):
        line = lines[i]
        
        # Match top-level bullet (## heading)
        m_h2 = re.match(r'^- \[([^\]]+)\]\(#([^)]+)\)', line)
        if m_h2:
            toc_h2_anchors.add(m_h2.group(2))
            continue
            
        m_h2_text = re.match(r'^- \*(.+)\*', line)
        if m_h2_text:
            toc_h2_texts.add(m_h2_text.group(1).lower().strip('* '))
            continue
            
        # Match indented bullet (### heading)
        m_h3_html = re.match(r'^  - <details><summary><a href="#([^"]+)">([^<]+)</a></summary>', line)
        m_h3_md = re.match(r'^  - \[([^\]]+)\]\(#([^)]+)\)', line)
        if m_h3_html:
            toc_h3_anchors.add(m_h3_html.group(1))
            continue
        elif m_h3_md:
            toc_h3_anchors.add(m_h3_md.group(2))
            continue

    errors: list[str] = []
    
    # Merge h2 and h3 ToC anchors for lookup — appendices use ## headings
    # but are listed as indented (h3-style) ToC bullets under a group heading.
    all_toc_anchors: set[str] = toc_h2_anchors | toc_h3_anchors

    # Scrape actual document headings (only after the ToC region)
    in_code_block = False
    for i in range(int(toc_end_idx), len(lines)):
        line = lines[i]

        # Track fenced code blocks — skip headings inside them
        if re.match(r'^```', line):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            continue

        m_h2 = re.match(r'^##\s+(.*)', line)
        if m_h2:
            text = m_h2.group(1).strip()
            
            # Skip headings that are conventionally excluded from the ToC
            if re.match(r'^(?:\d+\.\s*)?References', text, re.IGNORECASE):
                continue
            if re.match(r'Executive (?:Decision )?Summary', text, re.IGNORECASE):
                continue
            
            anchor = heading_to_anchor(text)
            
            # Remove any leading digits for loose match, e.g. "31. References" -> "references"
            clean_text = re.sub(r'^\d+\.\s*', '', text).lower()
            
            if anchor not in all_toc_anchors and clean_text not in toc_h2_texts:
                errors.append(f'  L{i+1}: Missing or incorrectly indented ToC entry for `## {text}`')
                
        m_h3 = re.match(r'^###\s+(.*)', line)
        if m_h3:
            text = m_h3.group(1).strip()
            # Only enforce ToC presence for numbered chapters, Appendices, and the 3 Synthesis chapters
            if re.match(r'^(?:[0-9]+\.|Appendix|Findings|Recommendations|Open Questions)', text, re.IGNORECASE):
                anchor = heading_to_anchor(text)
                if anchor not in toc_h3_anchors:
                    errors.append(f'  L{i+1}: Missing or incorrectly indented ToC entry for `### {text}`')

    return errors

def main() -> int:
    if len(sys.argv) < 2:
        print(f'Usage: {sys.argv[0]} <file.md> [<file2.md> ...]', file=sys.stderr)
        return 2

    total_errors = 0
    for filepath in sys.argv[1:]:
        errors = validate_file(filepath)
        if errors:
            print(f'\n╔══════════════════════════════════════════════════════════════════╗')
            print(f'║  ❌ TOC HIERARCHY MISMATCH                                       ║')
            print(f'╚══════════════════════════════════════════════════════════════════╝')
            print(f'\n{filepath}:')
            for e in errors:
                print(e)
            print('\nWHAT HAPPENED:')
            print('  The Table of Contents must exactly reflect the document heading hierarchy.')
            print('  Every `## ` heading must be a top-level ToC bullet `- [Name](#name)`.')
            print('  Every `### ` heading must be an indented ToC bullet `  - [Name](#name)`.')
            print('\nHOW TO FIX:')
            print('  1. Add the missing headings to the `## Table of Contents`.')
            print('  2. Ensure your indentation matches (0 spaces for ##, 2 spaces for ###).')
            total_errors += len(errors)

    if total_errors == 0:
        return 0

    return 1

if __name__ == '__main__':
    sys.exit(main())
