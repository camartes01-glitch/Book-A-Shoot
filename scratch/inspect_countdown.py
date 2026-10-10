import os

bk_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\frontend\app\(tabs)\bookings.tsx"
with open(bk_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(2590, min(len(lines), 2665)):
    print(f"{i+1}: {lines[i]}", end="")
