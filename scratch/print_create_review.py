import os

rev_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\routes_reviews.py"
with open(rev_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(107, min(len(lines), 235)):
    print(f"{i+1}: {lines[i]}", end="")
