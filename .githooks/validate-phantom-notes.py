#!/usr/bin/env python3
import sys
import re

def check_phantom_notes(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    mermaid_blocks = re.finditer(r'```mermaid\n(.*?)```', content, re.DOTALL)
    
    has_error = False
    
    for block_match in mermaid_blocks:
        block = block_match.group(1)
        if 'sequenceDiagram' in block:
            
            # Find all defined participants
            participants = re.findall(r'^\s*(?:participant|actor)\s+(\w+)(?:\s|$)', block, flags=re.MULTILINE)
            
            if not participants:
                continue
                
            rightmost_actor = participants[-1]
            
            # Find all phantom notes in the block
            # Match "Note right of [any_actor]: ⠀"
            phantom_notes = re.finditer(r'Note right of (\w+):\s*⠀', block)
            
            for note_match in phantom_notes:
                actor_with_note = note_match.group(1)
                
                if actor_with_note != rightmost_actor:
                    has_error = True
                    break
        
        if has_error:
            break

    if has_error:
        print("╔══════════════════════════════════════════════════════════════════╗")
        print("║  ❌ MERMAID PHANTOM NOTE ALIGNMENT ERROR DETECTED                ║")
        print("╚══════════════════════════════════════════════════════════════════╝")
        print(f"\nAffected file: {filepath}\n")
        print("WHAT HAPPENED:")
        print("  You anchored the horizontal-expansion phantom note (`⠀`) to an")
        print("  inner actor instead of the rightmost actor in a sequence diagram.")
        print("  If the note is not attached to the rightmost track, the canvas")
        print("  will not expand correctly to prevent left-aligned text cutoff.")
        print("\nHOW TO FIX:")
        print("  1. Find the `sequenceDiagram` in the file throwing the error.")
        print(f"  2. Identify the LAST listed participant/actor at the top.")
        print("  3. Change `Note right of <WrongActor>: ⠀` to point to that last actor.")
        print("  4. Example: `Note right of " + rightmost_actor + ": ⠀`")
        print("")
        return False

    return True

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 validate-phantom-notes.py <file.md>")
        sys.exit(1)
        
    if not check_phantom_notes(sys.argv[1]):
        sys.exit(1)
    
    sys.exit(0)
