import os

bk_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend\app\(tabs)\bookings.tsx"

with open(bk_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "renderAcceptanceCountdown" in line or "timeoutMins" in line or "response_timeout" in line:
        start = max(0, i - 5)
        end = min(len(lines), i + 25)
        print(f"--- Around line {i+1} ---")
        for j in range(start, end):
            print(f"{j+1}: {lines[j]}", end="")
        print("\n" + "="*50 + "\n")
        break
