import os

for path in [r'c:\Users\keert\bookashoot\app\landing.tsx', r'c:\Users\keert\bookashoot\app\about.tsx']:
    with open(path, 'r', encoding='utf-8') as f:
        for i, l in enumerate(f):
            if any(k in l for k in ['STATS', '500+', '10K+', '99.4%']):
                safe_line = l.strip().encode('ascii', 'replace').decode('ascii')
                print(f"{os.path.basename(path)} : {i+1} : {safe_line}")
