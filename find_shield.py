import os
import re

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if Shield is used as an identifier (not in a word like ShieldCheck)
    if re.search(r'\bShield\b', content):
        # Now check if it's imported
        if not re.search(r'import\s+{[^}]*\bShield\b[^}]*', content):
            if not re.search(r'import\s+\bShield\b', content):
                print(f"MISSING IMPORT: {filepath}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.js') or file.endswith('.jsx'):
            check_file(os.path.join(root, file))
