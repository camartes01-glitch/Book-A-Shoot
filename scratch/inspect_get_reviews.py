import os

rev_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\routes_reviews.py"
with open(rev_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "def get_reviews" in l:
        for j in range(i, min(len(lines), i + 45)):
            print(f"{j+1}: {lines[j]}", end="")
        break
