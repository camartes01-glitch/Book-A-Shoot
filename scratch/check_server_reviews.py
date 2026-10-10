import os

server_path = r"C:\Users\keert\camartes\camartes-prelaunch-1\backend\server.py"
with open(server_path, "r", encoding="utf-8") as f:
    s_code = f.read()

print("reviews in server.py:", "reviews" in s_code)
for line in s_code.splitlines():
    if "reviews" in line.lower() or "router" in line.lower():
        if "include_router" in line:
            print("Router included:", line.strip())
