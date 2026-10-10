import os

auth_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\auth_utils.py"
with open(auth_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "def require_auth" in l:
        for j in range(i, min(len(lines), i + 35)):
            print(f"{j+1}: {lines[j]}", end="")
        break
