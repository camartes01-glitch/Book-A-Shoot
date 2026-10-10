import os

auth_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\auth_utils.py"
with open(auth_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines[:60]):
    print(f"{i+1}: {l}", end="")
