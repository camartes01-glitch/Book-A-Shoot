import os
import re

bk_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend\app\(tabs)\bookings.tsx"

with open(bk_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "renderAcceptanceCountdown" in line or "diffSec" in line or "60 * 60000" in line or "response_timeout" in line:
        print(f"Line {i+1}: {line.strip()}")
