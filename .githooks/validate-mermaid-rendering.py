#!/usr/bin/env python3
import sys
import subprocess
import re
import os
import uuid

def check_mermaid_blocks(filepath):
    # Get staged diff for the file to find changed lines
    try:
        diff_output = subprocess.check_output(['git', 'diff', '--cached', '-U0', '--', filepath], text=True)
    except subprocess.CalledProcessError:
        return True # if error getting diff, skip
        
    changed_lines = set()
    for diff_line in diff_output.splitlines():
        if diff_line.startswith('@@'):
            m = re.search(r'\+([0-9]+)(?:,([0-9]+))?', diff_line)
            if m:
                start = int(m.group(1))
                length = int(m.group(2)) if m.group(2) is not None else 1
                if length == 0:
                    length = 1
                for i in range(start, start + length):
                    changed_lines.add(i)
                    
    if not changed_lines:
        return True
        
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    mermaid_blocks = []
    in_mermaid = False
    start_line = 0
    current_block = []

    for i, line in enumerate(lines, 1):
        if line.strip().startswith('```mermaid'):
            in_mermaid = True
            start_line = i
            current_block = [] 
        elif in_mermaid:
            if line.strip() == '```':
                in_mermaid = False
                mermaid_blocks.append({
                    'start': start_line, 
                    'end': i, 
                    'content': ''.join(current_block)
                })
            else:
                current_block.append(line)

    failed = False
    for block in mermaid_blocks:
        b_start = int(block['start'])
        b_end = int(block['end'])
        content = str(block['content'])
        if any(b_start <= l <= b_end for l in changed_lines):
            tmp_uuid = str(uuid.uuid4())
            mmd_filename = f"mermaid_{tmp_uuid}.mmd"
            png_filename = f"mermaid_{tmp_uuid}.png"
            mmd_filepath = os.path.join('/tmp', mmd_filename)
            png_filepath = os.path.join('/tmp', png_filename)
            
            with open(mmd_filepath, 'w', encoding='utf-8') as f:
                f.write(content)
                
            print(f"Validating modified Mermaid diagram (lines {block['start']}-{block['end']}) in {filepath}...")
            
            cmd = [
                'docker', 'run', '--rm', 
                '-v', '/tmp:/data', 
                'minlag/mermaid-cli', 
                '-i', f'/data/{mmd_filename}', 
                '-o', f'/data/{png_filename}'
            ]
            
            try:
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    print("╔══════════════════════════════════════════════════════════════════╗")
                    print("║  ❌ MERMAID DIAGRAM RENDERING ERROR                              ║")
                    print("╚══════════════════════════════════════════════════════════════════╝")
                    print(f"\nAffected file: {filepath} (Lines {block['start']}-{block['end']})\n")
                    print("WHAT HAPPENED:")
                    print("  A recently modified Mermaid diagram failed to compile/render via the")
                    print("  mermaid-cli docker container. It contains syntax errors and cannot")
                    print("  be generated properly.\n")
                    print("MERMAID-CLI OUTPUT:")
                    print(result.stderr.strip() or result.stdout.strip())
                    print("\nHOW TO FIX:")
                    print("  Review the Mermaid syntax in the highlighted lines and address the")
                    print("  parsing errors reported above before committing again.\n")
                    failed = True
            except Exception as e:
                print(f"Error running docker: {e}")
                failed = True
            finally:
                if os.path.exists(mmd_filepath):
                    os.remove(mmd_filepath)
                if os.path.exists(png_filepath):
                    try:
                        os.remove(png_filepath)
                    except PermissionError:
                        pass
                
    return not failed

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 validate-mermaid-rendering.py <file.md>")
        sys.exit(1)
        
    if not check_mermaid_blocks(sys.argv[1]):
        sys.exit(1)
        
    sys.exit(0)
