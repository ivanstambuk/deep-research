with open('papers/DR-0001/DR-0001-mcp-authentication-authorization-agent-identity.md') as f:
    lines = f.readlines()
    
def print_block(start):
    print(f"--- Block at {start} ---")
    for i in range(start-1, start+7):
        print(f"{i+1}: {lines[i].rstrip()}")
        
print_block(6937)
print_block(7150)
print_block(7312)
print_block(9043)
